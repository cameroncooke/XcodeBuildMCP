import { execFileSync } from 'child_process';
import { cpSync, existsSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';

const projectRoot = process.cwd();
const bundledDir = join(projectRoot, 'bundled');
const bundledAxePath = join(bundledDir, 'axe');

function resolveOutputDir() {
  const args = process.argv;
  const outIndex = args.findIndex((arg) => arg === '--out' || arg === '-o');
  if (outIndex !== -1 && args[outIndex + 1]) {
    return dirname(resolve(args[outIndex + 1]));
  }
  return join(projectRoot, '.smithery');
}

const outputDir = resolveOutputDir();
const bundledTargetDir = join(outputDir, 'bundled');

if (!existsSync(bundledAxePath)) {
  execFileSync('bash', [join(projectRoot, 'scripts', 'bundle-axe.sh')], {
    stdio: 'inherit',
  });
}

if (existsSync(bundledAxePath)) {
  mkdirSync(outputDir, { recursive: true });
  cpSync(bundledDir, bundledTargetDir, { recursive: true });
} else {
  throw new Error(`AXe bundle missing at ${bundledAxePath}`);
}

export default {
  esbuild: {
    format: 'cjs',
    target: 'node18',
  },
};
