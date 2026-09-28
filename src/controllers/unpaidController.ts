import type { Request, Response } from 'express';

import { MOTIFS_IMPAYES } from '../lib/motifs';
import '../lib/session';
import type { PdfRenderer } from '../services/export/pdfExport';
import { parseExportFormat } from '../services/export/report';
import { unpaidReport, unpaidSummaryReport } from '../services/export/reports';
import { sendReport } from '../services/export/sendReport';
import type { Pagination } from '../services/remiseRepository';
import { EXPORT_MAX_ROWS, PAGE_SIZES, pageCount, parsePagination } from '../services/remiseService';
import type {
  UnpaidRepository,
  UnpaidSearchResult,
  UnpaidSummaryRow,
} from '../services/unpaidRepository';
import {
  AMOUNT_BRACKETS,
  amountBracket,
  parseUnpaidFilters,
  parseUnpaidSort,
} from '../services/unpaidService';
import { criteriaParams } from './criteriaParams';

// Écran « Recherche des impayés » (Epic 3) et son export (Epic 5), communs au PO et au Client
export function createUnpaidController(unpaid: UnpaidRepository, renderPdf: PdfRenderer) {
  // Critères + résultats, partagés par l'écran et l'export
  async function load(req: Request, pagination: Pagination) {
    const user = req.session.user!;
    const isClient = user.role === 'client';
    const { filters, errors } = parseUnpaidFilters(req.query);
    const sort = parseUnpaidSort(req.query);

    // Le client ne voit que les impayés de son entreprise, quels que soient les paramètres (Epic 7)
    if (isClient) {
      filters.siren = user.siren;
      delete filters.raisonSociale;
    }

    let result: UnpaidSearchResult = { total: 0, totalAmount: 0, rows: [] };
    let summary: UnpaidSummaryRow[] = [];
    if (errors.length === 0 && (!isClient || user.siren)) {
      [result, summary] = await Promise.all([
        unpaid.search(filters, sort, pagination),
        // Somme des impayés par SIREN : réservée au PO (US3)
        isClient ? Promise.resolve([]) : unpaid.summaryBySiren(filters),
      ]);
    }
    return { user, isClient, filters, errors, sort, result, summary };
  }

  return {
    async page(req: Request, res: Response) {
      const pagination = parsePagination(req.query);
      const { user, isClient, filters, errors, sort, result, summary } = await load(
        req,
        pagination,
      );
      const params = criteriaParams(filters, isClient);

      // Lien vers une autre page ou un autre tri, en conservant les critères
      const url = (changes: Record<string, string | number>) => {
        const query = new URLSearchParams(params);
        query.set('tri', sort.key);
        query.set('ordre', sort.order);
        query.set('lignes', String(pagination.pageSize));
        for (const [name, value] of Object.entries(changes)) {
          query.set(name, String(value));
        }
        return `?${query}`;
      };

      res.render('impayes', {
        titre: 'Recherche des impayés',
        isClient,
        filters,
        errors,
        sort,
        result,
        summary,
        pagination,
        pageSizes: PAGE_SIZES,
        totalPages: pageCount(result.total, pagination.pageSize),
        pageUrl: (page: number) => url({ page }),
        // Clic sur l'en-tête « Montant » : bascule croissant / décroissant (US2)
        amountSortUrl: url({
          tri: 'montant',
          ordre: sort.key === 'montant' && sort.order === 'asc' ? 'desc' : 'asc',
          page: 1,
        }),
        dateSortUrl: url({
          tri: 'date',
          ordre: sort.key === 'date' && sort.order === 'desc' ? 'asc' : 'desc',
          page: 1,
        }),
        amountBracket,
        amountBrackets: AMOUNT_BRACKETS,
        motifs: MOTIFS_IMPAYES,
        exportParams: { ...params, tri: sort.key, ordre: sort.order },
        clientSiren: user.siren ?? '',
        clientRaisonSociale: result.rows[0]?.raisonSociale ?? '',
      });
    },

    // Export de tous les impayés trouvés (pas seulement la page affichée)
    async export(req: Request, res: Response) {
      const format = parseExportFormat(req.query.format);
      const { filters, errors, result } = await load(req, { page: 1, pageSize: EXPORT_MAX_ROWS });
      if (!format || errors.length > 0) {
        return res.status(400).send(errors[0] ?? 'Format d’export invalide.');
      }
      await sendReport(
        res,
        unpaidReport(filters, result.rows, result.totalAmount),
        format,
        renderPdf,
      );
    },

    // Export de la somme des impayés par SIREN : tableau réservé au PO (Epic 3 US3)
    async exportSummary(req: Request, res: Response) {
      if (req.session.user!.role !== 'po') {
        return res.status(403).send('Export réservé au Product Owner.');
      }
      const format = parseExportFormat(req.query.format);
      const { filters, errors, summary } = await load(req, { page: 1, pageSize: 1 });
      if (!format || errors.length > 0) {
        return res.status(400).send(errors[0] ?? 'Format d’export invalide.');
      }
      await sendReport(res, unpaidSummaryReport(filters, summary), format, renderPdf);
    },
  };
}
