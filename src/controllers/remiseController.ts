import type { Request, Response } from 'express';

import '../lib/session';
import type { RemiseRepository, RemiseSearchResult } from '../services/remiseRepository';
import {
  PAGE_SIZES,
  pageCount,
  parsePagination,
  parseRemiseFilters,
} from '../services/remiseService';

// Écran « Recherche de remises » (Epic 2), commun au PO et au Client
export function createRemiseController(remises: RemiseRepository) {
  return async (req: Request, res: Response) => {
    const user = req.session.user!;
    const isClient = user.role === 'client';
    const { filters, errors } = parseRemiseFilters(req.query);
    const pagination = parsePagination(req.query);

    // Le client ne voit que les remises de son entreprise, quels que soient les paramètres (Epic 7)
    if (isClient) {
      filters.siren = user.siren;
      delete filters.raisonSociale;
    }

    let result: RemiseSearchResult = { total: 0, rows: [] };
    if (errors.length === 0 && (!isClient || user.siren)) {
      result = await remises.search(filters, pagination);
    }

    // Lien vers une autre page : conserve les critères et le nombre de lignes
    const pageUrl = (page: number) => {
      const params = new URLSearchParams();
      for (const [name, value] of Object.entries(filters)) {
        if (value && !(isClient && name === 'siren')) {
          params.set(name, value);
        }
      }
      params.set('lignes', String(pagination.pageSize));
      params.set('page', String(page));
      return `?${params}`;
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
      clientSiren: user.siren ?? '',
      clientRaisonSociale: result.rows[0]?.raisonSociale ?? '',
    });
  };
}
