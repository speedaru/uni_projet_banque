import type { Pagination } from './remiseRepository';

// Critères de recherche des impayés (Epic 3). Un critère absent = « tous ».
export interface UnpaidFilters {
  siren?: string;
  // Recherche partielle, insensible à la casse
  raisonSociale?: string;
  // Période sur la date de remise, au format AAAA-MM-JJ (bornes incluses)
  dateDebut?: string;
  dateFin?: string;
  // Recherche partielle sur le N° de dossier impayé
  numeroDossier?: string;
  // Code du motif d'impayé (01 à 08) : liste des impayés d'un motif (Epic 4, US5)
  motifCode?: string;
}

// Tri des impayés (US2) : par date de remise (défaut) ou par montant de l'impayé.
// Pour le montant, « croissant » = du plus petit impayé au plus gros (en valeur absolue).
export interface UnpaidSort {
  key: 'date' | 'montant';
  order: 'asc' | 'desc';
}

export interface UnpaidRow {
  siren: string;
  raisonSociale: string;
  // Dates au format AAAA-MM-JJ
  dateVente: string;
  dateRemise: string;
  numeroCarte: string;
  reseau: string;
  numeroDossier: string;
  devise: string;
  // Montant négatif (signe -)
  montant: number;
  motifCode: string;
  libelle: string;
}

export interface UnpaidSearchResult {
  // Nombre d'impayés et montant cumulé pour les critères (toutes pages confondues)
  total: number;
  totalAmount: number;
  rows: UnpaidRow[];
}

// Somme des impayés d'une entreprise (US3, écran du PO)
export interface UnpaidSummaryRow {
  siren: string;
  raisonSociale: string;
  count: number;
  totalAmount: number;
}

// Accès aux impayés. Implémentation Prisma dans prismaUnpaidRepository.ts,
// version en mémoire dans les tests.
export interface UnpaidRepository {
  search(
    filters: UnpaidFilters,
    sort: UnpaidSort,
    pagination: Pagination,
  ): Promise<UnpaidSearchResult>;
  // Somme des impayés par SIREN, triée par SIREN
  summaryBySiren(filters: UnpaidFilters): Promise<UnpaidSummaryRow[]>;
}
