/**
 * Re-export test for get_sim_app_path_id_ws tool from simulator-workspace
 * This ensures the re-export works correctly in the simulator-project directory
 */

import { vi, describe, it, expect } from 'vitest';
import getSimAppPathIdWsTool from './get_sim_app_path_id_ws.ts';

// Mock external dependencies to prevent real command execution
vi.mock('../../src/utils/command.ts', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

describe('get_sim_app_path_id_ws re-export', () => {
  it('should re-export the tool correctly', () => {
    expect(getSimAppPathIdWsTool).toBeDefined();
    expect(getSimAppPathIdWsTool.name).toBe('get_sim_app_path_id_ws');
    expect(getSimAppPathIdWsTool.description).toContain('Gets the app bundle path for a simulator by UUID using a workspace');
    expect(getSimAppPathIdWsTool.schema).toBeDefined();
    expect(getSimAppPathIdWsTool.handler).toBeDefined();
    expect(typeof getSimAppPathIdWsTool.handler).toBe('function');
  });
});