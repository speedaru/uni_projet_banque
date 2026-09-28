import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import type { UnpaidFilters, UnpaidRepository, UnpaidSort } from './unpaidRepository';

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const roundCents = (amount: number) => Math.round(amount * 100) / 100;

// Transactions impayées correspondant aux critères
function transactionWhere(filters: UnpaidFilters): Prisma.TransactionWhereInput {
  const { siren, raisonSociale, dateDebut, dateFin, numeroDossier, motifCode } = filters;
  return {
    impaye:
      numeroDossier || motifCode
        ? {
            is: {
              numeroDossier: numeroDossier
                ? { contains: numeroDossier, mode: 'insensitive' }
                : undefined,
              motifCode,
            },
          }
        : { isNot: null },
    remise: {
      siren,
      entreprise: raisonSociale
        ? { raisonSociale: { contains: raisonSociale, mode: 'insensitive' } }
        : undefined,
      dateTraitement:
        dateDebut || dateFin
          ? {
              gte: dateDebut ? new Date(dateDebut) : undefined,
              lte: dateFin ? new Date(dateFin) : undefined,
            }
          : undefined,
    },
  };
}

// Les montants des impayés sont négatifs : « du plus petit au plus gros » = montant décroissant
function orderBy({ key, order }: UnpaidSort): Prisma.TransactionOrderByWithRelationInput[] {
  if (key === 'montant') {
    return [{ montant: order === 'asc' ? 'desc' : 'asc' }, { id: 'asc' }];
  }
  return [{ remise: { dateTraitement: order } }, { dateVente: order }, { id: 'asc' }];
}

export const prismaUnpaidRepository: UnpaidRepository = {
  async search(filters, sort, { page, pageSize }) {
    const where = transactionWhere(filters);

    const [aggregate, transactions] = await Promise.all([
      prisma.transaction.aggregate({ where, _count: true, _sum: { montant: true } }),
      prisma.transaction.findMany({
        where,
        include: {
          impaye: { include: { motif: true } },
          remise: { include: { entreprise: true } },
        },
        orderBy: orderBy(sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      total: aggregate._count,
      totalAmount: roundCents(Number(aggregate._sum.montant ?? 0)),
      rows: transactions.map((transaction) => ({
        siren: transaction.remise.siren,
        raisonSociale: transaction.remise.entreprise.raisonSociale,
        dateVente: isoDate(transaction.dateVente),
        dateRemise: isoDate(transaction.remise.dateTraitement),
        numeroCarte: transaction.numeroCarte,
        reseau: transaction.reseau,
        numeroDossier: transaction.impaye!.numeroDossier,
        devise: transaction.devise,
        montant: Number(transaction.montant),
        motifCode: transaction.impaye!.motifCode,
        libelle: transaction.impaye!.motif.libelle,
      })),
    };
  },

  async summaryBySiren({ siren, raisonSociale, dateDebut, dateFin, numeroDossier, motifCode }) {
    const conditions = [Prisma.sql`TRUE`];
    if (siren) {
      conditions.push(Prisma.sql`e.siren = ${siren}`);
    }
    if (raisonSociale) {
      conditions.push(Prisma.sql`e."raisonSociale" ILIKE ${`%${raisonSociale}%`}`);
    }
    if (dateDebut) {
      conditions.push(Prisma.sql`r."dateTraitement" >= ${dateDebut}::date`);
    }
    if (dateFin) {
      conditions.push(Prisma.sql`r."dateTraitement" <= ${dateFin}::date`);
    }
    if (numeroDossier) {
      conditions.push(Prisma.sql`i."numeroDossier" ILIKE ${`%${numeroDossier}%`}`);
    }
    if (motifCode) {
      conditions.push(Prisma.sql`i."motifCode" = ${motifCode}`);
    }

    const rows = await prisma.$queryRaw<
      { siren: string; raisonSociale: string; count: number; totalAmount: Prisma.Decimal }[]
    >`
      SELECT e.siren, e."raisonSociale", COUNT(i.id)::int AS count, SUM(t.montant) AS "totalAmount"
      FROM "Impaye" i
      JOIN "Transaction" t ON t.id = i."transactionId"
      JOIN "Remise" r ON r.id = t."remiseId"
      JOIN "Entreprise" e ON e.siren = r.siren
      WHERE ${Prisma.join(conditions, ' AND ')}
      GROUP BY e.siren, e."raisonSociale"
      ORDER BY e.siren
    `;

    return rows.map((row) => ({ ...row, totalAmount: Number(row.totalAmount) }));
  },
};
