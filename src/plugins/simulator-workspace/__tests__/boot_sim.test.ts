import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
} from '../../../utils/command.js';

// Import the plugin
import bootSim from '../boot_sim.ts';

describe('boot_sim tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(bootSim.name).toBe('boot_sim');
    });

    it('should have correct description', () => {
      expect(bootSim.description).toBe(
        "Boots an iOS simulator. IMPORTANT: You MUST provide the simulatorUuid parameter. Example: boot_sim({ simulatorUuid: 'YOUR_UUID_HERE' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof bootSim.handler).toBe('function');
    });

    it('should have correct schema with simulatorUuid string field', () => {
      const schema = z.object(bootSim.schema);

      // Valid inputs
      expect(schema.safeParse({ simulatorUuid: 'test-uuid-123' }).success).toBe(true);
      expect(schema.safeParse({ simulatorUuid: 'ABC123-DEF456' }).success).toBe(true);

      // Invalid inputs
      expect(schema.safeParse({ simulatorUuid: 123 }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: null }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: undefined }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful boot', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Simulator booted successfully',
      });

      const result = await bootSim.handler({ simulatorUuid: 'test-uuid-123' }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Simulator booted successfully. Next steps:
1. Open the Simulator app: open_sim({ enabled: true })
2. Install an app: install_app_sim({ simulatorUuid: "test-uuid-123", appPath: "PATH_TO_YOUR_APP" })
3. Launch an app: launch_app_sim({ simulatorUuid: "test-uuid-123", bundleId: "YOUR_APP_BUNDLE_ID" })
4. Log capture options:
   - Option 1: Capture structured logs only (app continues running):
     start_sim_log_cap({ simulatorUuid: "test-uuid-123", bundleId: "YOUR_APP_BUNDLE_ID" })
   - Option 2: Capture both console and structured logs (app will restart):
     start_sim_log_cap({ simulatorUuid: "test-uuid-123", bundleId: "YOUR_APP_BUNDLE_ID", captureConsole: true })
   - Option 3: Launch app with logs in one step:
     launch_app_logs_sim({ simulatorUuid: "test-uuid-123", bundleId: "YOUR_APP_BUNDLE_ID" })`,
          },
        ],
      });
    });

    it('should handle validation failure', async () => {
      const result = await bootSim.handler({ simulatorUuid: undefined }, createNoopExecutor());

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Simulator not found',
      });

      const result = await bootSim.handler({ simulatorUuid: 'invalid-uuid' }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Boot simulator operation failed: Simulator not found',
          },
        ],
      });
    });

    it('should handle exception with Error object', async () => {
      const mockExecutor = async () => {
        throw new Error('Connection failed');
      };

      const result = await bootSim.handler({ simulatorUuid: 'test-uuid-123' }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Boot simulator operation failed: Connection failed',
          },
        ],
      });
    });

    it('should handle exception with string error', async () => {
      const mockExecutor = async () => {
        throw 'String error';
      };

      const result = await bootSim.handler({ simulatorUuid: 'test-uuid-123' }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Boot simulator operation failed: String error',
          },
        ],
      });
    });
  });
});
