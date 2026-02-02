import { defineConfig } from 'tsup';
import { chmodSync, existsSync } from 'fs';
import { createPluginDiscoveryPlugin } from './build-plugins/plugin-discovery.js';

export default defineConfig({
  entry: {
    index: 'src/cli.ts',
    'doctor-cli': 'src/doctor-cli.ts',
    daemon: 'src/daemon.ts',
  },
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  outDir: 'build',
  clean: true,
  sourcemap: true, // Enable source maps for debugging
  dts: {
    entry: {
      index: 'src/cli.ts',
    },
  },
  splitting: false,
  shims: false,
  treeshake: true,
  minify: false,
  esbuildPlugins: [createPluginDiscoveryPlugin()],
  onSuccess: async () => {
    console.log('✅ Build complete!');

    // Set executable permissions for built files
    const executables = ['build/index.js', 'build/doctor-cli.js', 'build/daemon.js'];
    for (const file of executables) {
      if (existsSync(file)) {
        chmodSync(file, '755');
      }
    }
  },
});
