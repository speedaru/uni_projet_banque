import { navigation, Role } from '../src/lib/navigation';
import { createTestApp, loginAs } from './helpers/testApp';

describe('Espaces par rôle', () => {
  const { app } = createTestApp();

  it.each([
    ['admin', '/admin', 'Espace Administrateur'],
    ['po', '/po', 'Espace Product Owner'],
    ['client', '/client', 'Espace Client'],
  ] as const)('%s voit la page d’accueil de son espace', async (role, url, titre) => {
    const agent = await loginAs(app, role);
    const response = await agent.get(url);

    expect(response.status).toBe(200);
    expect(response.text).toContain(titre);
  });

  it('affiche tous les liens du menu de l’espace', async () => {
    const response = await (await loginAs(app, 'po')).get('/po');

    for (const link of navigation.po) {
      expect(response.text).toContain(`href="${link.href}"`);
    }
  });

  it('marque la page courante dans le menu', async () => {
    const response = await (await loginAs(app, 'client')).get('/client/remises');

    expect(response.text).toMatch(/href="\/client\/remises"\s+aria-current="page"/);
  });

  it('ne propose aucun écran métier dans le menu admin (Epic 7)', async () => {
    const response = await (await loginAs(app, 'admin')).get('/admin');

    expect(response.text).not.toMatch(/tresorerie|remises|impayes|statistiques/);
  });

  it('ne mélange pas les menus des espaces PO et Client', async () => {
    const response = await (await loginAs(app, 'client')).get('/client');

    expect(response.text).not.toContain('href="/po');
    expect(response.text).not.toContain('href="/admin');
  });

  // Écrans du menu pas encore développés
  const comingSoon: [Role, string][] = [
    ['po', '/po/impayes'],
    ['po', '/po/statistiques'],
    ['client', '/client/impayes'],
    ['client', '/client/statistiques'],
  ];

  it.each(comingSoon)('%s : GET %s affiche une page « à venir »', async (role, url) => {
    const response = await (await loginAs(app, role)).get(url);

    expect(response.status).toBe(200);
    expect(response.text).toContain('prochaine phase');
  });
});
