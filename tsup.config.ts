import { defineConfig } from 'tsup';
import { chmodSync, existsSync } from 'fs';
import { globSync } from 'glob';
import path from 'path';

const pluginLoaderPlugin = {
  name: 'plugin-loader',
  setup(build) {
    build.onLoad({ filter: /plugin-registry\.ts$/ }, async (args) => {
      const contents = await import('fs').then(fs => fs.promises.readFile(args.path, 'utf8'));
      
      if (contents.includes('__PLUGIN_LOADER__')) {
        // Find all plugin files
        const pluginFiles = globSync('src/plugins/**/*.ts', {
          ignore: ['**/*.test.ts', '**/index.ts', '**/active-processes.ts']
        });
        
        // Filter files that actually have default exports (plugins)
        const fs = await import('fs');
        const validPluginFiles = [];
        
        for (const file of pluginFiles) {
          try {
            const fileContents = await fs.promises.readFile(file, 'utf8');
            if (fileContents.includes('export default') || fileContents.includes('export default {')) {
              validPluginFiles.push(file);
            }
          } catch (error) {
            console.warn(`Could not read ${file}:`, error);
          }
        }
        
        // Generate imports
        const imports = validPluginFiles.map((file, i) => {
          const relativePath = path.relative(path.dirname(args.path), file).replace(/\\/g, '/');
          return `import plugin${i} from '${relativePath}';`;
        }).join('\n');
        
        // Generate plugin array
        const pluginArray = `[${validPluginFiles.map((_, i) => `plugin${i}`).join(', ')}]`;
        
        // Replace the placeholder - inject imports at top and replace the loader call
        const transformedContents = contents
          .replace(
            /import.*from.*'\.\/plugin-types\.js';/,
            `$&\n${imports}`
          )
          .replace(
            'const pluginModules = await __PLUGIN_LOADER__();',
            `const pluginModules = ${pluginArray};`
          );
        
        return {
          contents: transformedContents,
          loader: 'ts'
        };
      }
      
      return null;
    });
  }
};

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
  esbuildPlugins: [pluginLoaderPlugin],
  onSuccess: async () => {
    console.log('✅ Build complete!');
    
    // Set executable permissions for built files
    if (existsSync('build/index.js')) {
      chmodSync('build/index.js', '755');
    }
    if (existsSync('build/diagnostic-cli.js')) {
      chmodSync('build/diagnostic-cli.js', '755');
    }
  },
});