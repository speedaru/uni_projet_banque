import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import type { RemiseRepository, RemiseRow } from './remiseRepository';

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const roundCents = (amount: number) => Math.round(amount * 100) / 100;

// Remise chargée avec son entreprise et ses transactions
const remiseInclude = {
  entreprise: true,
  transactions: { orderBy: { dateVente: 'asc' } },
} satisfies Prisma.RemiseInclude;

type RemiseWithDetails = Prisma.RemiseGetPayload<{ include: typeof remiseInclude }>;

function toRemiseRow(remise: RemiseWithDetails): RemiseRow {
  const transactions = remise.transactions.map((transaction) => ({
    siren: remise.siren,
    dateVente: isoDate(transaction.dateVente),
    numeroCarte: transaction.numeroCarte,
    reseau: transaction.reseau,
    numeroAutorisation: transaction.numeroAutorisation,
    devise: transaction.devise,
    montant: Number(transaction.montant),
  }));
  return {
    numero: remise.numero,
    siren: remise.siren,
    raisonSociale: remise.entreprise.raisonSociale,
    dateTraitement: isoDate(remise.dateTraitement),
    devise: remise.devise,
    transactionCount: transactions.length,
    totalAmount: roundCents(transactions.reduce((sum, t) => sum + t.montant, 0)),
    transactions,
  };
}

export const prismaRemiseRepository: RemiseRepository = {
  async search({ siren, raisonSociale, dateDebut, dateFin, numero }, { page, pageSize }) {
    const where: Prisma.RemiseWhereInput = {
      siren,
      numero: numero ? { contains: numero, mode: 'insensitive' } : undefined,
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
    };

    const [total, remises] = await Promise.all([
      prisma.remise.count({ where }),
      prisma.remise.findMany({
        where,
        include: remiseInclude,
        orderBy: [{ dateTraitement: 'desc' }, { numero: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, rows: remises.map(toRemiseRow) };
  },

  async findByNumero(numero) {
    const remise = await prisma.remise.findUnique({ where: { numero }, include: remiseInclude });
    return remise ? toRemiseRow(remise) : null;
  },
};
