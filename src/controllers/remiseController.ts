import type { Request, Response } from 'express';

import '../lib/session';
import type { PdfRenderer } from '../services/export/pdfExport';
import { parseExportFormat } from '../services/export/report';
import { remiseDetailReport, remisesReport } from '../services/export/reports';
import { sendReport } from '../services/export/sendReport';
import type {
  Pagination,
  RemiseRepository,
  RemiseSearchResult,
} from '../services/remiseRepository';
import {
  EXPORT_MAX_ROWS,
  PAGE_SIZES,
  pageCount,
  parsePagination,
  parseRemiseFilters,
} from '../services/remiseService';
import { criteriaParams } from './criteriaParams';

// Écran « Recherche de remises » (Epic 2) et ses exports (Epic 5), communs au PO et au Client
export function createRemiseController(remises: RemiseRepository, renderPdf: PdfRenderer) {
  // Critères + résultats, partagés par l'écran et l'export
  async function load(req: Request, pagination: Pagination) {
    const user = req.session.user!;
    const isClient = user.role === 'client';
    const { filters, errors } = parseRemiseFilters(req.query);

    // Le client ne voit que les remises de son entreprise, quels que soient les paramètres (Epic 7)
    if (isClient) {
      filters.siren = user.siren;
      delete filters.raisonSociale;
    }

    let result: RemiseSearchResult = { total: 0, rows: [] };
    if (errors.length === 0 && (!isClient || user.siren)) {
      result = await remises.search(filters, pagination);
    }
    return { user, isClient, filters, errors, result };
  }

  return {
    async page(req: Request, res: Response) {
      const pagination = parsePagination(req.query);
      const { user, isClient, filters, errors, result } = await load(req, pagination);
      const params = criteriaParams(filters, isClient);

      // Lien vers une autre page : conserve les critères et le nombre de lignes
      const pageUrl = (page: number) => {
        const query = new URLSearchParams(params);
        query.set('lignes', String(pagination.pageSize));
        query.set('page', String(page));
        return `?${query}`;
      };

      res.render('remises', {
        titre: 'Recherche de remises',
        isClient,
        filters,
        errors,
        result,
        pagination,
        pageSizes: PAGE_SIZES,
        totalPages: pageCount(result.total, pagination.pageSize),
        pageUrl,
        exportParams: params,
        clientSiren: user.siren ?? '',
        clientRaisonSociale: result.rows[0]?.raisonSociale ?? '',
      });
    },

    // Export du tableau principal : toutes les remises trouvées, pas seulement la page affichée
    async export(req: Request, res: Response) {
      const format = parseExportFormat(req.query.format);
      const { filters, errors, result } = await load(req, { page: 1, pageSize: EXPORT_MAX_ROWS });
      if (!format || errors.length > 0) {
        return res.status(400).send(errors[0] ?? 'Format d’export invalide.');
      }
      await sendReport(res, remisesReport(filters, result.rows), format, renderPdf);
    },

    // Export du tableau de détail d'une remise
    async exportDetail(req: Request, res: Response) {
      const format = parseExportFormat(req.query.format);
      if (!format) {
        return res.status(400).send('Format d’export invalide.');
      }
      const user = req.session.user!;
      const remise = await remises.findByNumero(String(req.params.numero));

      // Remise inconnue, ou appartenant à une autre entreprise que celle du client (Epic 7)
      if (!remise || (user.role === 'client' && remise.siren !== user.siren)) {
        return res.status(404).send('Remise introuvable.');
      }
      await sendReport(res, remiseDetailReport(remise), format, renderPdf);
    },
  };
}
