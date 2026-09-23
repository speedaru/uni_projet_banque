import request from 'supertest';

import { validateClientAccount } from '../src/services/accountService';
import { createTestApp, loginAs } from './helpers/testApp';

const validForm = {
  login: 'boulangerie',
  password: 'motdepasse',
  siren: '987654321',
  raisonSociale: 'Boulangerie Martin',
  poAgreement: true,
};

describe('validateClientAccount', () => {
  it('accepte un formulaire valide', () => {
    expect(validateClientAccount(validForm)).toEqual([]);
  });

  it('exige l’accord du Product Owner', () => {
    expect(validateClientAccount({ ...validForm, poAgreement: false })).toContain(
      "L'accord du Product Owner est obligatoire.",
    );
  });

  it.each(['12345678', '1234567890', '12345678a'])('refuse le SIREN %s', (siren) => {
    expect(validateClientAccount({ ...validForm, siren })).toContain(
      'Le SIREN doit contenir exactement 9 chiffres.',
    );
  });

  it('refuse une raison sociale de plus de 20 caractères', () => {
    expect(validateClientAccount({ ...validForm, raisonSociale: 'x'.repeat(21) })).toHaveLength(1);
  });

  it('refuse un mot de passe trop court', () => {
    expect(validateClientAccount({ ...validForm, password: 'court' })).toHaveLength(1);
  });
});

describe('Écran admin « Comptes clients »', () => {
  const form = { ...validForm, poAgreement: 'on' };

  it('liste les comptes clients existants', async () => {
    const { app } = createTestApp();
    const response = await (await loginAs(app, 'admin')).get('/admin/comptes');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Accord du Product Owner');
    expect(response.text).toContain('123456789');
  });

  it('crée un compte client qui peut ensuite se connecter', async () => {
    const { app } = createTestApp();
    const admin = await loginAs(app, 'admin');

    const response = await admin.post('/admin/comptes').type('form').send(form);
    expect(response.headers.location).toBe('/admin/comptes?ok=cree');
    expect((await admin.get('/admin/comptes')).text).toContain('Boulangerie Martin');

    const login = await request(app)
      .post('/connexion')
      .type('form')
      .send({ login: form.login, password: form.password });
    expect(login.headers.location).toBe('/client');
  });

  it('refuse la création sans l’accord du PO', async () => {
    const { app } = createTestApp();
    const admin = await loginAs(app, 'admin');

    const response = await admin
      .post('/admin/comptes')
      .type('form')
      .send({ ...form, poAgreement: undefined });

    expect(response.status).toBe(400);
    expect(response.text).toContain('accord du Product Owner est obligatoire');
    expect(response.text).not.toContain('motdepasse');
  });

  it('refuse un identifiant déjà utilisé', async () => {
    const { app } = createTestApp();
    const admin = await loginAs(app, 'admin');

    const response = await admin
      .post('/admin/comptes')
      .type('form')
      .send({ ...form, login: 'client' });

    expect(response.status).toBe(400);
    expect(response.text).toContain('déjà utilisé');
  });

  it('supprime un compte client avec l’accord du PO', async () => {
    const { app, users } = createTestApp();
    const admin = await loginAs(app, 'admin');
    const [client] = await users.listClients();

    const response = await admin
      .post(`/admin/comptes/${client.id}/supprimer`)
      .type('form')
      .send({ poAgreement: 'on' });

    expect(response.headers.location).toBe('/admin/comptes?ok=supprime');
    expect(await users.listClients()).toHaveLength(0);
  });

  it('refuse la suppression sans l’accord du PO', async () => {
    const { app, users } = createTestApp();
    const admin = await loginAs(app, 'admin');
    const [client] = await users.listClients();

    const response = await admin
      .post(`/admin/comptes/${client.id}/supprimer`)
      .type('form')
      .send({});

    expect(response.status).toBe(400);
    expect(await users.listClients()).toHaveLength(1);
  });

  it('ne permet pas de supprimer un compte admin ou PO', async () => {
    const { app, users } = createTestApp();
    const admin = await loginAs(app, 'admin');
    const adminUser = await users.findByLogin('admin');

    const response = await admin
      .post(`/admin/comptes/${adminUser!.id}/supprimer`)
      .type('form')
      .send({ poAgreement: 'on' });

    expect(response.status).toBe(404);
    expect(await users.findByLogin('admin')).not.toBeNull();
  });

  it('interdit l’écran aux autres profils', async () => {
    const { app } = createTestApp();
    const po = await loginAs(app, 'po');

    const response = await po.post('/admin/comptes').type('form').send(form);

    expect(response.headers.location).toBe('/po');
  });
});
