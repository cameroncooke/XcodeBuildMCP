import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getBundledAxeEnvironment } from '../axe-helpers.ts';

describe('axe-helpers', () => {
  let originalResourceRoot: string | undefined;
  let originalDyldFrameworkPath: string | undefined;
  let tempDir: string;

  beforeEach(() => {
    originalResourceRoot = process.env.XCODEBUILDMCP_RESOURCE_ROOT;
    originalDyldFrameworkPath = process.env.DYLD_FRAMEWORK_PATH;
    tempDir = mkdtempSync(join(tmpdir(), 'xbmcp-axe-helpers-'));
  });

  afterEach(() => {
    if (originalResourceRoot === undefined) {
      delete process.env.XCODEBUILDMCP_RESOURCE_ROOT;
    } else {
      process.env.XCODEBUILDMCP_RESOURCE_ROOT = originalResourceRoot;
    }

    if (originalDyldFrameworkPath === undefined) {
      delete process.env.DYLD_FRAMEWORK_PATH;
    } else {
      process.env.DYLD_FRAMEWORK_PATH = originalDyldFrameworkPath;
    }

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns DYLD_FRAMEWORK_PATH when bundled axe is resolved from resource root', () => {
    const resourceRoot = join(tempDir, 'portable-root');
    const axePath = join(resourceRoot, 'bundled', 'axe');
    const frameworksDir = join(resourceRoot, 'bundled', 'Frameworks');
    mkdirSync(frameworksDir, { recursive: true });
    writeFileSync(axePath, '');
    process.env.XCODEBUILDMCP_RESOURCE_ROOT = resourceRoot;
    delete process.env.DYLD_FRAMEWORK_PATH;

    const env = getBundledAxeEnvironment();
    expect(env).toEqual({
      DYLD_FRAMEWORK_PATH: frameworksDir,
    });
  });

  it('preserves existing DYLD_FRAMEWORK_PATH entries when using bundled axe', () => {
    const resourceRoot = join(tempDir, 'portable-root');
    const axePath = join(resourceRoot, 'bundled', 'axe');
    const frameworksDir = join(resourceRoot, 'bundled', 'Frameworks');
    mkdirSync(frameworksDir, { recursive: true });
    writeFileSync(axePath, '');
    process.env.XCODEBUILDMCP_RESOURCE_ROOT = resourceRoot;
    process.env.DYLD_FRAMEWORK_PATH = '/existing/frameworks';

    const env = getBundledAxeEnvironment();
    expect(env).toEqual({
      DYLD_FRAMEWORK_PATH: `${frameworksDir}:/existing/frameworks`,
    });
  });
});
