import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import type { StatsFilters, StatsRepository } from './statsRepository';

// Conditions SQL communes (alias : e = Entreprise, r = Remise)
function conditions({ siren, raisonSociale, dateDebut, dateFin }: StatsFilters) {
  const list = [
    Prisma.sql`r."dateTraitement" >= ${dateDebut}::date`,
    Prisma.sql`r."dateTraitement" <= ${dateFin}::date`,
  ];
  if (siren) {
    list.push(Prisma.sql`e.siren = ${siren}`);
  }
  if (raisonSociale) {
    list.push(Prisma.sql`e."raisonSociale" ILIKE ${`%${raisonSociale}%`}`);
  }
  return Prisma.join(list, ' AND ');
}

export const prismaStatsRepository: StatsRepository = {
  async evolution(filters) {
    // Format de la période : mois « AAAA-MM » ou jour « AAAA-MM-JJ »
    const format = filters.granularity === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
    const rows = await prisma.$queryRaw<
      {
        period: string;
        unpaidAmount: Prisma.Decimal | null;
        unpaidCount: number;
        revenue: Prisma.Decimal | null;
      }[]
    >`
      SELECT to_char(r."dateTraitement", ${format}) AS period,
             -SUM(CASE WHEN t.montant < 0 THEN t.montant ELSE 0 END) AS "unpaidAmount",
             COUNT(*) FILTER (WHERE t.montant < 0)::int AS "unpaidCount",
             SUM(CASE WHEN t.montant > 0 THEN t.montant ELSE 0 END) AS revenue
      FROM "Transaction" t
      JOIN "Remise" r ON r.id = t."remiseId"
      JOIN "Entreprise" e ON e.siren = r.siren
      WHERE ${conditions(filters)}
      GROUP BY period
      ORDER BY period
    `;
    return rows.map((row) => ({
      period: row.period,
      unpaidAmount: Number(row.unpaidAmount ?? 0),
      unpaidCount: row.unpaidCount,
      revenue: Number(row.revenue ?? 0),
    }));
  },

  async byMotif(filters) {
    const rows = await prisma.$queryRaw<
      { code: string; libelle: string; count: number; amount: Prisma.Decimal }[]
    >`
      SELECT m.code, m.libelle, COUNT(i.id)::int AS count, -SUM(t.montant) AS amount
      FROM "Impaye" i
      JOIN "MotifImpaye" m ON m.code = i."motifCode"
      JOIN "Transaction" t ON t.id = i."transactionId"
      JOIN "Remise" r ON r.id = t."remiseId"
      JOIN "Entreprise" e ON e.siren = r.siren
      WHERE ${conditions(filters)}
      GROUP BY m.code, m.libelle
      ORDER BY amount DESC
    `;
    return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
  },
};
