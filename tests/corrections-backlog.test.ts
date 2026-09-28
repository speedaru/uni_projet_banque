import { MOTIFS_IMPAYES } from '../src/lib/motifs';
import { companySubject, remisesReport } from '../src/services/export/reports';
import { parseUnpaidFilters } from '../src/services/unpaidService';
import { createTestApp, loginAs } from './helpers/testApp';

const dossiersInPage = (html: string) =>
  [...html.matchAll(/<span class="numero-remise">(D\d+)<\/span>/g)].map((match) => match[1]);

describe('Epic 4 US5 : liste des impayés par motif', () => {
  const { app } = createTestApp();

  it('reprend les 8 motifs du backlog', () => {
    expect(MOTIFS_IMPAYES.map((motif) => motif.code)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
    ]);
  });

  it('lit le motif et refuse un code inconnu', () => {
    expect(parseUnpaidFilters({ motifCode: '05' }).filters.motifCode).toBe('05');
    expect(parseUnpaidFilters({ motifCode: '99' }).errors).toEqual([
      "Le motif d'impayé est inconnu.",
    ]);
  });

  it('propose le filtre « Motif » avec les 8 motifs', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/impayes');

    expect(response.text).toContain('name="motifCode"');
    expect(response.text).toContain('08 — raison non communiquée, contactez la banque du client');
  });

  it('liste les impayés d’un seul motif, sur tous les comptes, pour le PO', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/impayes?motifCode=02');

    expect(dossiersInPage(response.text)).toEqual(['D0001']);
    expect(response.text).toContain('value="02" selected');
  });

  it('relie le camembert des statistiques à la liste des impayés de la période', async () => {
    const response = await (
      await loginAs(app, 'po')
    ).get('/po/statistiques?periode=plage&dateDebut=2026-05-01&dateFin=2026-08-31');

    expect(response.text).toContain(
      'data-liste-impayes="/po/impayes?dateDebut=2026-05-01&amp;dateFin=2026-08-31"',
    );
  });

  it('indique le motif dans le titre de l’export', async () => {
    const response = await (
      await loginAs(app, 'po')
    ).get('/po/impayes/export?format=csv&motifCode=06');

    expect(response.text).toContain('MOTIF 06 : OPÉRATION CONTESTÉE PAR LE DÉBITEUR');
    expect(response.text).toContain('D0004');
    expect(response.text).not.toContain('D0001');
  });
});

describe('Epic 5 US4 : SIREN dans le titre dès qu’une seule entreprise est concernée', () => {
  const { app } = createTestApp();

  it('utilise l’entreprise quand toutes les lignes ont le même SIREN', () => {
    const rows = [
      { siren: '456278556', raisonSociale: 'Dupont SARL' },
      { siren: '456278556', raisonSociale: 'Dupont SARL' },
    ];

    expect(companySubject(undefined, rows, 'de toutes les entreprises')).toBe(
      "de l'entreprise Dupont SARL N° SIREN 456 278 556",
    );
    expect(companySubject(undefined, [...rows, { siren: '1', raisonSociale: 'X' }], 'toutes')).toBe(
      'toutes',
    );
  });

  it('titre du rapport des remises filtré par raison sociale seulement', async () => {
    const response = await (
      await loginAs(app, 'po')
    ).get('/po/remises/export?format=csv&raisonSociale=dupont');

    expect(response.text).toContain(
      "LISTE DES REMISES DE L'ENTREPRISE DUPONT SARL N° SIREN 456 278 556",
    );
  });

  it('reste générique quand plusieurs entreprises correspondent', () => {
    const remise = (siren: string, raisonSociale: string) => ({
      numero: `R${siren}`,
      siren,
      raisonSociale,
      dateTraitement: '2026-06-02',
      devise: 'EUR',
      transactionCount: 0,
      totalAmount: 0,
      transactions: [],
    });
    const title = remisesReport({ raisonSociale: 'a' }, [remise('1', 'A'), remise('2', 'B')]).title;

    expect(title).toBe('LISTE DES REMISES DES ENTREPRISES « A »');
  });
});

describe('Export de la somme des impayés par SIREN', () => {
  const { app } = createTestApp();

  it('propose l’export sur la synthèse du PO', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/impayes');

    expect(response.text).toContain('action="/po/impayes/synthese/export"');
  });

  it('exporte la synthèse avec titre, date et total', async () => {
    const response = await (
      await loginAs(app, 'po')
    ).get('/po/impayes/synthese/export?format=csv&dateDebut=2026-06-01&dateFin=2026-06-30');

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toContain('SOMME DES IMPAYÉS PAR N° SIREN DU 01/06/2026 AU 30/06/2026');
    expect(response.text).toMatch(/EXTRAIT DU \d{2}\/\d{2}\/\d{4}/);
    expect(response.text).toContain('552100554;Garage Leroy;2;-295,50');
    expect(response.text).toContain('Total;;3;-415,50');
  });

  it('refuse cet export au client', async () => {
    const response = await (
      await loginAs(app, 'client')
    ).get('/client/impayes/synthese/export?format=csv');

    expect(response.status).toBe(403);
  });
});
