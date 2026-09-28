import { Router } from 'express';

import { createRemiseController } from '../controllers/remiseController';
import { createStatsController } from '../controllers/statsController';
import { createTreasuryController } from '../controllers/treasuryController';
import { createUnpaidController } from '../controllers/unpaidController';
import type { PdfRenderer } from '../services/export/pdfExport';
import type { RemiseRepository } from '../services/remiseRepository';
import type { StatsRepository } from '../services/statsRepository';
import type { TreasuryRepository } from '../services/treasuryRepository';
import { buildChartData, parseStatsCriteria } from '../services/statsService';
import { sumTreasury } from '../services/treasuryService';
import type { UnpaidRepository } from '../services/unpaidRepository';
import '../lib/session';
import type { HomeLoader } from './roles';

export interface BusinessDependencies {
  treasury: TreasuryRepository;
  remises: RemiseRepository;
  unpaid: UnpaidRepository;
  stats: StatsRepository;
  renderPdf: PdfRenderer;
}

// Écrans métier communs au PO (/po) et au Client (/client).
// Le contrôle d'accès est fait par createRoleRouter ; le filtrage par SIREN dans chaque contrôleur.
export function createBusinessPagesRouter(prefix: '/po' | '/client', deps: BusinessDependencies) {
  const router = Router();
  const treasury = createTreasuryController(deps.treasury, deps.renderPdf);
  const remises = createRemiseController(deps.remises, deps.renderPdf);
  const unpaid = createUnpaidController(deps.unpaid, deps.renderPdf);
  const stats = createStatsController(deps.stats, deps.renderPdf);

  router.get(`${prefix}/tresorerie`, treasury.page);
  router.get(`${prefix}/tresorerie/export`, treasury.export);
  router.get(`${prefix}/remises`, remises.page);
  router.get(`${prefix}/remises/export`, remises.export);
  router.get(`${prefix}/remises/:numero/export`, remises.exportDetail);
  router.get(`${prefix}/impayes`, unpaid.page);
  router.get(`${prefix}/impayes/export`, unpaid.export);
  router.get(`${prefix}/impayes/synthese/export`, unpaid.exportSummary);
  router.get(`${prefix}/statistiques`, stats.page);
  router.get(`${prefix}/statistiques/donnees`, stats.data);
  router.get(`${prefix}/statistiques/export`, stats.export);

  return router;
}

// Indicateurs de la page d'accueil du PO et du client : solde global (toutes dates)
// et impayés des 4 derniers mois, limités à son entreprise pour le client (Epic 7)
export function createHomeLoader(deps: BusinessDependencies): HomeLoader {
  return async (req) => {
    const user = req.session.user!;
    const siren = user.role === 'client' ? user.siren : undefined;
    if (user.role === 'client' && !siren) {
      return {};
    }

    const { filters } = parseStatsCriteria({ periode: '4mois' });
    filters.siren = siren;
    const [rows, points] = await Promise.all([
      deps.treasury.findAnnouncements({ siren }),
      deps.stats.evolution(filters),
    ]);
    const chart = buildChartData(filters, points, []);

    return {
      kpis: {
        balance: sumTreasury(rows).totalAmount,
        negativeAccounts: rows.filter((row) => row.totalAmount < 0).length,
        unpaid: chart.totals.unpaid,
        unpaidCount: chart.totals.unpaidCount,
        rate: chart.totals.rate,
      },
    };
  };
}
