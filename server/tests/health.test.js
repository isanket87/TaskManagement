import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('Health Check API', () => {
  it('GET /api/ping should return 200 and ok status', async () => {
    const response = await request(app).get('/api/ping');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('GET /api/health/status should return 200', async () => {
    const response = await request(app).get('/api/health/status');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });
});
