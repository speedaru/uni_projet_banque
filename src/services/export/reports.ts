import { formatIsoDate } from '../../lib/format';
import type { RemiseFilters, RemiseRow } from '../remiseRepository';
import type { TreasuryFilters, TreasuryRow } from '../treasuryRepository';
import { motifLabel } from '../../lib/motifs';
import type { UnpaidFilters, UnpaidRow, UnpaidSummaryRow } from '../unpaidRepository';
import { sumTreasury } from '../treasuryService';
import { extractionLabel, fileDate, formatSiren, Report, reportTitle } from './report';

// Construction des rapports exportables à partir des données affichées à l'écran

const sens = (amount: number) => (amount < 0 ? '-' : '+');

// « DE L'ENTREPRISE DUPONT SARL N° SIREN 456 278 556 » (Epic 5, US4) dès qu'une seule entreprise
// est concernée : filtre sur le SIREN, ou résultats d'une seule entreprise (ex. filtre « Dupont »)
export function companySubject(
  siren: string | undefined,
  rows: { siren: string; raisonSociale: string }[],
  allLabel: string,
): string {
  const sirens = new Set(rows.map((row) => row.siren));
  const single = siren ?? (sirens.size === 1 ? rows[0].siren : undefined);
  if (single) {
    const name = rows.find((row) => row.siren === single)?.raisonSociale;
    return `de l'entreprise ${name ? `${name} ` : ''}N° SIREN ${formatSiren(single)}`;
  }
  return allLabel;
}

export function treasuryReport(filters: TreasuryFilters, rows: TreasuryRow[], now = new Date()) {
  const subject = companySubject(
    filters.siren,
    rows,
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
    rows,
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
    rows,
    filters.raisonSociale
      ? `des entreprises « ${filters.raisonSociale} »`
      : 'de toutes les entreprises',
  );
  const dossier = filters.numeroDossier ? ` (N° dossier : ${filters.numeroDossier})` : '';
  const motif = filters.motifCode
    ? ` — motif ${filters.motifCode} : ${motifLabel(filters.motifCode)}`
    : '';

  const report: Report = {
    fileName: `impayes_${fileDate(now)}`,
    title: reportTitle(`Liste des impayés ${subject}${periodLabel(filters)}${dossier}${motif}`),
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

// Somme des impayés par N° SIREN, écran du PO (Epic 3 US3, exportée pour l'Epic 5)
export function unpaidSummaryReport(
  filters: UnpaidFilters,
  rows: UnpaidSummaryRow[],
  now = new Date(),
) {
  const motif = filters.motifCode
    ? ` — motif ${filters.motifCode} : ${motifLabel(filters.motifCode)}`
    : '';
  const scope = filters.raisonSociale ? ` des entreprises « ${filters.raisonSociale} »` : '';
  const totalAmount = Math.round(rows.reduce((sum, row) => sum + row.totalAmount, 0) * 100) / 100;

  const report: Report = {
    fileName: `impayes_par_siren_${fileDate(now)}`,
    title: reportTitle(`Somme des impayés par N° SIREN${scope}${periodLabel(filters)}${motif}`),
    extractedAt: extractionLabel(now),
    columns: [
      { label: 'N° SIREN' },
      { label: 'Raison sociale' },
      { label: "Nombre d'impayés", type: 'integer' },
      { label: 'Montant total', type: 'amount' },
    ],
    rows: rows.map((row) => [row.siren, row.raisonSociale, row.count, row.totalAmount]),
    totals: ['Total', '', rows.reduce((sum, row) => sum + row.count, 0), totalAmount],
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
