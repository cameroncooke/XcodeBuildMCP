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
        'Set the session defaults needed by many tools. Most tools require one or more session defaults to be set before they can be used. Agents should set all relevant defaults up front in a single call (e.g., project/workspace, scheme, simulator or device ID, useLatestOS) to avoid iterative prompts; only set the keys your workflow needs.',
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
      const result = await sessionSetDefaultsLogic({ projectPath: '/new/App.xcodeproj' });
      const current = sessionStore.getAll();
      expect(current.projectPath).toBe('/new/App.xcodeproj');
      expect(current.workspacePath).toBeUndefined();
      expect(result.content[0].text).toContain(
        'Cleared workspacePath because projectPath was set.',
      );
    });

    it('should clear projectPath when workspacePath is set', async () => {
      sessionStore.setDefaults({ projectPath: '/old/App.xcodeproj' });
      const result = await sessionSetDefaultsLogic({ workspacePath: '/new/App.xcworkspace' });
      const current = sessionStore.getAll();
      expect(current.workspacePath).toBe('/new/App.xcworkspace');
      expect(current.projectPath).toBeUndefined();
      expect(result.content[0].text).toContain(
        'Cleared projectPath because workspacePath was set.',
      );
    });

    it('should clear simulatorName when simulatorId is set', async () => {
      sessionStore.setDefaults({ simulatorName: 'iPhone 16' });
      const result = await sessionSetDefaultsLogic({ simulatorId: 'SIM-UUID' });
      const current = sessionStore.getAll();
      expect(current.simulatorId).toBe('SIM-UUID');
      expect(current.simulatorName).toBeUndefined();
      expect(result.content[0].text).toContain(
        'Cleared simulatorName because simulatorId was set.',
      );
    });

    it('should clear simulatorId when simulatorName is set', async () => {
      sessionStore.setDefaults({ simulatorId: 'SIM-UUID' });
      const result = await sessionSetDefaultsLogic({ simulatorName: 'iPhone 16' });
      const current = sessionStore.getAll();
      expect(current.simulatorName).toBe('iPhone 16');
      expect(current.simulatorId).toBeUndefined();
      expect(result.content[0].text).toContain(
        'Cleared simulatorId because simulatorName was set.',
      );
    });

    it('should prefer workspacePath when both projectPath and workspacePath are provided', async () => {
      const res = await sessionSetDefaultsLogic({
        projectPath: '/app/App.xcodeproj',
        workspacePath: '/app/App.xcworkspace',
      });
      const current = sessionStore.getAll();
      expect(current.workspacePath).toBe('/app/App.xcworkspace');
      expect(current.projectPath).toBeUndefined();
      expect(res.content[0].text).toContain(
        'Both projectPath and workspacePath were provided; keeping workspacePath and ignoring projectPath.',
      );
    });

    it('should prefer simulatorId when both simulatorId and simulatorName are provided', async () => {
      const res = await sessionSetDefaultsLogic({
        simulatorId: 'SIM-1',
        simulatorName: 'iPhone 16',
      });
      const current = sessionStore.getAll();
      expect(current.simulatorId).toBe('SIM-1');
      expect(current.simulatorName).toBeUndefined();
      expect(res.content[0].text).toContain(
        'Both simulatorId and simulatorName were provided; keeping simulatorId and ignoring simulatorName.',
      );
    });
  });
});
