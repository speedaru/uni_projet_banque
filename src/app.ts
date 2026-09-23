import express from 'express';
import session from 'express-session';
import path from 'node:path';

import './lib/session';
import { authRouter } from './routes/auth';
import { indexRouter } from './routes/index';
import { createRoleRouter } from './routes/roles';

export function createApp() {
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
      cookie: { httpOnly: true },
    }),
  );

  // Utilisateur connecté accessible dans toutes les vues (bouton de déconnexion)
  app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
  });

  app.use('/', indexRouter);
  app.use(authRouter);
  app.use(createRoleRouter('admin'));
  app.use(createRoleRouter('po'));
  app.use(createRoleRouter('client'));

  return app;
}
