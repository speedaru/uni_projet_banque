import type { Pagination, RemiseFilters } from './remiseRepository';
import { Query, readIsoDate, readSiren, text } from './searchCriteria';
import { withoutEmpty } from './treasuryService';

// Choix proposés pour le nombre de lignes par page (Epic 2, US1)
export const PAGE_SIZES = [10, 25, 50];
const DEFAULT_PAGE_SIZE = 10;
// Nombre maximal de remises dans un export (toutes pages confondues)
export const EXPORT_MAX_ROWS = 5000;

// Lit et vérifie les critères de recherche des remises. Renvoie les filtres et les erreurs.
export function parseRemiseFilters(query: Query): { filters: RemiseFilters; errors: string[] } {
  const errors: string[] = [];
  const filters: RemiseFilters = {
    siren: readSiren(query.siren, errors),
    raisonSociale: text(query.raisonSociale) || undefined,
    dateDebut: readIsoDate(query.dateDebut, 'La date de début', errors),
    dateFin: readIsoDate(query.dateFin, 'La date de fin', errors),
    numero: text(query.numero) || undefined,
  };

  if (filters.dateDebut && filters.dateFin && filters.dateDebut > filters.dateFin) {
    errors.push('La date de début doit être antérieure ou égale à la date de fin.');
  }

  return { filters: withoutEmpty(filters), errors };
}

export function parsePagination(query: Query): Pagination {
  const pageSize = Number(query.lignes);
  const page = Number(query.page);
  return {
    pageSize: PAGE_SIZES.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
