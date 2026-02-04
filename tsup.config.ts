import { defineConfig } from 'tsup';
import { chmodSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { join } from 'path';

/**
 * Recursively rewrites .ts imports to .js in all JavaScript files.
 * Required because Node.js cannot resolve .ts extensions at runtime.
 */
function rewriteTsImportsInDir(dir: string): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteTsImportsInDir(fullPath);
    } else if (entry.name.endsWith('.js')) {
      let content = readFileSync(fullPath, 'utf-8');
      // Rewrite: import ... from "./path.ts" or import ... from "../path.ts"
      // Also handles: export ... from "./path.ts"
      const rewritten = content.replace(
        /((?:import|export)[^'"]*['"])([^'"]+)(\.ts)(['"])/g,
        '$1$2.js$4'
      );
      if (rewritten !== content) {
        writeFileSync(fullPath, rewritten, 'utf-8');
      }
    }
  }
}

export default defineConfig({
  // Include all TypeScript files for unbundled output
  entry: await glob('src/**/*.ts', {
    ignore: ['**/*.test.ts', '**/__tests__/**'],
  }),
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  outDir: 'build',
  clean: true,
  sourcemap: true,
  dts: false, // Skip declaration files for speed
  bundle: false, // UNBUNDLED: Output individual files
  splitting: false,
  shims: false,
  treeshake: false, // Disable treeshake for unbundled
  minify: false,
  onSuccess: async () => {
    // Rewrite .ts imports to .js in all output files
    rewriteTsImportsInDir('build');
    console.log('✅ Build complete!');

    // Set executable permissions for built files
    const executables = ['build/cli.js', 'build/doctor-cli.js', 'build/daemon.js'];
    for (const file of executables) {
      if (existsSync(file)) {
        chmodSync(file, '755');
      }
    }
  },
});
