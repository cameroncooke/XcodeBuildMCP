import { defineConfig } from 'tsup';
import { chmodSync } from 'fs';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'diagnostic-cli': 'src/diagnostic-cli.ts',
  },
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  outDir: 'build',
  clean: true,
  // sourcemap: false, // Disable source maps to reduce noise
  dts: {
    entry: {
      index: 'src/index.ts',
    },
  },
  splitting: false,
  shims: false,
  treeshake: true,
  minify: false,
  onSuccess: async () => {
    console.log('✅ Build complete!');
    chmodSync('build/index.js', '755');
    chmodSync('build/diagnostic-cli.js', '755');
  },
});