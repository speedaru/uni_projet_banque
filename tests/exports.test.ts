import ExcelJS from 'exceljs';
import type { Response } from 'supertest';

import { toCsv } from '../src/services/export/csvExport';
import {
  extractionLabel,
  formatSiren,
  parseExportFormat,
  Report,
  reportTitle,
} from '../src/services/export/report';
import { remisesReport, treasuryReport } from '../src/services/export/reports';
import { toXlsx } from '../src/services/export/xlsxExport';
import { createTestApp, loginAs } from './helpers/testApp';

const report: Report = {
  fileName: 'test',
  title: 'LISTE DES REMISES',
  extractedAt: 'EXTRAIT DU 07/10/2022',
  columns: [{ label: 'Raison sociale' }, { label: 'Montant', type: 'amount' }],
  rows: [
    ['Fleurs & Co', 1234.5],
    ['Dupont; "SARL"', -45],
  ],
  totals: ['Total', 1189.5],
};

// Supertest : récupère le corps binaire d'un fichier téléchargé
const binary = (res: Response, callback: (error: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

describe('Rapports', () => {
  it('met le titre en majuscules en conservant les accents (US4)', () => {
    expect(reportTitle("Liste des remises de l'entreprise Dupont")).toBe(
      "LISTE DES REMISES DE L'ENTREPRISE DUPONT",
    );
    expect(reportTitle('Détail')).toBe('DÉTAIL');
  });

  it('indique la date d’extraction au format de la spécification (US5)', () => {
    expect(extractionLabel(new Date('2022-10-07T10:00:00Z'))).toBe('EXTRAIT DU 07/10/2022');
  });

  it('formate le SIREN par groupes de 3 chiffres', () => {
    expect(formatSiren('456278556')).toBe('456 278 556');
  });

  it('n’accepte que les formats XLS, CSV et PDF', () => {
    expect(parseExportFormat('pdf')).toBe('pdf');
    expect(parseExportFormat('exe')).toBeUndefined();
  });

  it('titre de l’export trésorerie pour une entreprise et une date', () => {
    const title = treasuryReport({ siren: '456278556', dateValeur: '2026-06-02' }, [
      {
        siren: '456278556',
        raisonSociale: 'Dupont SARL',
        transactionCount: 2,
        devise: 'EUR',
        totalAmount: 10,
      },
    ]).title;

    expect(title).toBe(
      "ANNONCES DE TRÉSORERIE DE L'ENTREPRISE DUPONT SARL N° SIREN 456 278 556 DU 02/06/2026",
    );
  });

  it('titre de l’export des remises sur une période', () => {
    const title = remisesReport({ dateDebut: '2026-06-01', dateFin: '2026-06-30' }, []).title;

    expect(title).toBe('LISTE DES REMISES DE TOUTES LES ENTREPRISES DU 01/06/2026 AU 30/06/2026');
  });
});

describe('Export CSV', () => {
  const csv = toCsv(report).toString('utf8');

  it('commence par un BOM UTF-8 pour Excel', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('contient le titre, la date d’extraction et le tableau', () => {
    const lines = csv.slice(1).split('\r\n');

    expect(lines[0]).toBe('LISTE DES REMISES');
    expect(lines[1]).toBe('EXTRAIT DU 07/10/2022');
    expect(lines[3]).toBe('Raison sociale;Montant');
    expect(lines[4]).toBe('Fleurs & Co;1234,50');
  });

  it('échappe les séparateurs et les guillemets', () => {
    expect(csv).toContain('"Dupont; ""SARL""";-45,00');
  });

  it('ajoute la ligne de total', () => {
    expect(csv).toContain('Total;1189,50');
  });
});

describe('Export XLS', () => {
  it('produit un classeur Excel avec titre, date et montants numériques', async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await toXlsx(report)) as unknown as ExcelJS.Buffer);
    const sheet = workbook.getWorksheet('Rapport')!;

    expect(sheet.getCell('A1').value).toBe('LISTE DES REMISES');
    expect(sheet.getCell('A2').value).toBe('EXTRAIT DU 07/10/2022');
    expect(sheet.getCell('A4').value).toBe('Raison sociale');
    expect(sheet.getCell('B5').value).toBe(1234.5);
    expect(sheet.getCell('B5').numFmt).toBe('#,##0.00');
    // Montant négatif en rouge
    expect(sheet.getCell('B6').font?.color?.argb).toBe('FFD92D20');
    expect(sheet.getCell('A7').value).toBe('Total');
  });
});

