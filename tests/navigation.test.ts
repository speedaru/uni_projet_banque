import request from 'supertest';

import { createApp } from '../src/app';
import { navigation } from '../src/lib/navigation';

describe('Espaces par rôle', () => {
  const app = createApp();

  it.each([
    ['/admin', 'Espace Administrateur'],
    ['/po', 'Espace Product Owner'],
    ['/client', 'Espace Client'],
  ])('GET %s affiche la page d’accueil de l’espace', async (url, titre) => {
    const response = await request(app).get(url);

    expect(response.status).toBe(200);
    expect(response.text).toContain(titre);
  });

  it('affiche tous les liens du menu de l’espace', async () => {
    const response = await request(app).get('/po');

    for (const link of navigation.po) {
      expect(response.text).toContain(`href="${link.href}"`);
    }
  });

  it('marque la page courante dans le menu', async () => {
    const response = await request(app).get('/client/remises');

    expect(response.text).toMatch(/href="\/client\/remises"\s+aria-current="page"/);
  });

  it('ne propose aucun écran métier dans le menu admin (Epic 7)', async () => {
    const response = await request(app).get('/admin');

    expect(response.text).not.toMatch(/tresorerie|remises|impayes|statistiques/);
  });

  it('ne mélange pas les menus des espaces PO et Client', async () => {
    const response = await request(app).get('/client');

    expect(response.text).not.toContain('href="/po');
    expect(response.text).not.toContain('href="/admin');
  });

  it.each(Object.values(navigation).flatMap((links) => links.slice(1).map((link) => link.href)))(
    'GET %s affiche une page « à venir »',
    async (url) => {
      const response = await request(app).get(url);

      expect(response.status).toBe(200);
      expect(response.text).toContain('prochaine phase');
    },
  );
});
