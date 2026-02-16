import { beforeAll, afterEach, afterAll } from 'vitest';

// Setup environment variables for tests
beforeAll(() => {
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';
  process.env.GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'test-key';
  process.env.GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || 'test-key';
});

// Clean up after each test
afterEach(() => {
  // Clear any mocks
});

// Clean up after all tests
afterAll(() => {
  // Final cleanup
});
