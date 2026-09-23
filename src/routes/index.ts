import { Router } from 'express';

export const indexRouter = Router();

// L'écran d'accueil du portail est l'écran de connexion (spécifications, fonction 1)
indexRouter.get('/', (_req, res) => {
  res.redirect('/connexion');
});
