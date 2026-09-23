import request from 'supertest';

import { createTestApp } from './helpers/testApp';

describe('GET /', () => {
  it('redirige vers l’écran de connexion', async () => {
    const { app } = createTestApp();
    const response = await request(app).get('/');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/connexion');
  });
});
