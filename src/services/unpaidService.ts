import { Query, readIsoDate, readSiren, text } from './searchCriteria';
import { withoutEmpty } from './treasuryService';
import type { UnpaidFilters, UnpaidSort } from './unpaidRepository';

// Lit et vérifie les critères de recherche des impayés. Renvoie les filtres et les erreurs.
export function parseUnpaidFilters(query: Query): { filters: UnpaidFilters; errors: string[] } {
  const errors: string[] = [];
  const filters: UnpaidFilters = {
    siren: readSiren(query.siren, errors),
    raisonSociale: text(query.raisonSociale) || undefined,
    dateDebut: readIsoDate(query.dateDebut, 'La date de début', errors),
    dateFin: readIsoDate(query.dateFin, 'La date de fin', errors),
    numeroDossier: text(query.numeroDossier) || undefined,
  };

  if (filters.dateDebut && filters.dateFin && filters.dateDebut > filters.dateFin) {
    errors.push('La date de début doit être antérieure ou égale à la date de fin.');
  }

  return { filters: withoutEmpty(filters), errors };
}

// Tri par défaut : les impayés les plus récents d'abord
export function parseUnpaidSort(query: Query): UnpaidSort {
  if (query.tri === 'montant') {
    return { key: 'montant', order: query.ordre === 'desc' ? 'desc' : 'asc' };
  }
  return { key: 'date', order: query.ordre === 'asc' ? 'asc' : 'desc' };
}

// Tranche de montant par pas de 100 € (Epic 3, US4) : 0 = moins de 100 €, ..., 3 = 300 € et plus
export function amountBracket(amount: number): number {
  return Math.min(Math.floor(Math.abs(amount) / 100), 3);
}

export const AMOUNT_BRACKETS = ['Moins de 100 €', '100 à 199 €', '200 à 299 €', '300 € et plus'];
