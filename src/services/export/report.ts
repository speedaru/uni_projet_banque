// Rapport exportable (Epic 5) : un titre, une date d'extraction et un tableau.
// Le même rapport est converti en CSV, XLS (classeur Excel) ou PDF.

export type ExportFormat = 'xls' | 'csv' | 'pdf';

export const EXPORT_FORMATS: ExportFormat[] = ['xls', 'csv', 'pdf'];

export type ColumnType = 'text' | 'integer' | 'amount';

export interface ReportColumn {
  label: string;
  type?: ColumnType;
}

export type Cell = string | number;

export interface Report {
  // Nom du fichier sans extension, ex. « remises_2026-09-23 »
  fileName: string;
  // Titre en majuscules (US4), ex. « LISTE DES REMISES DE L'ENTREPRISE DUPONT N° SIREN 456 278 556 »
  title: string;
  // Mention de la date d'extraction (US5), ex. « EXTRAIT DU 07/10/2022 »
  extractedAt: string;
  columns: ReportColumn[];
  rows: Cell[][];
  // Ligne de total optionnelle (cellules vides = chaîne vide)
  totals?: Cell[];
}

export function parseExportFormat(value: unknown): ExportFormat | undefined {
  return EXPORT_FORMATS.find((format) => format === value);
}

// Titre en majuscules, à la française (É, È, Ç... conservés)
export function reportTitle(text: string): string {
  return text.toLocaleUpperCase('fr-FR');
}

// « EXTRAIT DU 23/09/2026 », date du jour à Paris
export function extractionLabel(now = new Date()): string {
  const date = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' }).format(now);
  return `EXTRAIT DU ${date}`;
}

// Date du jour au format AAAA-MM-JJ pour le nom de fichier
export function fileDate(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(now);
}

// « 456278556 » → « 456 278 556 »
export function formatSiren(siren: string): string {
  return siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
}
