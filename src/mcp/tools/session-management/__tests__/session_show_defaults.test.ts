import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sessionStore } from '../../../../utils/session-store.ts';
import { schema, handler } from '../session_show_defaults.ts';

describe('session-show-defaults tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  afterEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have handler function', () => {
      expect(typeof handler).toBe('function');
    });

    it('should have empty schema', () => {
      expect(schema).toEqual({});
    });
  });

  describe('Handler Behavior', () => {
    it('should return empty defaults when none set', async () => {
      const result = await handler();
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(typeof result.content[0].text).toBe('string');
      const parsed = JSON.parse(result.content[0].text as string);
      expect(parsed).toEqual({});
    });

    it('should return current defaults when set', async () => {
      sessionStore.setDefaults({ scheme: 'MyScheme', simulatorId: 'SIM-123' });
      const result = await handler();
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(typeof result.content[0].text).toBe('string');
      const parsed = JSON.parse(result.content[0].text as string);
      expect(parsed.scheme).toBe('MyScheme');
      expect(parsed.simulatorId).toBe('SIM-123');
    });

    it('shows defaults from the active profile', async () => {
      sessionStore.setDefaults({ scheme: 'GlobalScheme' });
      sessionStore.setActiveProfile('ios');
      sessionStore.setDefaults({ scheme: 'IOSScheme' });

      const result = await handler();
      const parsed = JSON.parse(result.content[0].text as string);
      expect(parsed.scheme).toBe('IOSScheme');
    });
  });
});
