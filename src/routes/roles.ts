import { Router } from 'express';

import { navigation, Role, roleLabels } from '../lib/navigation';

// Crée le routeur d'un espace (admin, po ou client) : page d'accueil de l'espace
// + une page « à venir » pour chaque écran du menu pas encore développé.
// Le contrôle d'accès par profil (Epic 7) viendra se brancher ici sous forme de middleware.
export function createRoleRouter(role: Role) {
  const router = Router();
  const [home, ...pages] = navigation[role];

  // Variables communes à toutes les vues de l'espace, utilisées par le bandeau de navigation
  router.use(home.href, (req, res, next) => {
    res.locals.role = role;
    res.locals.roleLabel = roleLabels[role];
    res.locals.navigation = navigation[role];
    res.locals.currentPath = req.originalUrl.split('?')[0];
    next();
  });

  router.get(home.href, (_req, res) => {
    res.render(`${role}/accueil`, { titre: `Espace ${roleLabels[role]}` });
  });

  for (const page of pages) {
    router.get(page.href, (_req, res) => {
      res.render('a-venir', { titre: page.label });
    });
  }

  return router;
}
