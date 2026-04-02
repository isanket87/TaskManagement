import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import prisma from '../src/utils/prisma.js';

// Mock prisma directly to avoid actual DB dependency during unit tests
vi.mock('../src/utils/prisma.js', () => ({
  default: {
    $queryRaw: vi.fn(),
    task: { count: vi.fn() },
    user: { count: vi.fn() },
  },
}));

describe('Health Check API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default success for DB checks
    prisma.$queryRaw.mockResolvedValue([{ count: 5, size: '42 MB' }]);
    prisma.task.count.mockResolvedValue(100);
    prisma.user.count.mockResolvedValue(50);
  });

  it('GET /api/ping should return 200 and ok status', async () => {
    const response = await request(app).get('/api/ping');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  it('GET /api/health/status should return 200 even with some latency', async () => {
    // Increase timeout for this test because health check performs multiple pings
    const response = await request(app)
      .get('/api/health/status')
      .timeout(10000); // Give it plenty of time
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('overall');
  });
});
