import path from 'path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths({
    projects: ['./tsconfig.spec.json'],
  })],
  test: {
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'test/**/*.spec.ts', 'test/**/*.test.ts'],
    testTimeout: 80000,
    globals: true,
    setupFiles: [
      "./test/setupVitest.ts"
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/types/**', 'src/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

