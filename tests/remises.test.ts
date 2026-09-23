import { pageCount, parsePagination, parseRemiseFilters } from '../src/services/remiseService';
import { createTestApp, loginAs } from './helpers/testApp';

// Numéros des remises affichées (lignes principales), dans l'ordre
const remisesInPage = (html: string) =>
  [...html.matchAll(/<span class="numero-remise">(R\d+)<\/span>/g)].map((match) => match[1]);

describe('remiseService', () => {
  it('lit tous les critères', () => {
    const { filters, errors } = parseRemiseFilters({
      siren: '123 456 789',
      raisonSociale: ' Boutique ',
      dateDebut: '2026-06-01',
      dateFin: '2026-06-30',
      numero: 'R0001',
    });

    expect(errors).toEqual([]);
    expect(filters).toEqual({
      siren: '123456789',
      raisonSociale: 'Boutique',
      dateDebut: '2026-06-01',
      dateFin: '2026-06-30',
      numero: 'R0001',
    });
  });

  it('refuse une date de début postérieure à la date de fin', () => {
    const { errors } = parseRemiseFilters({ dateDebut: '2026-07-01', dateFin: '2026-06-01' });

    expect(errors).toEqual(['La date de début doit être antérieure ou égale à la date de fin.']);
  });

  it('refuse une date invalide', () => {
    expect(parseRemiseFilters({ dateFin: 'demain' }).errors).toEqual([
      'La date de fin est invalide.',
    ]);
  });

  it('limite le nombre de lignes par page aux valeurs proposées', () => {
    expect(parsePagination({ lignes: '25', page: '3' })).toEqual({ pageSize: 25, page: 3 });
    expect(parsePagination({ lignes: '1000', page: '-2' })).toEqual({ pageSize: 10, page: 1 });
  });

  it('calcule le nombre de pages', () => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(52, 25)).toBe(3);
  });
});

describe('Écran « Recherche de remises »', () => {
  const { app } = createTestApp();

  it('le PO voit toutes les remises avec le nombre de résultats', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/remises');

    expect(response.status).toBe(200);
    expect(response.text).toContain('4 résultats');
    expect(remisesInPage(response.text)).toEqual(['R000004', 'R000002', 'R000003', 'R000001']);
  });

  it('affiche le détail des transactions de chaque remise', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/remises?numero=R000003');

    expect(response.text).toContain('Transactions de la remise R000003');
    expect(response.text).toContain('49701*******0001');
    expect(response.text).toContain('bouton-deplier');
  });

  it('recherche par numéro de remise (US7)', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/remises?numero=r000002');

    expect(remisesInPage(response.text)).toEqual(['R000002']);
    expect(response.text).toContain('1 résultat');
  });

  it('filtre sur une période', async () => {
    const response = await (
      await loginAs(app, 'po')
    ).get('/po/remises?dateDebut=2026-06-02&dateFin=2026-06-02');

    expect(remisesInPage(response.text)).toEqual(['R000003', 'R000001']);
  });

  it('affiche en rouge une remise au montant négatif (US6)', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/remises?numero=R000003');

    expect(response.text).toMatch(/class="nombre negatif">-220,00/);
    expect(response.text).toContain('sens-debit');
  });

  it('pagine les résultats', async () => {
    const agent = await loginAs(app, 'po');

    const page1 = await agent.get('/po/remises?lignes=10&page=1');
    expect(page1.text).not.toContain('Page <strong>');

    // Avec 4 remises, il faudrait 10 lignes par page minimum : on vérifie la page 2 vide
    const page2 = await agent.get('/po/remises?lignes=10&page=2');
    expect(remisesInPage(page2.text)).toEqual([]);
    expect(page2.text).toContain('4 résultats');
  });

  it('le client ne voit que ses remises, même en changeant l’URL (Epic 7)', async () => {
    const response = await (
      await loginAs(app, 'client')
    ).get('/client/remises?siren=552100554&raisonSociale=Garage');

    expect(remisesInPage(response.text)).toEqual(['R000002', 'R000001']);
    expect(response.text).not.toContain('Garage Leroy');
  });

  it('affiche une erreur pour des critères invalides', async () => {
    const response = await (
      await loginAs(app, 'po')
    ).get('/po/remises?dateDebut=2026-07-01&dateFin=2026-06-01');

    expect(response.text).toContain('antérieure ou égale');
    expect(remisesInPage(response.text)).toEqual([]);
  });

  it('l’admin n’a pas accès aux remises', async () => {
    const response = await (await loginAs(app, 'admin')).get('/po/remises');

    expect(response.headers.location).toBe('/admin');
  });
});
