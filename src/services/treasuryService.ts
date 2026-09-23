import { Query, readIsoDate, readSiren, text } from './searchCriteria';
import type { TreasuryFilters, TreasuryRow } from './treasuryRepository';

export type TreasurySortKey = 'siren' | 'montant';
export type SortOrder = 'asc' | 'desc';

export interface TreasurySort {
  key: TreasurySortKey;
  order: SortOrder;
}

// Lit et vérifie les critères saisis dans le formulaire. Renvoie les filtres et les erreurs.
export function parseTreasuryFilters(query: Query): { filters: TreasuryFilters; errors: string[] } {
  const errors: string[] = [];
  const filters: TreasuryFilters = {
    siren: readSiren(query.siren, errors),
    raisonSociale: text(query.raisonSociale) || undefined,
    dateValeur: readIsoDate(query.dateValeur, 'La date de valeur', errors),
  };

  return { filters: withoutEmpty(filters), errors };
}

// Retire les critères non renseignés (valeur « tous »)
export function withoutEmpty<T extends object>(filters: T): T {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as T;
}

export function parseTreasurySort(query: Query): TreasurySort {
  return {
    key: query.tri === 'montant' ? 'montant' : 'siren',
    order: query.ordre === 'desc' ? 'desc' : 'asc',
  };
}

// Tri du tableau (Epic 1, US5) : par N° SIREN ou par montant
export function sortTreasuryRows(rows: TreasuryRow[], { key, order }: TreasurySort): TreasuryRow[] {
  const direction = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const difference =
      key === 'montant' ? a.totalAmount - b.totalAmount : a.siren.localeCompare(b.siren);
    return difference * direction;
  });
}

export function sumTreasury(rows: TreasuryRow[]) {
  return {
    transactionCount: rows.reduce((total, row) => total + row.transactionCount, 0),
    // Arrondi au centime pour éviter les erreurs de virgule flottante
    totalAmount: Math.round(rows.reduce((total, row) => total + row.totalAmount, 0) * 100) / 100,
  };
}
