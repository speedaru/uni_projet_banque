import { Router } from 'express';

import { createAccountsController } from '../controllers/adminController';
import type { UserRepository } from '../services/userRepository';

// Écrans réels de l'espace admin (le contrôle d'accès est fait par createRoleRouter)
export function createAdminPagesRouter(users: UserRepository) {
  const router = Router();
  const accounts = createAccountsController(users);

  router.get('/admin/comptes', accounts.list);
  router.post('/admin/comptes', accounts.create);
  router.post('/admin/comptes/:id/supprimer', accounts.remove);

  return router;
}
