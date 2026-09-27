import { Request, Router } from 'express';

import { navigation, Role, roleLabels } from '../lib/navigation';
import { requireRole } from '../middlewares/requireRole';

// Données supplémentaires de la page d'accueil (ex. indicateurs du PO et du client)
export type HomeLoader = (req: Request) => Promise<Record<string, unknown>>;

// Crée le routeur d'un espace (admin, po ou client) : contrôle d'accès, page d'accueil,
// écrans déjà développés (`pages`), puis une page « à venir » pour les autres écrans du menu.
export function createRoleRouter(role: Role, pages?: Router, loadHome?: HomeLoader) {
  const router = Router();
  const [home, ...links] = navigation[role];

  // Toutes les URL de l'espace sont réservées à son profil (Epic 7)
  router.use(home.href, requireRole(role));

  // Variables communes à toutes les vues de l'espace, utilisées par le bandeau de navigation
  router.use(home.href, (req, res, next) => {
    res.locals.role = role;
    res.locals.roleLabel = roleLabels[role];
    res.locals.navigation = navigation[role];
    res.locals.currentPath = req.originalUrl.split('?')[0];
    next();
  });

  router.get(home.href, async (req, res) => {
    const extra = loadHome ? await loadHome(req) : {};
    res.render(`${role}/accueil`, { titre: `Espace ${roleLabels[role]}`, ...extra });
  });

  if (pages) {
    router.use(pages);
  }

  // Écrans pas encore développés (ignorés si `pages` a déjà répondu)
  for (const link of links) {
    router.get(link.href, (_req, res) => {
      res.render('a-venir', { titre: link.label });
    });
  }

  return router;
}
