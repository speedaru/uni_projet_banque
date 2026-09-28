import ExcelJS from 'exceljs';

import type { Report } from './report';

const NAVY = 'FF0B1B34';
const RED = 'FFD92D20';
const AMOUNT_FORMAT = '#,##0.00';

// Classeur Excel (.xlsx) : titre, date d'extraction, puis le tableau mis en forme
export async function toXlsx(report: Report): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Portail Web Monétique';
  const sheet = workbook.addWorksheet('Rapport');
  const lastColumn = report.columns.length;

  sheet.mergeCells(1, 1, 1, lastColumn);
  const title = sheet.getCell(1, 1);
  title.value = report.title;
  title.font = { bold: true, size: 14, color: { argb: NAVY } };

  sheet.mergeCells(2, 1, 2, lastColumn);
  const extraction = sheet.getCell(2, 1);
  extraction.value = report.extractedAt;
  extraction.font = { italic: true, color: { argb: 'FF5D6B82' } };

  // En-tête du tableau en ligne 4
  const header = sheet.getRow(4);
  report.columns.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.value = column.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { horizontal: column.type === 'text' || !column.type ? 'left' : 'right' };
  });

  const addRow = (values: (string | number)[], bold = false) => {
    const row = sheet.addRow(values);
    report.columns.forEach((column, index) => {
      const cell = row.getCell(index + 1);
      if (column.type === 'amount' && typeof cell.value === 'number') {
        cell.numFmt = AMOUNT_FORMAT;
        // Montant négatif en rouge, comme à l'écran
        if (cell.value < 0) {
          cell.font = { bold: true, color: { argb: RED } };
        }
      }
      if (bold) {
        cell.font = { ...cell.font, bold: true };
      }
    });
  };

  report.rows.forEach((row) => addRow(row));
  if (report.totals) {
    addRow(report.totals, true);
  }

  // Largeur des colonnes adaptée au contenu
  report.columns.forEach((column, index) => {
    const longest = Math.max(
      column.label.length,
      ...report.rows.map((row) => String(row[index] ?? '').length),
    );
    sheet.getColumn(index + 1).width = Math.min(Math.max(longest + 4, 10), 40);
  });

  sheet.views = [{ state: 'frozen', ySplit: 4 }];

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
