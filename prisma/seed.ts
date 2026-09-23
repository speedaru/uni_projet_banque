// Données de démonstration pour le développement local : `npm run prisma:seed`
// Crée (ou remet à jour) un compte par profil et régénère les données monétiques
// (remises, transactions, impayés). Ne jamais utiliser ces données en production.
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

// Taux d'impayés par entreprise : certaines ont volontairement beaucoup d'impayés
// pour faire apparaître des soldes négatifs (en rouge) dans les écrans.
const entreprises = [
  { siren: '123456789', raisonSociale: 'Boutique Démo', unpaidRate: 0.05 },
  { siren: '456278556', raisonSociale: 'Dupont SARL', unpaidRate: 0.04 },
  { siren: '732829320', raisonSociale: 'Boulangerie Martin', unpaidRate: 0.02 },
  { siren: '552100554', raisonSociale: 'Garage Leroy', unpaidRate: 0.3 },
  { siren: '841256987', raisonSociale: 'Fleurs & Co', unpaidRate: 0.08 },
  { siren: '390114752', raisonSociale: 'TechStore Paris', unpaidRate: 0.12 },
];

const motifs = [
  { code: '01', libelle: 'fraude à la carte' },
  { code: '02', libelle: 'compte à découvert' },
  { code: '03', libelle: 'compte clôturé' },
  { code: '04', libelle: 'compte bloqué' },
  { code: '05', libelle: 'provision insuffisante' },
  { code: '06', libelle: 'opération contestée par le débiteur' },
  { code: '07', libelle: 'titulaire décédé' },
  { code: '08', libelle: 'raison non communiquée, contactez la banque du client' },
];

const reseaux = ['CB', 'CB', 'CB', 'VS', 'VS', 'MC', 'MC', 'AE'];

// Générateur pseudo-aléatoire à graine fixe : les mêmes données à chaque seed
function createRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = createRandom(2026);
const randomInt = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const pick = <T>(items: T[]) => items[randomInt(0, items.length - 1)];

// Numéro de carte masqué au format de la spécification : 12345*******5896
function maskedCardNumber() {
  const digits = (count: number) => Array.from({ length: count }, () => randomInt(0, 9)).join('');
  return `${randomInt(4, 5)}${digits(4)}*******${digits(4)}`;
}

// Jours ouvrés entre deux dates (inclus)
function businessDays(from: Date, to: Date) {
  const days: Date[] = [];
  for (const day = new Date(from); day <= to; day.setUTCDate(day.getUTCDate() + 1)) {
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) {
      days.push(new Date(day));
    }
  }
  return days;
}

async function seedAccounts() {
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
}

async function seedBusinessData() {
  // On repart de zéro à chaque seed (les comptes utilisateurs sont conservés)
  await prisma.impaye.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.remise.deleteMany();

  for (const motif of motifs) {
    await prisma.motifImpaye.upsert({ where: { code: motif.code }, update: motif, create: motif });
  }

  let remiseCounter = 1;
  let authorizationCounter = 100000;
  let dossierCounter = 1;
  let transactionCount = 0;
  let unpaidCount = 0;

  const days = businessDays(new Date('2026-06-01'), new Date('2026-09-22'));

  for (const entreprise of entreprises) {
    for (const day of days) {
      // Environ 2 remises par semaine et par entreprise
      if (random() > 0.4) {
        continue;
      }

      const transactions = Array.from({ length: randomInt(3, 15) }, () => {
        const isUnpaid = random() < entreprise.unpaidRate;
        const amount = randomInt(500, 40000) / 100;
        const saleDate = new Date(day);
        saleDate.setUTCDate(saleDate.getUTCDate() - randomInt(0, 2));
        saleDate.setUTCHours(randomInt(8, 19), randomInt(0, 59), randomInt(0, 59));

        return {
          dateVente: saleDate,
          numeroCarte: maskedCardNumber(),
          reseau: pick(reseaux),
          numeroAutorisation: String(authorizationCounter++),
          montant: isUnpaid ? -amount : amount,
          impaye: isUnpaid
            ? {
                create: {
                  numeroDossier: `D${String(dossierCounter++).padStart(4, '0')}`,
                  motifCode: pick(motifs).code,
                },
              }
            : undefined,
        };
      });

      await prisma.remise.create({
        data: {
          numero: `R${String(remiseCounter++).padStart(6, '0')}`,
          siren: entreprise.siren,
          dateTraitement: day,
          transactions: { create: transactions },
        },
      });

      transactionCount += transactions.length;
      unpaidCount += transactions.filter((transaction) => transaction.impaye).length;
    }
  }

  console.log(
    `Données monétiques : ${remiseCounter - 1} remises, ${transactionCount} transactions, ${unpaidCount} impayés`,
  );
}

async function main() {
  for (const { siren, raisonSociale } of entreprises) {
    await prisma.entreprise.upsert({
      where: { siren },
      update: { raisonSociale },
      create: { siren, raisonSociale },
    });
  }

  await seedAccounts();
  await seedBusinessData();

  console.log('Comptes de démonstration : admin/admin123, po/po123, client/client123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
