import express from 'express';
import session from 'express-session';
import path from 'node:path';

import './lib/session';
import { createAdminPagesRouter } from './routes/admin';
import { createAuthRouter } from './routes/auth';
import { indexRouter } from './routes/index';
import { createRoleRouter } from './routes/roles';
import { prismaUserRepository } from './services/prismaUserRepository';
import type { UserRepository } from './services/userRepository';

// Dépendances de l'application. Les tests passent une version en mémoire
// pour ne pas avoir besoin de base de données.
export interface AppDependencies {
  users?: UserRepository;
}

export function createApp({ users = prismaUserRepository }: AppDependencies = {}) {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));

  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(
    '/vendor/chart.js',
    express.static(path.join(__dirname, '..', 'node_modules', 'chart.js', 'dist')),
  );

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'change-me',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax' },
    }),
  );

  // Utilisateur connecté accessible dans toutes les vues (bouton de déconnexion)
  app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
  });

  app.use('/', indexRouter);
  app.use(createAuthRouter(users));
  app.use(createRoleRouter('admin', createAdminPagesRouter(users)));
  app.use(createRoleRouter('po'));
  app.use(createRoleRouter('client'));

  return app;
}
