import request from 'supertest';

import { createTestApp, loginAs } from './helpers/testApp';

// Contrôle d'accès par profil (Epic 7)
describe('Contrôle d’accès', () => {
  const { app } = createTestApp();

  it.each(['/admin', '/admin/comptes', '/po', '/po/remises', '/client', '/client/impayes'])(
    'un visiteur non connecté qui ouvre %s est renvoyé vers la connexion',
    async (url) => {
      const response = await request(app).get(url);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/connexion');
    },
  );

  it.each(['/po', '/po/tresorerie', '/client', '/client/remises'])(
    'l’admin qui tente d’ouvrir %s est renvoyé sur sa page d’admin (TS4)',
    async (url) => {
      const response = await (await loginAs(app, 'admin')).get(url);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin');
    },
  );

  it('le client ne peut pas ouvrir l’espace PO', async () => {
    const response = await (await loginAs(app, 'client')).get('/po/remises');

    expect(response.headers.location).toBe('/client');
  });

  it('le client ne peut pas ouvrir l’espace admin', async () => {
    const response = await (await loginAs(app, 'client')).get('/admin/comptes');

    expect(response.headers.location).toBe('/client');
  });

  it('le PO ne peut pas ouvrir l’espace admin', async () => {
    const response = await (await loginAs(app, 'po')).get('/admin');

    expect(response.headers.location).toBe('/po');
  });

  it('après déconnexion, l’espace n’est plus accessible', async () => {
    const agent = await loginAs(app, 'po');
    await agent.post('/deconnexion');

    expect((await agent.get('/po')).headers.location).toBe('/connexion');
  });
});
