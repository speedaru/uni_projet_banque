import bcrypt from 'bcrypt';
import request from 'supertest';

import { createApp } from '../src/app';
import {
  authenticate,
  shouldShowLastAttemptWarning,
  UserRecord,
} from '../src/services/authService';

describe('authService', () => {
  const user: UserRecord = {
    login: 'client',
    passwordHash: bcrypt.hashSync('secret', 4),
    role: 'client',
    siren: '123456789',
  };
  const findUser = async (login: string) => (login === user.login ? user : null);

  it('renvoie l’utilisateur (sans le hash) si le mot de passe est correct', async () => {
    const result = await authenticate('client', 'secret', findUser);

    expect(result).toEqual({ login: 'client', role: 'client', siren: '123456789' });
  });

  it('refuse un mauvais mot de passe', async () => {
    expect(await authenticate('client', 'mauvais', findUser)).toBeNull();
  });

  it('refuse un identifiant inconnu', async () => {
    expect(await authenticate('inconnu', 'secret', findUser)).toBeNull();
  });

  it('refuse des champs vides', async () => {
    expect(await authenticate('', '', findUser)).toBeNull();
  });

  it('affiche l’avertissement à partir de 2 échecs', () => {
    expect(shouldShowLastAttemptWarning(1)).toBe(false);
    expect(shouldShowLastAttemptWarning(2)).toBe(true);
    expect(shouldShowLastAttemptWarning(3)).toBe(true);
  });
});

describe('Écran de connexion', () => {
  const app = createApp();

  it('affiche le formulaire avec le bouton « œil »', async () => {
    const response = await request(app).get('/connexion');

    expect(response.status).toBe(200);
    expect(response.text).toContain('name="login"');
    expect(response.text).toContain('type="password"');
    expect(response.text).toContain('bouton-oeil');
    expect(response.text).not.toContain('dernier essai');
    expect(response.text).not.toContain('nav-principale');
  });

  it('affiche une erreur sans le bandeau après 1 échec', async () => {
    const response = await request(app)
      .post('/connexion')
      .type('form')
      .send({ login: 'po', password: 'mauvais' });

    expect(response.status).toBe(401);
    expect(response.text).toContain('Identifiant ou mot de passe incorrect');
    expect(response.text).not.toContain('dernier essai');
  });

  it('affiche « ATTENTION : C’est votre dernier essai... » après 2 échecs', async () => {
    const agent = request.agent(app);

    await agent.post('/connexion').type('form').send({ login: 'po', password: 'mauvais' });
    const response = await agent
      .post('/connexion')
      .type('form')
      .send({ login: 'po', password: 'mauvais' });

    expect(response.text).toContain("ATTENTION : C'est votre dernier essai...");
  });

  it.each([
    ['admin', 'admin123', '/admin'],
    ['po', 'po123', '/po'],
    ['client', 'client123', '/client'],
  ])('connecte %s et redirige vers son espace', async (login, password, home) => {
    const response = await request(app).post('/connexion').type('form').send({ login, password });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(home);
  });

  it('garde l’utilisateur connecté puis le déconnecte', async () => {
    const agent = request.agent(app);
    await agent.post('/connexion').type('form').send({ login: 'po', password: 'po123' });

    // Connecté : la page de connexion renvoie vers son espace, qui affiche le bouton de déconnexion
    expect((await agent.get('/connexion')).headers.location).toBe('/po');
    expect((await agent.get('/po')).text).toContain('Déconnexion');

    const logoutResponse = await agent.post('/deconnexion');
    expect(logoutResponse.headers.location).toBe('/connexion');
    expect((await agent.get('/connexion')).status).toBe(200);
  });
});
