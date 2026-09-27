import request from 'supertest';

import { createLoginThrottle, LOCK_DURATION_MS } from '../src/services/loginThrottle';
import { createTestApp, loginAs } from './helpers/testApp';

describe('loginThrottle', () => {
  it('bloque au 3e échec puis débloque après la durée de blocage', () => {
    let now = 0;
    const throttle = createLoginThrottle(() => now);

    throttle.recordFailure('Client');
    throttle.recordFailure('client');
    expect(throttle.remainingLock('client')).toBe(0);

    throttle.recordFailure('CLIENT ');
    expect(throttle.remainingLock('client')).toBe(LOCK_DURATION_MS);

    now = LOCK_DURATION_MS + 1;
    expect(throttle.remainingLock('client')).toBe(0);
  });

  it('remet le compteur à zéro après une connexion réussie', () => {
    const throttle = createLoginThrottle(() => 0);

    throttle.recordFailure('po');
    throttle.recordFailure('po');
    throttle.recordSuccess('po');
    throttle.recordFailure('po');

    expect(throttle.remainingLock('po')).toBe(0);
  });
});

describe('Pages d’erreur et sécurité', () => {
  const { app } = createTestApp();

  it('affiche une page 404 pour une adresse inconnue', async () => {
    const response = await request(app).get('/cette-page-n-existe-pas');

    expect(response.status).toBe(404);
    expect(response.text).toContain('Page introuvable');
    expect(response.text).toContain('href="/connexion"');
  });

  it('propose le retour à l’accueil de son espace sur une 404 une fois connecté', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/inconnu');

    expect(response.status).toBe(404);
    // Apostrophe encodée par EJS dans le HTML
    expect(response.text).toContain('Retour à l&#39;accueil');
    expect(response.text).toContain('class="bouton bouton-principal" href="/po"');
  });

  it('envoie les en-têtes de sécurité et masque Express', async () => {
    const response = await request(app).get('/connexion');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('Accueil et évolution de la trésorerie', () => {
  const { app } = createTestApp();

  it('affiche les indicateurs sur l’accueil du PO', async () => {
    const response = await (await loginAs(app, 'po')).get('/po');

    expect(response.text).toContain("En un coup d'œil");
    expect(response.text).toContain('Solde global');
    expect(response.text).toContain('Comptes en négatif');
    // Solde global de toutes les remises de test : 150,50 + 20 - 220 + 945
    expect(response.text).toContain('895,50 €');
  });

  it('limite les indicateurs du client à son entreprise', async () => {
    const response = await (await loginAs(app, 'client')).get('/client');

    // Remises de Boutique Démo : 150,50 + 20
    expect(response.text).toContain('170,50 €');
    expect(response.text).not.toContain('Comptes en négatif');
  });

  it('n’affiche pas d’indicateurs métier à l’admin', async () => {
    const response = await (await loginAs(app, 'admin')).get('/admin');

    expect(response.text).not.toContain("En un coup d'œil");
  });

  it('branche le graphique d’évolution de la trésorerie (Epic 1, US7)', async () => {
    const response = await (await loginAs(app, 'po')).get('/po/tresorerie?siren=552100554');

    expect(response.text).toContain(
      'data-graphique-tresorerie="/po/statistiques/donnees?periode=4mois&amp;siren=552100554"',
    );
    expect(response.text).toContain('/js/tresorerie.js');
  });
});
