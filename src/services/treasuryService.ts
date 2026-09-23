import type { TreasuryFilters, TreasuryRow } from './treasuryRepository';

export type TreasurySortKey = 'siren' | 'montant';
export type SortOrder = 'asc' | 'desc';

export interface TreasurySort {
  key: TreasurySortKey;
  order: SortOrder;
}

type Query = Record<string, unknown>;

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

// Lit et vérifie les critères saisis dans le formulaire. Renvoie les filtres et les erreurs.
export function parseTreasuryFilters(query: Query): { filters: TreasuryFilters; errors: string[] } {
  const errors: string[] = [];
  const filters: TreasuryFilters = {};

  // On accepte un SIREN saisi avec des espaces (ex. « 456 278 556 »)
  const siren = text(query.siren).replace(/\s/g, '');
  if (siren) {
    if (/^\d{9}$/.test(siren)) {
      filters.siren = siren;
    } else {
      errors.push('Le N° de SIREN doit contenir exactement 9 chiffres.');
    }
  }

  const raisonSociale = text(query.raisonSociale);
  if (raisonSociale) {
    filters.raisonSociale = raisonSociale;
  }

  const dateValeur = text(query.dateValeur);
  if (dateValeur) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValeur) && !isNaN(Date.parse(dateValeur))) {
      filters.dateValeur = dateValeur;
    } else {
      errors.push('La date de valeur est invalide.');
    }
  }

  return { filters, errors };
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
