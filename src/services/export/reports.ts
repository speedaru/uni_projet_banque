import { formatIsoDate } from '../../lib/format';
import type { RemiseFilters, RemiseRow } from '../remiseRepository';
import type { TreasuryFilters, TreasuryRow } from '../treasuryRepository';
import type { UnpaidFilters, UnpaidRow } from '../unpaidRepository';
import { sumTreasury } from '../treasuryService';
import { extractionLabel, fileDate, formatSiren, Report, reportTitle } from './report';

// Construction des rapports exportables à partir des données affichées à l'écran

const sens = (amount: number) => (amount < 0 ? '-' : '+');

// « DE L'ENTREPRISE DUPONT SARL N° SIREN 456 278 556 » quand une seule entreprise est concernée
function companySubject(
  siren: string | undefined,
  raisonSociale: string | undefined,
  allLabel: string,
): string {
  if (siren) {
    return `de l'entreprise ${raisonSociale ?? ''} N° SIREN ${formatSiren(siren)}`.replace(
      '  ',
      ' ',
    );
  }
  return allLabel;
}

export function treasuryReport(filters: TreasuryFilters, rows: TreasuryRow[], now = new Date()) {
  const subject = companySubject(
    filters.siren,
    rows[0]?.raisonSociale,
    filters.raisonSociale
      ? `des comptes clients « ${filters.raisonSociale} »`
      : 'de tous les comptes clients',
  );
  const period = filters.dateValeur ? `du ${formatIsoDate(filters.dateValeur)}` : '— solde global';
  const totals = sumTreasury(rows);

  const report: Report = {
    fileName: `tresorerie_${fileDate(now)}`,
    title: reportTitle(`Annonces de trésorerie ${subject} ${period}`),
    extractedAt: extractionLabel(now),
    columns: [
      { label: 'N° SIREN' },
      { label: 'Raison sociale' },
      { label: 'Nombre transactions', type: 'integer' },
      { label: 'Devise' },
      { label: 'Montant total', type: 'amount' },
    ],
    rows: rows.map((row) => [
      row.siren,
      row.raisonSociale,
      row.transactionCount,
      row.devise,
      row.totalAmount,
    ]),
    totals:
      rows.length > 1
        ? ['Total', '', totals.transactionCount, 'EUR', totals.totalAmount]
        : undefined,
  };
  return report;
}

function periodLabel({ dateDebut, dateFin }: { dateDebut?: string; dateFin?: string }): string {
  if (dateDebut && dateFin) {
    return ` du ${formatIsoDate(dateDebut)} au ${formatIsoDate(dateFin)}`;
  }
  if (dateDebut) {
    return ` à partir du ${formatIsoDate(dateDebut)}`;
  }
  if (dateFin) {
    return ` jusqu'au ${formatIsoDate(dateFin)}`;
  }
  return '';
}

export function remisesReport(filters: RemiseFilters, rows: RemiseRow[], now = new Date()) {
  const subject = companySubject(
    filters.siren,
    rows[0]?.raisonSociale,
    filters.raisonSociale
      ? `des entreprises « ${filters.raisonSociale} »`
      : 'de toutes les entreprises',
  );
  const numero = filters.numero ? ` (N° remise : ${filters.numero})` : '';

  const report: Report = {
    fileName: `remises_${fileDate(now)}`,
    title: reportTitle(`Liste des remises ${subject}${periodLabel(filters)}${numero}`),
    extractedAt: extractionLabel(now),
    columns: [
      { label: 'N° SIREN' },
      { label: 'Raison sociale' },
      { label: 'N° remise' },
      { label: 'Date traitement' },
      { label: 'Nbre transactions', type: 'integer' },
      { label: 'Devise' },
      { label: 'Montant total', type: 'amount' },
      { label: 'Sens' },
    ],
    rows: rows.map((row) => [
      row.siren,
      row.raisonSociale,
      row.numero,
      formatIsoDate(row.dateTraitement),
      row.transactionCount,
      row.devise,
      row.totalAmount,
      sens(row.totalAmount),
    ]),
  };
  return report;
}

export function unpaidReport(
  filters: UnpaidFilters,
  rows: UnpaidRow[],
  totalAmount: number,
  now = new Date(),
) {
  const subject = companySubject(
    filters.siren,
    rows[0]?.raisonSociale,
    filters.raisonSociale
      ? `des entreprises « ${filters.raisonSociale} »`
      : 'de toutes les entreprises',
  );
  const dossier = filters.numeroDossier ? ` (N° dossier : ${filters.numeroDossier})` : '';

  const report: Report = {
    fileName: `impayes_${fileDate(now)}`,
    title: reportTitle(`Liste des impayés ${subject}${periodLabel(filters)}${dossier}`),
    extractedAt: extractionLabel(now),
    columns: [
      { label: 'N° SIREN' },
      { label: 'Date vente' },
      { label: 'Date remise' },
      { label: 'N° carte' },
      { label: 'Réseau' },
      { label: 'N° dossier impayé' },
      { label: 'Devise' },
      { label: 'Montant', type: 'amount' },
      { label: 'Libellé impayé' },
    ],
    rows: rows.map((row) => [
      row.siren,
      formatIsoDate(row.dateVente),
      formatIsoDate(row.dateRemise),
      row.numeroCarte,
      row.reseau,
      row.numeroDossier,
      row.devise,
      row.montant,
      row.libelle,
    ]),
    totals: ['Total', '', '', '', '', '', 'EUR', totalAmount, `${rows.length} impayé(s)`],
  };
  return report;
}

export function remiseDetailReport(remise: RemiseRow, now = new Date()) {
  const report: Report = {
    fileName: `remise_${remise.numero}_${fileDate(now)}`,
    title: reportTitle(
      `Détail des transactions de la remise ${remise.numero} de l'entreprise ${remise.raisonSociale} N° SIREN ${formatSiren(remise.siren)}`,
    ),
    extractedAt: extractionLabel(now),
    columns: [
      { label: 'N° SIREN' },
      { label: 'Date vente' },
      { label: 'N° carte' },
      { label: 'Réseau' },
      { label: 'N° autorisation' },
      { label: 'Devise' },
      { label: 'Montant', type: 'amount' },
      { label: 'Sens' },
    ],
    rows: remise.transactions.map((transaction) => [
      transaction.siren,
      formatIsoDate(transaction.dateVente),
      transaction.numeroCarte,
      transaction.reseau,
      transaction.numeroAutorisation,
      transaction.devise,
      transaction.montant,
      sens(transaction.montant),
    ]),
    totals: ['Total', '', '', '', '', 'EUR', remise.totalAmount, sens(remise.totalAmount)],
  };
  return report;
}
