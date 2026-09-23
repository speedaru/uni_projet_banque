// Données de démonstration pour le développement local : `npm run prisma:seed`
// Crée (ou remet à jour) un compte par profil. Ne jamais utiliser ces comptes en production.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const demoAccounts = [
  { login: 'admin', password: 'admin123', role: 'admin' as const },
  { login: 'po', password: 'po123', role: 'po' as const },
  { login: 'client', password: 'client123', role: 'client' as const, siren: '123456789' },
];

async function main() {
  await prisma.entreprise.upsert({
    where: { siren: '123456789' },
    update: {},
    create: { siren: '123456789', raisonSociale: 'Boutique Démo' },
  });

  for (const account of demoAccounts) {
    const passwordHash = await bcrypt.hash(account.password, 10);
    await prisma.utilisateur.upsert({
      where: { login: account.login },
      update: { passwordHash, role: account.role, siren: account.siren ?? null },
      create: {
        login: account.login,
        passwordHash,
        role: account.role,
        siren: account.siren ?? null,
      },
    });
  }

  console.log('Comptes de démonstration : admin/admin123, po/po123, client/client123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
