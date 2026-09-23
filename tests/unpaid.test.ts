import { amountBracket, parseUnpaidFilters, parseUnpaidSort } from '../src/services/unpaidService';
import { createTestApp, loginAs } from './helpers/testApp';

// N° de dossier des impayés affichés, dans l'ordre
const dossiersInPage = (html: string) =>
  [...html.matchAll(/<span class="numero-remise">(D\d+)<\/span>/g)].map((match) => match[1]);

describe('unpaidService', () => {
  it('lit les critères, dont le N° de dossier', () => {
    expect(
      parseUnpaidFilters({ siren: '552 100 554', numeroDossier: ' D0001 ', dateFin: '2026-06-30' }),
    ).toEqual({
      filters: { siren: '552100554', numeroDossier: 'D0001', dateFin: '2026-06-30' },
      errors: [],
    });
  });

  it('refuse une période inversée', () => {
    expect(
      parseUnpaidFilters({ dateDebut: '2026-07-01', dateFin: '2026-06-01' }).errors,
    ).toHaveLength(1);
  });

  it('trie par date de remise décroissante par défaut', () => {
    expect(parseUnpaidSort({})).toEqual({ key: 'date', order: 'desc' });
    expect(parseUnpaidSort({ tri: 'montant', ordre: 'desc' })).toEqual({
      key: 'montant',
      order: 'desc',
    });
  });

  it('classe les montants par tranche de 100 € (US4)', () => {
    expect(amountBracket(-45.5)).toBe(0);
    expect(amountBracket(-120)).toBe(1);
    expect(amountBracket(-250)).toBe(2);
    expect(amountBracket(-380)).toBe(3);
    expect(amountBracket(-5000)).toBe(3);
  });
});

describe('Écran « Recherche des impayés »', () => {
  const { app } = createTestApp();

  it('le PO voit tous les impayés, les plus récents d’abord', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/impayes');

    expect(response.status).toBe(200);
    expect(response.text).toContain('4 résultats');
    expect(dossiersInPage(response.text)).toEqual(['D0004', 'D0002', 'D0003', 'D0001']);
    expect(response.text).toContain('opération contestée par le débiteur');
  });

  it('trie par montant croissant puis décroissant (US2)', async () => {
    const agent = await loginAs(app, 'po');

    const asc = await agent.get('/po/impayes?tri=montant&ordre=asc');
    expect(dossiersInPage(asc.text)).toEqual(['D0002', 'D0003', 'D0001', 'D0004']);

    const desc = await agent.get('/po/impayes?tri=montant&ordre=desc');
    expect(dossiersInPage(desc.text)).toEqual(['D0004', 'D0001', 'D0003', 'D0002']);
  });

  it('filtre par période et par N° de dossier', async () => {
    const agent = await loginAs(app, 'po');

    const period = await agent.get('/po/impayes?dateDebut=2026-06-02&dateFin=2026-06-10');
    expect(dossiersInPage(period.text)).toEqual(['D0002', 'D0003', 'D0001']);

    const dossier = await agent.get('/po/impayes?numeroDossier=d0003');
    expect(dossiersInPage(dossier.text)).toEqual(['D0003']);
  });

  it('affiche au PO la somme des impayés par SIREN, triée par SIREN (US3)', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/impayes');
    const summary = response.text.split('Somme des impayés par N° SIREN')[1].split('</table>')[0];

    expect([...summary.matchAll(/<td>(\d{9})<\/td>/g)].map((match) => match[1])).toEqual([
      '123456789',
      '456278556',
      '552100554',
    ]);
    expect(summary).toContain('-295,50');
  });

  it('colore chaque ligne selon sa tranche de montant (US4)', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/impayes');

    expect(response.text).toContain('<tr class="tranche-3">');
    expect(response.text).toContain('<tr class="tranche-0">');
  });

  it('le client ne voit que ses impayés et pas la somme par SIREN', async () => {
    const response = await (
      await loginAs(app, 'client')
    ).get('/client/impayes?siren=552100554&raisonSociale=Garage');

    expect(dossiersInPage(response.text)).toEqual(['D0003']);
    expect(response.text).not.toContain('Garage Leroy');
    expect(response.text).not.toContain('Somme des impayés par N° SIREN');
  });

  it('exporte les impayés en CSV avec titre et date d’extraction', async () => {
    const response = await (
      await loginAs(app, 'po')
    ).get('/po/impayes/export?format=csv&siren=552100554');

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toContain(
      "LISTE DES IMPAYÉS DE L'ENTREPRISE GARAGE LEROY N° SIREN 552 100 554",
    );
    expect(response.text).toMatch(/EXTRAIT DU \d{2}\/\d{2}\/\d{4}/);
    expect(response.text).toContain('D0001;EUR;-250,00;compte à découvert');
    expect(response.text).toContain('Total;;;;;;EUR;-295,50;2 impayé(s)');
  });

  it('l’admin n’a pas accès aux impayés', async () => {
    const response = await (await loginAs(app, 'admin')).get('/client/impayes');

    expect(response.headers.location).toBe('/admin');
  });
});
