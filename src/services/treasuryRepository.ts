// Critères de sélection des annonces de trésorerie (Epic 1). Un critère absent = « tous ».
export interface TreasuryFilters {
  siren?: string;
  // Recherche partielle, insensible à la casse
  raisonSociale?: string;
  // Date de valeur au format AAAA-MM-JJ ; absente = solde global toutes dates confondues
  dateValeur?: string;
}

// Une ligne du tableau : le cumul des remises d'une entreprise
export interface TreasuryRow {
  siren: string;
  raisonSociale: string;
  transactionCount: number;
  devise: string;
  totalAmount: number;
}

// Accès aux données de trésorerie. Implémentation Prisma dans prismaTreasuryRepository.ts,
// version en mémoire dans les tests.
export interface TreasuryRepository {
  findAnnouncements(filters: TreasuryFilters): Promise<TreasuryRow[]>;
}
