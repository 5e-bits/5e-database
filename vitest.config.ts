// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Glob pattern to find test files
    include: ['**/*.test.js'],
    // Test environment (node, jsdom, happy-dom, edge-runtime)
    // 'node' is suitable for backend/Node.js tests. Use 'jsdom' if you need browser APIs.
    environment: 'node',
    // Enable globals like describe, it, expect for Jest compatibility
    globals: true,
    coverage: {
      // Coverage provider
      provider: 'v8', // or 'istanbul'
      // Files to ignore in coverage reports
      exclude: [
        'node_modules/**', // Equivalent to coveragePathIgnorePatterns
        'coverage/**', // Ignore the coverage output directory
        'dist/**', // Ignore build output
        // Add any other paths you want to ignore
        '*.config.js',
        '*.config.ts',
        'scripts/dbUtils.ts', // Example: ignoring utility scripts if not tested directly
      ],
      // Optional: Specify reporters (e.g., text, html, json)
      reporter: ['text', 'json', 'html'],
    },
  },
});
