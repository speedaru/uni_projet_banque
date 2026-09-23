// Profils utilisateurs du portail (voir Epic 6/7 dans docs/scope-and-stack.fr.md)
export type Role = 'admin' | 'po' | 'client';

export interface NavLink {
  label: string;
  href: string;
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
    { label: 'Accueil', href: prefix },
    { label: 'Annonces de trésorerie', href: `${prefix}/tresorerie` },
    { label: 'Remises', href: `${prefix}/remises` },
    { label: 'Impayés', href: `${prefix}/impayes` },
    { label: 'Statistiques', href: `${prefix}/statistiques` },
  ];
}

// Menu de chaque espace. Le premier lien est toujours la page d'accueil de l'espace.
// L'admin n'a aucun lien vers les données métier (Epic 7).
export const navigation: Record<Role, NavLink[]> = {
  admin: [
    { label: 'Accueil', href: '/admin' },
    { label: 'Comptes clients', href: '/admin/comptes' },
  ],
  po: businessLinks('/po'),
  client: businessLinks('/client'),
};
