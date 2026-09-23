import request from 'supertest';

import { createApp } from '../src/app';

describe('GET /', () => {
  it('redirige vers l’écran de connexion', async () => {
    const app = createApp();
    const response = await request(app).get('/');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/connexion');
  });
});
