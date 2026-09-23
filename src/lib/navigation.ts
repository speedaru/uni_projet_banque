// Profils utilisateurs du portail (voir Epic 6/7 dans docs/scope-and-stack.fr.md)
export type Role = 'admin' | 'po' | 'client';

export interface NavLink {
  label: string;
  href: string;
  // Nom de l'icône (voir src/lib/icons.ts)
  icon: string;
  // Texte court affiché sur les cartes de raccourcis de la page d'accueil
  description: string;
}

// Libellé affiché dans le bandeau de navigation de chaque espace
export const roleLabels: Record<Role, string> = {
  admin: 'Administrateur',
  po: 'Product Owner',
  client: 'Client',
};

// Écrans métier communs au PO et au Client (le filtrage par SIREN se fait côté données)
function businessLinks(prefix: string): NavLink[] {
  return [
    { label: 'Accueil', href: prefix, icon: 'home', description: '' },
    {
      label: 'Annonces de trésorerie',
      href: `${prefix}/tresorerie`,
      icon: 'wallet',
      description: 'Soldes et nombre de transactions par date de valeur.',
    },
    {
      label: 'Remises',
      href: `${prefix}/remises`,
      icon: 'receipt',
      description: 'Recherche des remises et détail de leurs transactions.',
    },
    {
      label: 'Impayés',
      href: `${prefix}/impayes`,
      icon: 'alert',
      description: 'Suivi des transactions impayées et de leurs motifs.',
    },
    {
      label: 'Statistiques',
      href: `${prefix}/statistiques`,
      icon: 'chart',
      description: 'Évolution des impayés en graphiques.',
    },
  ];
}

// Menu de chaque espace. Le premier lien est toujours la page d'accueil de l'espace.
// L'admin n'a aucun lien vers les données métier (Epic 7).
export const navigation: Record<Role, NavLink[]> = {
  admin: [
    { label: 'Accueil', href: '/admin', icon: 'home', description: '' },
    {
      label: 'Comptes clients',
      href: '/admin/comptes',
      icon: 'users',
      description: 'Créer ou supprimer des comptes, avec l’accord du Product Owner.',
    },
  ],
  po: businessLinks('/po'),
  client: businessLinks('/client'),
};