describe('Téléchargement des exports', () => {
  const { app } = createTestApp();

  it('exporte la trésorerie en CSV', async () => {
    const response = await (
      await loginAs(app, 'po')
    ).get('/po/tresorerie/export?format=csv&siren=552100554');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toMatch(
      /attachment; filename="tresorerie_.*\.csv"/,
    );
    expect(response.text).toContain("ANNONCES DE TRÉSORERIE DE L'ENTREPRISE GARAGE LEROY");
    expect(response.text).toMatch(/EXTRAIT DU \d{2}\/\d{2}\/\d{4}/);
    expect(response.text).toContain('552100554;Garage Leroy;2;EUR;-220,00');
  });

  it('exporte la trésorerie en XLS (classeur Excel)', async () => {
    const response = await (
      await loginAs(app, 'po')
    )
      .get('/po/tresorerie/export?format=xls')
      .buffer(true)
      .parse(binary);

    expect(response.headers['content-type']).toContain('spreadsheetml');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body);
    expect(workbook.getWorksheet('Rapport')!.getCell('A1').value).toBe(
      'ANNONCES DE TRÉSORERIE DE TOUS LES COMPTES CLIENTS — SOLDE GLOBAL',
    );
  });

  it('exporte toutes les remises en PDF, en paysage', async () => {
    const response = await (
      await loginAs(app, 'po')
    )
      .get('/po/remises/export?format=pdf&lignes=10')
      .buffer(true)
      .parse(binary);
    const content = response.body.toString('utf8');

    expect(response.headers['content-type']).toContain('application/pdf');
    expect(content).toContain('landscape=true');
    expect(content).toContain('LISTE DES REMISES DE TOUTES LES ENTREPRISES');
    for (const numero of ['R000001', 'R000002', 'R000003', 'R000004']) {
      expect(content).toContain(numero);
    }
  });

  it('exporte le détail d’une remise', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/remises/R000003/export?format=csv');

    expect(response.text).toContain(
      "DÉTAIL DES TRANSACTIONS DE LA REMISE R000003 DE L'ENTREPRISE GARAGE LEROY N° SIREN 552 100 554",
    );
    expect(response.text).toContain('49701*******0001');
    expect(response.text).toContain('Total;;;;;EUR;-220,00;-');
  });

  it('refuse un format inconnu', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/tresorerie/export?format=doc');

    expect(response.status).toBe(400);
  });

  it('le client n’exporte que ses propres données (Epic 7)', async () => {
    const response = await (
      await loginAs(app, 'client')
    ).get('/client/remises/export?format=csv&siren=552100554');

    expect(response.text).toContain('R000001');
    expect(response.text).not.toContain('Garage Leroy');
  });

  it('le client ne peut pas exporter le détail d’une remise d’une autre entreprise', async () => {
    const response = await (
      await loginAs(app, 'client')
    ).get('/client/remises/R000003/export?format=csv');

    expect(response.status).toBe(404);
  });

  it('les écrans proposent le choix du format par boutons radio', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/remises');

    expect(response.text).toContain('action="/po/remises/export"');
    expect(response.text).toContain('action="/po/remises/R000001/export"');
    expect(response.text).toMatch(/type="radio"[^>]*value="xls"/);
    expect(response.text).toMatch(/type="radio"[^>]*value="csv"/);
    expect(response.text).toMatch(/type="radio"[^>]*value="pdf"/);
  });
});
