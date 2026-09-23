import type { Request, Response } from 'express';

import '../lib/session';
import { treasuryReport } from '../services/export/reports';
import type { PdfRenderer } from '../services/export/pdfExport';
import { parseExportFormat } from '../services/export/report';
import { sendReport } from '../services/export/sendReport';
import type { TreasuryRepository, TreasuryRow } from '../services/treasuryRepository';
import {
  parseTreasuryFilters,
  parseTreasurySort,
  sortTreasuryRows,
  sumTreasury,
  TreasurySortKey,
} from '../services/treasuryService';
import { criteriaParams } from './criteriaParams';

// Écran « Annonces de trésorerie » (Epic 1) et ses exports (Epic 5), communs au PO et au Client
export function createTreasuryController(treasury: TreasuryRepository, renderPdf: PdfRenderer) {
  // Critères + données, partagés par l'écran et l'export
  async function load(req: Request) {
    const user = req.session.user!;
    const isClient = user.role === 'client';
    const { filters, errors } = parseTreasuryFilters(req.query);
    const sort = parseTreasurySort(req.query);

    // Le client ne voit que son entreprise, quels que soient les paramètres envoyés (Epic 7)
    if (isClient) {
      filters.siren = user.siren;
      delete filters.raisonSociale;
    }

    let rows: TreasuryRow[] = [];
    if (errors.length === 0 && (!isClient || user.siren)) {
      rows = sortTreasuryRows(await treasury.findAnnouncements(filters), sort);
    }
    return { user, isClient, filters, errors, sort, rows };
  }

  return {
    async page(req: Request, res: Response) {
      const { user, isClient, filters, errors, sort, rows } = await load(req);
      const params = criteriaParams(filters, isClient);

      // Lien d'un en-tête de colonne : conserve les filtres, inverse l'ordre si la colonne est déjà triée
      const sortUrl = (key: TreasurySortKey) => {
        const query = new URLSearchParams(params);
        query.set('tri', key);
        query.set('ordre', sort.key === key && sort.order === 'asc' ? 'desc' : 'asc');
        return `?${query}`;
      };

      res.render('tresorerie', {
        titre: 'Annonces de trésorerie',
        isClient,
        filters,
        errors,
        sort,
        sortUrl,
        rows,
        totals: sumTreasury(rows),
        exportParams: { ...params, tri: sort.key, ordre: sort.order },
        clientSiren: user.siren ?? '',
        clientRaisonSociale: rows[0]?.raisonSociale ?? '',
      });
    },

    async export(req: Request, res: Response) {
      const format = parseExportFormat(req.query.format);
      const { filters, errors, rows } = await load(req);
      if (!format || errors.length > 0) {
        return res.status(400).send(errors[0] ?? 'Format d’export invalide.');
      }
      await sendReport(res, treasuryReport(filters, rows), format, renderPdf);
    },
  };
}
