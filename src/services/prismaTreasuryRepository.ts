import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import type { TreasuryRepository } from './treasuryRepository';

export const prismaTreasuryRepository: TreasuryRepository = {
  async findAnnouncements({ siren, raisonSociale, dateValeur }) {
    const conditions = [Prisma.sql`TRUE`];
    if (siren) {
      conditions.push(Prisma.sql`e.siren = ${siren}`);
    }
    if (raisonSociale) {
      conditions.push(Prisma.sql`e."raisonSociale" ILIKE ${`%${raisonSociale}%`}`);
    }
    if (dateValeur) {
      conditions.push(Prisma.sql`r."dateTraitement" = ${dateValeur}::date`);
    }

    // Cumul par entreprise des transactions de ses remises (impayés inclus, montants négatifs)
    const rows = await prisma.$queryRaw<
      {
        siren: string;
        raisonSociale: string;
        devise: string;
        transactionCount: number;
        totalAmount: Prisma.Decimal;
      }[]
    >`
      SELECT e.siren, e."raisonSociale", r.devise,
             COUNT(t.id)::int AS "transactionCount",
             SUM(t.montant) AS "totalAmount"
      FROM "Entreprise" e
      JOIN "Remise" r ON r.siren = e.siren
      JOIN "Transaction" t ON t."remiseId" = r.id
      WHERE ${Prisma.join(conditions, ' AND ')}
      GROUP BY e.siren, e."raisonSociale", r.devise
    `;

    return rows.map((row) => ({ ...row, totalAmount: Number(row.totalAmount) }));
  },
};
