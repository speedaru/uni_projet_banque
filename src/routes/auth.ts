import { Router } from 'express';

import { createLoginHandler, logout, showLoginPage } from '../controllers/authController';
import type { LoginThrottle } from '../services/loginThrottle';
import type { UserRepository } from '../services/userRepository';

export function createAuthRouter(users: UserRepository, throttle: LoginThrottle) {
  const router = Router();

  router.get('/connexion', showLoginPage);
  router.post('/connexion', createLoginHandler(users, throttle));
  router.post('/deconnexion', logout);

  return router;
}
