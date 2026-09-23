import { Router } from 'express';

import { createTreasuryController } from '../controllers/treasuryController';
import type { TreasuryRepository } from '../services/treasuryRepository';

export interface BusinessDependencies {
  treasury: TreasuryRepository;
}

// Écrans métier communs au PO (/po) et au Client (/client).
// Le contrôle d'accès est fait par createRoleRouter ; le filtrage par SIREN dans chaque contrôleur.
export function createBusinessPagesRouter(prefix: '/po' | '/client', deps: BusinessDependencies) {
  const router = Router();

  router.get(`${prefix}/tresorerie`, createTreasuryController(deps.treasury));

  return router;
}
