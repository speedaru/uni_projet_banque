import type { Response } from 'express';

import { toCsv } from './csvExport';
import type { PdfRenderer } from './pdfExport';
import type { ExportFormat, Report } from './report';
import { toXlsx } from './xlsxExport';

// Rend une vue EJS en chaîne HTML (utilisé pour le PDF)
function renderView(res: Response, view: string, data: object): Promise<string> {
  return new Promise((resolve, reject) => {
    res.app.render(view, data, (error, html) => (error ? reject(error) : resolve(html)));
  });
}

// Envoie le rapport au navigateur sous forme de fichier téléchargé, dans le format demandé
export async function sendReport(
  res: Response,
  report: Report,
  format: ExportFormat,
  renderPdf: PdfRenderer,
) {
  let content: Buffer;
  let extension: string;

  if (format === 'csv') {
    content = toCsv(report);
    extension = 'csv';
  } else if (format === 'xls') {
    content = await toXlsx(report);
    extension = 'xlsx';
  } else {
    const html = await renderView(res, 'rapport', { report });
    // Paysage pour les tableaux larges (remises, détail)
    content = await renderPdf(html, { landscape: report.columns.length > 6 });
    extension = 'pdf';
  }

  res.attachment(`${report.fileName}.${extension}`);
  res.send(content);
}
