// Statistiques d'évolution des impayés (Epic 4)

// Regroupement des points du graphique : par jour (plage courte) ou par mois
export type Granularity = 'day' | 'month';

export interface StatsFilters {
  siren?: string;
  raisonSociale?: string;
  // Période sur la date de remise (date de valeur), au format AAAA-MM-JJ, bornes incluses
  dateDebut: string;
  dateFin: string;
  granularity: Granularity;
}

// Un point du graphique d'évolution
export interface StatsPoint {
  // « AAAA-MM » (mois) ou « AAAA-MM-JJ » (jour)
  period: string;
  // Montant des impayés, en valeur positive
  unpaidAmount: number;
  unpaidCount: number;
  // Chiffre d'affaires : somme des paiements acceptés (US2)
  revenue: number;
}

// Part d'un motif dans les impayés (camembert, US3 / US5)
export interface MotifSlice {
  code: string;
  libelle: string;
  count: number;
  // Montant en valeur positive
  amount: number;
}

// Accès aux statistiques. Implémentation Prisma dans prismaStatsRepository.ts,
// version en mémoire dans les tests.
export interface StatsRepository {
  // Points de la période ; les périodes sans activité peuvent être absentes
  evolution(filters: StatsFilters): Promise<StatsPoint[]>;
  // Motifs d'impayés triés par montant décroissant
  byMotif(filters: StatsFilters): Promise<MotifSlice[]>;
}
