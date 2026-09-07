import request from 'supertest';

import { createApp } from '../src/app';

describe('GET /', () => {
  it('répond 200 et affiche la page d’accueil', async () => {
    const app = createApp();
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Portail Web Monétique');
  });
});
