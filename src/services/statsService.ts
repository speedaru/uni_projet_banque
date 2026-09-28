import { Query, readIsoDate, readSiren, text } from './searchCriteria';
import type { Granularity, MotifSlice, StatsFilters, StatsPoint } from './statsRepository';

// Période du graphique (spécifications, fonction 2.4) : plage de dates, 4 ou 12 mois glissants
export type PeriodChoice = 'plage' | '4mois' | '12mois';
export type ChartType = 'histogramme' | 'courbe';

// Au-delà de cette durée, une plage de dates est affichée par mois plutôt que par jour
const MAX_DAYS_BY_DAY = 62;

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

// Mois glissants : le mois en cours et les (n - 1) mois précédents, en entier
export function rollingMonths(months: number, today: Date): { dateDebut: string; dateFin: string } {
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (months - 1), 1));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
  return { dateDebut: isoDate(start), dateFin: isoDate(end) };
}

export interface StatsCriteria {
  filters: StatsFilters;
  period: PeriodChoice;
  chartType: ChartType;
  errors: string[];
}

// Lit les critères de l'écran statistiques. Par défaut : 4 mois glissants, en histogramme.
export function parseStatsCriteria(query: Query, today = new Date()): StatsCriteria {
  const errors: string[] = [];
  const period: PeriodChoice =
    query.periode === 'plage' || query.periode === '12mois' ? query.periode : '4mois';
  const chartType: ChartType = query.type === 'courbe' ? 'courbe' : 'histogramme';

  let range = rollingMonths(period === '12mois' ? 12 : 4, today);
  let granularity: Granularity = 'month';

  if (period === 'plage') {
    const dateDebut = readIsoDate(query.dateDebut, 'La date de début', errors);
    const dateFin = readIsoDate(query.dateFin, 'La date de fin', errors);
    if (errors.length === 0 && (!dateDebut || !dateFin)) {
      errors.push('Indiquez une date de début et une date de fin.');
    } else if (dateDebut && dateFin && dateDebut > dateFin) {
      errors.push('La date de début doit être antérieure ou égale à la date de fin.');
    }
    if (dateDebut && dateFin) {
      range = { dateDebut, dateFin };
      const days = (Date.parse(dateFin) - Date.parse(dateDebut)) / 86_400_000 + 1;
      granularity = days <= MAX_DAYS_BY_DAY ? 'day' : 'month';
    }
  }

  const filters: StatsFilters = { ...range, granularity };
  const siren = readSiren(query.siren, errors);
  if (siren) {
    filters.siren = siren;
  }
  const raisonSociale = text(query.raisonSociale);
  if (raisonSociale) {
    filters.raisonSociale = raisonSociale;
  }

  return { filters, period, chartType, errors };
}

// Toutes les périodes de la plage, pour que le graphique montre aussi les mois / jours à zéro
export function periodsBetween(dateDebut: string, dateFin: string, granularity: Granularity) {
  const periods: string[] = [];
  const current = new Date(`${dateDebut}T00:00:00Z`);
  const end = new Date(`${dateFin}T00:00:00Z`);
  if (granularity === 'month') {
    current.setUTCDate(1);
  }
  while (current <= end) {
    periods.push(isoDate(current).slice(0, granularity === 'month' ? 7 : 10));
    if (granularity === 'month') {
      current.setUTCMonth(current.getUTCMonth() + 1);
    } else {
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }
  return periods;
}

const MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

// « 2026-06 » → « juin 2026 », « 2026-06-02 » → « 02/06 »
export function periodLabel(period: string): string {
  const [year, month, day] = period.split('-');
  return day ? `${day}/${month}` : `${MONTHS[Number(month) - 1]} ${year}`;
}

const round = (value: number) => Math.round(value * 100) / 100;

// Données prêtes pour Chart.js (servies en JSON à la page des statistiques)
export function buildChartData(filters: StatsFilters, points: StatsPoint[], motifs: MotifSlice[]) {
  const byPeriod = new Map(points.map((point) => [point.period, point]));
  const periods = periodsBetween(filters.dateDebut, filters.dateFin, filters.granularity);
  const series = periods.map((period) => byPeriod.get(period));

  const unpaid = round(points.reduce((total, point) => total + point.unpaidAmount, 0));
  const revenue = round(points.reduce((total, point) => total + point.revenue, 0));

  return {
    labels: periods.map(periodLabel),
    unpaid: series.map((point) => round(point?.unpaidAmount ?? 0)),
    revenue: series.map((point) => round(point?.revenue ?? 0)),
    motifs: motifs.map((motif) => ({ ...motif, amount: round(motif.amount) })),
    totals: {
      unpaid,
      unpaidCount: points.reduce((total, point) => total + point.unpaidCount, 0),
      revenue,
      // Part des impayés dans le chiffre d'affaires, en pourcentage (US2)
      rate: revenue > 0 ? round((unpaid / revenue) * 100) : 0,
    },
  };
}

export type ChartData = ReturnType<typeof buildChartData>;
