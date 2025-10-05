import { describe, it, expect, beforeEach } from 'vitest';
import { sessionStore } from '../../../../utils/session-store.ts';
import plugin, { sessionSetDefaultsLogic } from '../session_set_defaults.ts';

describe('session-set-defaults tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('session-set-defaults');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        'Set the session defaults needed by many tools. Most tools require one or more session defaults to be set before they can be used. Agents should set the relevant defaults at the beginning of a session.',
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should have schema object', () => {
      expect(plugin.schema).toBeDefined();
      expect(typeof plugin.schema).toBe('object');
    });
  });

  describe('Handler Behavior', () => {
    it('should set provided defaults and return updated state', async () => {
      const result = await sessionSetDefaultsLogic({
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
        useLatestOS: true,
        arch: 'arm64',
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Defaults updated:');

      const current = sessionStore.getAll();
      expect(current.scheme).toBe('MyScheme');
      expect(current.simulatorName).toBe('iPhone 16');
      expect(current.useLatestOS).toBe(true);
      expect(current.arch).toBe('arm64');
    });

    it('should validate parameter types via Zod', async () => {
      const result = await plugin.handler({
        useLatestOS: 'yes' as unknown as boolean,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('useLatestOS');
    });

    it('should clear workspacePath when projectPath is set', async () => {
      sessionStore.setDefaults({ workspacePath: '/old/App.xcworkspace' });
      await sessionSetDefaultsLogic({ projectPath: '/new/App.xcodeproj' });
      const current = sessionStore.getAll();
      expect(current.projectPath).toBe('/new/App.xcodeproj');
      expect(current.workspacePath).toBeUndefined();
    });

    it('should clear projectPath when workspacePath is set', async () => {
      sessionStore.setDefaults({ projectPath: '/old/App.xcodeproj' });
      await sessionSetDefaultsLogic({ workspacePath: '/new/App.xcworkspace' });
      const current = sessionStore.getAll();
      expect(current.workspacePath).toBe('/new/App.xcworkspace');
      expect(current.projectPath).toBeUndefined();
    });

    it('should clear simulatorName when simulatorId is set', async () => {
      sessionStore.setDefaults({ simulatorName: 'iPhone 16' });
      await sessionSetDefaultsLogic({ simulatorId: 'SIM-UUID' });
      const current = sessionStore.getAll();
      expect(current.simulatorId).toBe('SIM-UUID');
      expect(current.simulatorName).toBeUndefined();
    });

    it('should clear simulatorId when simulatorName is set', async () => {
      sessionStore.setDefaults({ simulatorId: 'SIM-UUID' });
      await sessionSetDefaultsLogic({ simulatorName: 'iPhone 16' });
      const current = sessionStore.getAll();
      expect(current.simulatorName).toBe('iPhone 16');
      expect(current.simulatorId).toBeUndefined();
    });
  });
});
