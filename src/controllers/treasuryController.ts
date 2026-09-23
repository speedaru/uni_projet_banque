import type { Request, Response } from 'express';

import '../lib/session';
import type { TreasuryRepository, TreasuryRow } from '../services/treasuryRepository';
import {
  parseTreasuryFilters,
  parseTreasurySort,
  sortTreasuryRows,
  sumTreasury,
  TreasurySortKey,
} from '../services/treasuryService';

// Écran « Annonces de trésorerie » (Epic 1), commun au PO et au Client
export function createTreasuryController(treasury: TreasuryRepository) {
  return async (req: Request, res: Response) => {
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

    // Lien d'un en-tête de colonne : conserve les filtres, inverse l'ordre si la colonne est déjà triée
    const sortUrl = (key: TreasurySortKey) => {
      const params = new URLSearchParams();
      for (const [name, value] of Object.entries(filters)) {
        if (value && !(isClient && name === 'siren')) {
          params.set(name, value);
        }
      }
      params.set('tri', key);
      params.set('ordre', sort.key === key && sort.order === 'asc' ? 'desc' : 'asc');
      return `?${params}`;
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
      clientSiren: user.siren ?? '',
      clientRaisonSociale: rows[0]?.raisonSociale ?? '',
    });
  };
}
