import { formatAmount, formatIsoDate } from '../src/lib/format';
import {
  parseTreasuryFilters,
  parseTreasurySort,
  sortTreasuryRows,
  sumTreasury,
} from '../src/services/treasuryService';
import { createTestApp, loginAs } from './helpers/testApp';

const rows = [
  { siren: '552100554', raisonSociale: 'B', transactionCount: 2, devise: 'EUR', totalAmount: -220 },
  {
    siren: '123456789',
    raisonSociale: 'A',
    transactionCount: 3,
    devise: 'EUR',
    totalAmount: 170.5,
  },
  { siren: '456278556', raisonSociale: 'C', transactionCount: 2, devise: 'EUR', totalAmount: 945 },
];

// Extrait les SIREN du tableau HTML, dans l'ordre d'affichage
const sirensInPage = (html: string) =>
  [...html.matchAll(/<td>(\d{9})<\/td>/g)].map((match) => match[1]);

describe('treasuryService', () => {
  it('accepte un SIREN saisi avec des espaces', () => {
    expect(parseTreasuryFilters({ siren: '456 278 556' }).filters.siren).toBe('456278556');
  });

  it('refuse un SIREN invalide et une date invalide', () => {
    const { errors } = parseTreasuryFilters({ siren: '12345', dateValeur: '02/06/2026' });

    expect(errors).toHaveLength(2);
  });

  it('ignore les critères vides (valeur « tous »)', () => {
    expect(parseTreasuryFilters({ siren: '', raisonSociale: ' ', dateValeur: '' })).toEqual({
      filters: {},
      errors: [],
    });
  });

  it('trie par SIREN croissant par défaut', () => {
    const sorted = sortTreasuryRows(rows, parseTreasurySort({}));

    expect(sorted.map((row) => row.siren)).toEqual(['123456789', '456278556', '552100554']);
  });

  it('trie par montant décroissant', () => {
    const sorted = sortTreasuryRows(rows, parseTreasurySort({ tri: 'montant', ordre: 'desc' }));

    expect(sorted.map((row) => row.totalAmount)).toEqual([945, 170.5, -220]);
  });

  it('calcule les totaux', () => {
    expect(sumTreasury(rows)).toEqual({ transactionCount: 7, totalAmount: 895.5 });
  });

  it('formate les montants et les dates à la française', () => {
    expect(formatAmount(-1234.5).replace(/\s/g, ' ')).toBe('-1 234,50');
    expect(formatIsoDate('2026-06-02')).toBe('02/06/2026');
  });
});

describe('Écran « Annonces de trésorerie »', () => {
  const { app } = createTestApp();

  it('le PO voit tous les comptes clients', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/tresorerie');

    expect(response.status).toBe(200);
    expect(sirensInPage(response.text)).toEqual(['123456789', '456278556', '552100554']);
    expect(response.text).toContain('3 comptes');
    expect(response.text).toContain('Solde global');
  });

  it('le PO filtre par SIREN', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/tresorerie?siren=456278556');

    expect(sirensInPage(response.text)).toEqual(['456278556']);
  });

  it('le PO filtre par raison sociale (recherche partielle)', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/tresorerie?raisonSociale=garage');

    expect(sirensInPage(response.text)).toEqual(['552100554']);
  });

  it('le PO filtre par date de valeur', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/tresorerie?dateValeur=2026-06-02');

    expect(sirensInPage(response.text)).toEqual(['123456789', '552100554']);
    expect(response.text).toContain('Annonces du 02/06/2026');
  });

  it('affiche en rouge un solde négatif', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/tresorerie?siren=552100554');

    expect(response.text).toMatch(/class="nombre negatif">-220,00/);
  });

  it('trie par montant décroissant', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/tresorerie?tri=montant&ordre=desc');

    expect(sirensInPage(response.text)).toEqual(['456278556', '123456789', '552100554']);
  });

  it('affiche une erreur pour un SIREN invalide', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/tresorerie?siren=abc');

    expect(response.text).toContain('9 chiffres');
    expect(sirensInPage(response.text)).toEqual([]);
  });

  it('le client ne voit que son entreprise', async () => {
    const response = await (await loginAs(app, 'client')).get('/client/tresorerie');

    expect(sirensInPage(response.text)).toEqual(['123456789']);
    expect(response.text).toContain('Boutique Démo');
  });

  it('le client ne peut pas voir une autre entreprise en changeant l’URL (Epic 7)', async () => {
    const response = await (
      await loginAs(app, 'client')
    ).get('/client/tresorerie?siren=552100554&raisonSociale=Garage');

    expect(sirensInPage(response.text)).toEqual(['123456789']);
    expect(response.text).not.toContain('Garage Leroy');
  });

  it('l’admin n’a pas accès à la trésorerie', async () => {
    const response = await (await loginAs(app, 'admin')).get('/po/tresorerie');

    expect(response.headers.location).toBe('/admin');
  });
});
