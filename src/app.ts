import express from 'express';
import session from 'express-session';
import path from 'node:path';

import { formatAmount, formatIsoDate } from './lib/format';
import { icon } from './lib/icons';
import './lib/session';
import { createAdminPagesRouter } from './routes/admin';
import { createAuthRouter } from './routes/auth';
import { createBusinessPagesRouter } from './routes/business';
import { indexRouter } from './routes/index';
import { createRoleRouter } from './routes/roles';
import { PdfRenderer, puppeteerPdfRenderer } from './services/export/pdfExport';
import { prismaRemiseRepository } from './services/prismaRemiseRepository';
import { prismaTreasuryRepository } from './services/prismaTreasuryRepository';
import { prismaUnpaidRepository } from './services/prismaUnpaidRepository';
import { prismaUserRepository } from './services/prismaUserRepository';
import type { RemiseRepository } from './services/remiseRepository';
import type { TreasuryRepository } from './services/treasuryRepository';
import type { UnpaidRepository } from './services/unpaidRepository';
import type { UserRepository } from './services/userRepository';

// Dépendances de l'application. Les tests passent des versions en mémoire
// pour ne pas avoir besoin de base de données.
export interface AppDependencies {
  users?: UserRepository;
  treasury?: TreasuryRepository;
  remises?: RemiseRepository;
  unpaid?: UnpaidRepository;
  // Génération des PDF (Puppeteer en vrai, version factice dans les tests)
  renderPdf?: PdfRenderer;
}

export function createApp({
  users = prismaUserRepository,
  treasury = prismaTreasuryRepository,
  remises = prismaRemiseRepository,
  unpaid = prismaUnpaidRepository,
  renderPdf = puppeteerPdfRenderer,
}: AppDependencies = {}) {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));

  // Fonctions de formatage disponibles dans toutes les vues
  app.locals.formatAmount = formatAmount;
  app.locals.formatIsoDate = formatIsoDate;
  app.locals.icon = icon;

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
  const business = { treasury, remises, unpaid, renderPdf };
  app.use(createRoleRouter('po', createBusinessPagesRouter('/po', business)));
  app.use(createRoleRouter('client', createBusinessPagesRouter('/client', business)));

  return app;
}
