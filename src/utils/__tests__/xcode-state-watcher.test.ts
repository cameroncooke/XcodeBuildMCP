import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  startXcodeStateWatcher,
  stopXcodeStateWatcher,
  isWatcherRunning,
  getWatchedPath,
} from '../xcode-state-watcher.ts';
import { createCommandMatchingMockExecutor } from '../../test-utils/mock-executors.ts';

describe('xcode-state-watcher', () => {
  afterEach(async () => {
    await stopXcodeStateWatcher();
  });

  describe('startXcodeStateWatcher', () => {
    it('returns false when no xcuserstate file found', async () => {
      const executor = createCommandMatchingMockExecutor({
        whoami: { output: 'testuser\n' },
        find: { output: '' },
      });

      const result = await startXcodeStateWatcher({
        executor,
        cwd: '/nonexistent',
      });

      expect(result).toBe(false);
      expect(isWatcherRunning()).toBe(false);
    });
  });

  describe('stopXcodeStateWatcher', () => {
    it('can be called when no watcher is running', async () => {
      expect(isWatcherRunning()).toBe(false);
      await stopXcodeStateWatcher();
      expect(isWatcherRunning()).toBe(false);
    });
  });

  describe('isWatcherRunning', () => {
    it('returns false initially', () => {
      expect(isWatcherRunning()).toBe(false);
    });
  });

  describe('getWatchedPath', () => {
    it('returns null when no watcher is running', () => {
      expect(getWatchedPath()).toBe(null);
    });
  });
});
