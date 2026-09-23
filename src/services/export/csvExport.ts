import type { Cell, Report, ReportColumn } from './report';

// Séparateur « ; » et virgule décimale : format attendu par Excel en français
const SEPARATOR = ';';
// Marque d'ordre des octets UTF-8 : indique à Excel l'encodage du fichier
const BOM = String.fromCharCode(0xfeff);

function formatCell(value: Cell, column?: ReportColumn): string {
  if (typeof value === 'number') {
    return column?.type === 'amount' ? value.toFixed(2).replace('.', ',') : String(value);
  }
  return value;
}

// Entoure de guillemets les valeurs qui contiennent un séparateur, un guillemet ou un retour ligne
function escape(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function line(cells: Cell[], columns: ReportColumn[]): string {
  return cells.map((cell, index) => escape(formatCell(cell, columns[index]))).join(SEPARATOR);
}

export function toCsv(report: Report): Buffer {
  const lines = [
    escape(report.title),
    escape(report.extractedAt),
    '',
    line(
      report.columns.map((column) => column.label),
      report.columns,
    ),
    ...report.rows.map((row) => line(row, report.columns)),
  ];
  if (report.totals) {
    lines.push(line(report.totals, report.columns));
  }
  return Buffer.from(`${BOM}${lines.join('\r\n')}\r\n`, 'utf8');
}
