import type { NextFunction, Request, Response } from 'express';

import '../lib/session';
import { navigation, Role } from '../lib/navigation';

// Contrôle d'accès par profil (Epic 7) :
// - non connecté → écran de connexion
// - mauvais profil → renvoi vers l'accueil de son propre espace
//   (l'admin qui tente d'accéder aux données métier est renvoyé sur sa page d'admin)
export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.session.user;

    if (!user) {
      return res.redirect('/connexion');
    }
    if (user.role !== role) {
      return res.redirect(navigation[user.role][0].href);
    }
    next();
  };
}
