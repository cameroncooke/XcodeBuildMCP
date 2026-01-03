import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDefaultDebuggerManager } from '../../../utils/debugger/index.ts';
import { activeLogSessions } from '../../../utils/log_capture.ts';
import { activeDeviceLogSessions } from '../../../utils/log-capture/device-log-sessions.ts';
import sessionStatusResource, { sessionStatusResourceLogic } from '../session-status.ts';

describe('session-status resource', () => {
  beforeEach(async () => {
    activeLogSessions.clear();
    activeDeviceLogSessions.clear();
    await getDefaultDebuggerManager().disposeAll();
  });

  afterEach(async () => {
    activeLogSessions.clear();
    activeDeviceLogSessions.clear();
    await getDefaultDebuggerManager().disposeAll();
  });

  describe('Export Field Validation', () => {
    it('should export correct uri', () => {
      expect(sessionStatusResource.uri).toBe('xcodebuildmcp://session-status');
    });

    it('should export correct description', () => {
      expect(sessionStatusResource.description).toBe(
        'Runtime session state for log capture and debugging',
      );
    });

    it('should export correct mimeType', () => {
      expect(sessionStatusResource.mimeType).toBe('text/plain');
    });

    it('should export handler function', () => {
      expect(typeof sessionStatusResource.handler).toBe('function');
    });
  });

  describe('Handler Functionality', () => {
    it('should return empty status when no sessions exist', async () => {
      const result = await sessionStatusResourceLogic();

      expect(result.contents).toHaveLength(1);
      const parsed = JSON.parse(result.contents[0].text);

      expect(parsed.logging.simulator.activeSessionIds).toEqual([]);
      expect(parsed.logging.device.activeSessionIds).toEqual([]);
      expect(parsed.debug.currentSessionId).toBe(null);
      expect(parsed.debug.sessionIds).toEqual([]);
    });
  });
});
