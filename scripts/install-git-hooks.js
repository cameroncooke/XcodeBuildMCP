#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function runGit(args) {
  return spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

const insideWorkTree = runGit(['rev-parse', '--is-inside-work-tree']);
if (insideWorkTree.status !== 0 || insideWorkTree.stdout.trim() !== 'true') {
  console.log('[hooks] Skipping git hook install (not inside a git worktree).');
  process.exit(0);
}

const setHookPath = runGit(['config', 'core.hooksPath', '.githooks']);
if (setHookPath.status !== 0) {
  const output = (setHookPath.stderr || setHookPath.stdout || '').trim();
  console.error('[hooks] Failed to set core.hooksPath to .githooks');
  if (output) {
    console.error(output);
  }
  process.exit(1);
}

console.log('[hooks] Installed git hooks path: .githooks');
