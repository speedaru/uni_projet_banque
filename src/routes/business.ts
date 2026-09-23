import { Router } from 'express';

import { createRemiseController } from '../controllers/remiseController';
import { createTreasuryController } from '../controllers/treasuryController';
import { createUnpaidController } from '../controllers/unpaidController';
import type { PdfRenderer } from '../services/export/pdfExport';
import type { RemiseRepository } from '../services/remiseRepository';
import type { TreasuryRepository } from '../services/treasuryRepository';
import type { UnpaidRepository } from '../services/unpaidRepository';

export interface BusinessDependencies {
  treasury: TreasuryRepository;
  remises: RemiseRepository;
  unpaid: UnpaidRepository;
  renderPdf: PdfRenderer;
}

// Écrans métier communs au PO (/po) et au Client (/client).
// Le contrôle d'accès est fait par createRoleRouter ; le filtrage par SIREN dans chaque contrôleur.
export function createBusinessPagesRouter(prefix: '/po' | '/client', deps: BusinessDependencies) {
  const router = Router();
  const treasury = createTreasuryController(deps.treasury, deps.renderPdf);
  const remises = createRemiseController(deps.remises, deps.renderPdf);
  const unpaid = createUnpaidController(deps.unpaid, deps.renderPdf);

  router.get(`${prefix}/tresorerie`, treasury.page);
  router.get(`${prefix}/tresorerie/export`, treasury.export);
  router.get(`${prefix}/remises`, remises.page);
  router.get(`${prefix}/remises/export`, remises.export);
  router.get(`${prefix}/remises/:numero/export`, remises.exportDetail);
  router.get(`${prefix}/impayes`, unpaid.page);
  router.get(`${prefix}/impayes/export`, unpaid.export);

  return router;
}
