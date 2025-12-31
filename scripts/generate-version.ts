import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface PackageJson {
  version: string;
  iOSTemplateVersion: string;
  macOSTemplateVersion: string;
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const packagePath = path.join(repoRoot, 'package.json');
  const versionPath = path.join(repoRoot, 'src', 'version.ts');

  const raw = await readFile(packagePath, 'utf8');
  const pkg = JSON.parse(raw) as PackageJson;

  const content =
    `export const version = '${pkg.version}';\n` +
    `export const iOSTemplateVersion = '${pkg.iOSTemplateVersion}';\n` +
    `export const macOSTemplateVersion = '${pkg.macOSTemplateVersion}';\n`;

  await writeFile(versionPath, content, 'utf8');
}

main().catch((error) => {
  console.error('Failed to generate src/version.ts:', error);
  process.exit(1);
});
