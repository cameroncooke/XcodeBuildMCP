import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const RESOURCE_ROOT_ENV_VAR = 'XCODEBUILDMCP_RESOURCE_ROOT';

function hasResourceLayout(root: string): boolean {
  return fs.existsSync(path.join(root, 'manifests')) || fs.existsSync(path.join(root, 'bundled'));
}

function findPackageRootFrom(startDir: string): string | null {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

export function getPackageRoot(): string {
  const candidates: string[] = [];
  candidates.push(path.dirname(fileURLToPath(import.meta.url)));
  candidates.push(process.cwd());
  const entry = process.argv[1];
  if (entry) {
    candidates.push(path.dirname(entry));
  }

  for (const candidate of candidates) {
    const found = findPackageRootFrom(candidate);
    if (found) {
      return found;
    }
  }

  throw new Error('Could not find package root (no package.json found in parent directories)');
}

function getExecutableResourceRoot(): string | null {
  const execPath = process.execPath;
  if (!execPath) {
    return null;
  }

  const candidateDirs = [path.dirname(execPath), path.dirname(path.dirname(execPath))];
  for (const candidate of candidateDirs) {
    if (hasResourceLayout(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function getResourceRoot(): string {
  const explicitRoot = process.env[RESOURCE_ROOT_ENV_VAR];
  if (explicitRoot) {
    return path.resolve(explicitRoot);
  }

  const executableRoot = getExecutableResourceRoot();
  if (executableRoot) {
    return executableRoot;
  }

  return getPackageRoot();
}

export function getManifestsDir(): string {
  return path.join(getResourceRoot(), 'manifests');
}

export function getBundledAxePath(): string {
  return path.join(getResourceRoot(), 'bundled', 'axe');
}

export function getBundledFrameworksDir(): string {
  return path.join(getResourceRoot(), 'bundled', 'Frameworks');
}
