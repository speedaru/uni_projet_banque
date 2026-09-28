import {
  buildChartData,
  parseStatsCriteria,
  periodLabel,
  periodsBetween,
  rollingMonths,
} from '../src/services/statsService';
import { createTestApp, loginAs } from './helpers/testApp';

const today = new Date('2026-09-23T10:00:00Z');

describe('statsService', () => {
  it('calcule 4 et 12 mois glissants (mois en cours inclus)', () => {
    expect(rollingMonths(4, today)).toEqual({ dateDebut: '2026-06-01', dateFin: '2026-09-30' });
    expect(rollingMonths(12, today)).toEqual({ dateDebut: '2025-10-01', dateFin: '2026-09-30' });
  });

  it('utilise par défaut 4 mois glissants en histogramme, par mois', () => {
    const { filters, period, chartType, errors } = parseStatsCriteria({}, today);

    expect(errors).toEqual([]);
    expect(period).toBe('4mois');
    expect(chartType).toBe('histogramme');
    expect(filters).toEqual({
      dateDebut: '2026-06-01',
      dateFin: '2026-09-30',
      granularity: 'month',
    });
  });

  it('affiche une plage courte par jour et une plage longue par mois', () => {
    const short = parseStatsCriteria(
      { periode: 'plage', dateDebut: '2026-06-01', dateFin: '2026-06-30' },
      today,
    );
    const long = parseStatsCriteria(
      { periode: 'plage', dateDebut: '2026-01-01', dateFin: '2026-06-30' },
      today,
    );

    expect(short.filters.granularity).toBe('day');
    expect(long.filters.granularity).toBe('month');
  });

  it('exige les deux dates pour une plage', () => {
    expect(parseStatsCriteria({ periode: 'plage', dateDebut: '2026-06-01' }, today).errors).toEqual(
      ['Indiquez une date de début et une date de fin.'],
    );
  });

  it('liste toutes les périodes, même sans activité', () => {
    expect(periodsBetween('2026-06-15', '2026-09-02', 'month')).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
    expect(periodsBetween('2026-06-29', '2026-07-01', 'day')).toEqual([
      '2026-06-29',
      '2026-06-30',
      '2026-07-01',
    ]);
  });

  it('libelle les mois et les jours en français', () => {
    expect(periodLabel('2026-08')).toBe('août 2026');
    expect(periodLabel('2026-06-02')).toBe('02/06');
  });

  it('prépare les séries du graphique et le taux d’impayés', () => {
    const data = buildChartData(
      { dateDebut: '2026-06-01', dateFin: '2026-07-31', granularity: 'month' },
      [{ period: '2026-07', unpaidAmount: 50, unpaidCount: 2, revenue: 1000 }],
      [],
    );

    expect(data.labels).toEqual(['juin 2026', 'juil. 2026']);
    expect(data.unpaid).toEqual([0, 50]);
    expect(data.revenue).toEqual([0, 1000]);
    expect(data.totals).toEqual({ unpaid: 50, unpaidCount: 2, revenue: 1000, rate: 5 });
  });
});

describe('Écran « Statistiques »', () => {
  const { app } = createTestApp();
  // Plage de 4 mois : affichée par mois (au-delà de 62 jours)
  const periode = 'periode=plage&dateDebut=2026-05-01&dateFin=2026-08-31';

  it('affiche la page avec les choix de période et de type de graphique', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/statistiques');

    expect(response.status).toBe(200);
    expect(response.text).toContain('value="4mois" checked');
    expect(response.text).toContain('value="courbe"');
    expect(response.text).toContain('/vendor/chart.js/chart.umd.min.js');
    expect(response.text).toContain('data-donnees="/po/statistiques/donnees?');
  });

  it('fournit les données du graphique en JSON', async () => {
    const response = await (await loginAs(app, 'po')).get(`/po/statistiques/donnees?${periode}`);

    expect(response.status).toBe(200);
    expect(response.body.labels).toEqual(['mai 2026', 'juin 2026', 'juil. 2026', 'août 2026']);
    // Impayés : D0001 (250) + D0002 (45,50) + D0003 (120) en juin, D0004 (380) en juillet
    expect(response.body.unpaid).toEqual([0, 415.5, 380, 0]);
    expect(response.body.totals.unpaidCount).toBe(4);
    // Camembert trié par montant décroissant
    expect(response.body.motifs.map((motif: { code: string }) => motif.code)).toEqual([
      '06',
      '02',
      '01',
      '05',
    ]);
  });

  it('le client n’obtient que les statistiques de son entreprise (Epic 7)', async () => {
    const response = await (
      await loginAs(app, 'client')
    ).get(`/client/statistiques/donnees?${periode}&siren=552100554`);

    expect(response.body.unpaid).toEqual([0, 120, 0, 0]);
    expect(response.body.motifs).toHaveLength(1);
  });

  it('refuse une plage de dates incomplète', async () => {
    const response = await (
      await loginAs(app, 'po')
    ).get('/po/statistiques/donnees?periode=plage&dateDebut=2026-06-01');

    expect(response.status).toBe(400);
  });

  it('exporte les graphiques en PDF avec titre et date d’extraction (US4)', async () => {
    const response = await (
      await loginAs(app, 'po')
    )
      .get(`/po/statistiques/export?${periode}&type=courbe`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.headers['content-type']).toContain('application/pdf');
    const content = (response.body as Buffer).toString('utf8');
    expect(content).toContain('landscape=true');
    expect(content).toContain(
      'STATISTIQUES DES IMPAYÉS DE TOUS LES COMPTES CLIENTS DU 01/05/2026 AU 31/08/2026',
    );
    expect(content).toMatch(/EXTRAIT DU \d{2}\/\d{2}\/\d{4}/);
    expect(content).toContain("'courbe'");
    expect(content).toContain('opération contestée par le débiteur');
  });

  it('l’admin n’a pas accès aux statistiques', async () => {
    const response = await (await loginAs(app, 'admin')).get('/po/statistiques');

    expect(response.headers.location).toBe('/admin');
  });
});
