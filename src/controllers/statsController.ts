import type { Request, Response } from 'express';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { formatIsoDate } from '../lib/format';
import '../lib/session';
import type { PdfRenderer } from '../services/export/pdfExport';
import { extractionLabel, fileDate, formatSiren, reportTitle } from '../services/export/report';
import type { StatsRepository } from '../services/statsRepository';
import { buildChartData, parseStatsCriteria } from '../services/statsService';

// Scripts intégrés au PDF (la page est rendue par Puppeteer sans accès au serveur) :
// Chart.js et nos fonctions de dessin, communes avec la page web
const scripts = new Map<string, string>();
function readScript(...segments: string[]) {
  const file = path.join(__dirname, '..', '..', ...segments);
  if (!scripts.has(file)) {
    scripts.set(file, readFileSync(file, 'utf8'));
  }
  return scripts.get(file)!;
}

// JSON inséré dans une balise <script> : « < » échappé pour ne jamais fermer la balise
const scriptJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

// Écran « Statistiques » (Epic 4), commun au PO et au Client
export function createStatsController(stats: StatsRepository, renderPdf: PdfRenderer) {
  // Critères + données du graphique, partagés par la page, le JSON et le PDF
  async function load(req: Request) {
    const user = req.session.user!;
    const isClient = user.role === 'client';
    const criteria = parseStatsCriteria(req.query);

    // Le client ne voit que les statistiques de son entreprise (Epic 7)
    if (isClient) {
      criteria.filters.siren = user.siren;
      delete criteria.filters.raisonSociale;
    }

    const canLoad = criteria.errors.length === 0 && (!isClient || user.siren);
    const [points, motifs] = canLoad
      ? await Promise.all([stats.evolution(criteria.filters), stats.byMotif(criteria.filters)])
      : [[], []];
    return { user, isClient, criteria, data: buildChartData(criteria.filters, points, motifs) };
  }

  // Titre du graphique / du PDF, ex. « STATISTIQUES DES IMPAYÉS DE TOUS LES COMPTES CLIENTS DU ... »
  function chartTitle(filters: ReturnType<typeof parseStatsCriteria>['filters']) {
    const subject = filters.siren
      ? `de l'entreprise N° SIREN ${formatSiren(filters.siren)}`
      : filters.raisonSociale
        ? `des comptes clients « ${filters.raisonSociale} »`
        : 'de tous les comptes clients';
    return reportTitle(
      `Statistiques des impayés ${subject} du ${formatIsoDate(filters.dateDebut)} au ${formatIsoDate(filters.dateFin)}`,
    );
  }

  // Paramètres de la page recopiés vers les données JSON et l'export PDF
  function queryString(req: Request, isClient: boolean) {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(req.query)) {
      if (typeof value === 'string' && value && !(isClient && name === 'siren')) {
        params.set(name, value);
      }
    }
    return params.toString();
  }

  return {
    async page(req: Request, res: Response) {
      const { user, isClient, criteria } = await load(req);
      const query = queryString(req, isClient);
      const base = req.baseUrl + req.path;

      res.render('statistiques', {
        titre: 'Statistiques',
        isClient,
        filters: criteria.filters,
        period: criteria.period,
        chartType: criteria.chartType,
        errors: criteria.errors,
        dataUrl: `${base}/donnees?${query}`,
        pdfUrl: `${base}/export?${query}`,
        clientSiren: user.siren ?? '',
      });
    },

    // Données JSON du graphique (seul point d'entrée JSON de l'application, voir CLAUDE.md)
    async data(req: Request, res: Response) {
      const { criteria, data } = await load(req);
      if (criteria.errors.length > 0) {
        return res.status(400).json({ errors: criteria.errors });
      }
      res.json(data);
    },

    // Export PDF des graphiques (Epic 4, US4)
    async export(req: Request, res: Response) {
      const { criteria, data } = await load(req);
      if (criteria.errors.length > 0) {
        return res.status(400).send(criteria.errors[0]);
      }
      const html = await new Promise<string>((resolve, reject) =>
        res.app.render(
          'rapport-graphiques',
          {
            title: chartTitle(criteria.filters),
            extractedAt: extractionLabel(),
            chartType: criteria.chartType,
            dataJson: scriptJson(data),
            data,
            chartScript: readScript('node_modules', 'chart.js', 'dist', 'chart.umd.min.js'),
            graphScript: readScript('public', 'js', 'graphiques.js'),
          },
          (error, rendered) => (error ? reject(error) : resolve(rendered)),
        ),
      );
      res.attachment(`statistiques_${fileDate()}.pdf`);
      res.send(await renderPdf(html, { landscape: true }));
    },
  };
}
