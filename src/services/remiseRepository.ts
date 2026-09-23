// Critères de recherche des remises (Epic 2). Un critère absent = « toutes ».
export interface RemiseFilters {
  siren?: string;
  // Recherche partielle, insensible à la casse
  raisonSociale?: string;
  // Période sur la date de traitement, au format AAAA-MM-JJ (bornes incluses)
  dateDebut?: string;
  dateFin?: string;
  // Recherche partielle sur le numéro de remise (US7)
  numero?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

// Ligne de détail : une transaction de la remise
export interface RemiseTransaction {
  siren: string;
  // Date de vente au format AAAA-MM-JJ
  dateVente: string;
  numeroCarte: string;
  reseau: string;
  numeroAutorisation: string;
  devise: string;
  // Montant signé (négatif pour un impayé)
  montant: number;
}

// Ligne principale du tableau des remises
export interface RemiseRow {
  numero: string;
  siren: string;
  raisonSociale: string;
  // Date de traitement au format AAAA-MM-JJ
  dateTraitement: string;
  devise: string;
  transactionCount: number;
  totalAmount: number;
  transactions: RemiseTransaction[];
}

export interface RemiseSearchResult {
  // Nombre total de remises correspondant aux critères (toutes pages confondues)
  total: number;
  rows: RemiseRow[];
}

// Accès aux remises. Implémentation Prisma dans prismaRemiseRepository.ts,
// version en mémoire dans les tests.
export interface RemiseRepository {
  search(filters: RemiseFilters, pagination: Pagination): Promise<RemiseSearchResult>;
  // Une remise précise avec ses transactions (export du détail)
  findByNumero(numero: string): Promise<RemiseRow | null>;
}
