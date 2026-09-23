import { Router } from 'express';

import { createLoginHandler, logout, showLoginPage } from '../controllers/authController';
import type { UserRepository } from '../services/userRepository';

export function createAuthRouter(users: UserRepository) {
  const router = Router();

  router.get('/connexion', showLoginPage);
  router.post('/connexion', createLoginHandler(users));
  router.post('/deconnexion', logout);

  return router;
}
