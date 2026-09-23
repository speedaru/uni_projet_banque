import { Router } from 'express';

import { createRemiseController } from '../controllers/remiseController';
import { createTreasuryController } from '../controllers/treasuryController';
import type { RemiseRepository } from '../services/remiseRepository';
import type { TreasuryRepository } from '../services/treasuryRepository';

export interface BusinessDependencies {
  treasury: TreasuryRepository;
  remises: RemiseRepository;
}

// Écrans métier communs au PO (/po) et au Client (/client).
// Le contrôle d'accès est fait par createRoleRouter ; le filtrage par SIREN dans chaque contrôleur.
export function createBusinessPagesRouter(prefix: '/po' | '/client', deps: BusinessDependencies) {
  const router = Router();

  router.get(`${prefix}/tresorerie`, createTreasuryController(deps.treasury));
  router.get(`${prefix}/remises`, createRemiseController(deps.remises));

  return router;
}
