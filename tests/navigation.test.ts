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

  // Chaque lien du menu mène à un écran développé (plus aucune page « à venir »)
  const menuLinks = (Object.keys(navigation) as Role[]).flatMap((role) =>
    navigation[role].map((link): [Role, string] => [role, link.href]),
  );

  it.each(menuLinks)('%s : GET %s affiche un écran développé', async (role, url) => {
    const response = await (await loginAs(app, role)).get(url);

    expect(response.status).toBe(200);
    expect(response.text).not.toContain('prochaine phase');
  });
});
