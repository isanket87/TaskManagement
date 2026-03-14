import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

beforeAll(async () => {
  // Setup logic (e.g., db connection if needed)
});

afterAll(async () => {
  // Teardown logic
});
