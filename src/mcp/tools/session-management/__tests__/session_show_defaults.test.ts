import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sessionStore } from '../../../../utils/session-store.ts';
import plugin from '../session_show_defaults.ts';

describe('session-show-defaults tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  afterEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('session-show-defaults');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe('Show current session defaults.');
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should have empty schema', () => {
      expect(plugin.schema).toEqual({});
    });
  });

  describe('Handler Behavior', () => {
    it('should return empty defaults when none set', async () => {
      const result = await plugin.handler({});
      expect(result.isError).toBe(false);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({});
    });

    it('should return current defaults when set', async () => {
      sessionStore.setDefaults({ scheme: 'MyScheme', simulatorId: 'SIM-123' });
      const result = await plugin.handler({});
      expect(result.isError).toBe(false);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.scheme).toBe('MyScheme');
      expect(parsed.simulatorId).toBe('SIM-123');
    });
  });
});
