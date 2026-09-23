import { Router } from 'express';

import { createLoginHandler, logout, showLoginPage } from '../controllers/authController';
import { findDemoUser } from '../services/demoUsers';

export const authRouter = Router();

authRouter.get('/connexion', showLoginPage);
authRouter.post('/connexion', createLoginHandler(findDemoUser));
authRouter.post('/deconnexion', logout);
