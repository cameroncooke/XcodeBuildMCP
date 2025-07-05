/**
 * Tests for simulator-project re-export files
 * These files re-export tools from simulator-workspace to avoid duplication
 */
import { describe, it, expect } from 'vitest';

// Import all re-export tools
import bootSim from './boot_sim.ts';
import describeUi from './describe_ui.ts';
import installAppSim from './install_app_sim.ts';
import launchAppLogsSim from './launch_app_logs_sim.ts';
import launchAppSim from './launch_app_sim.ts';
import listSims from './list_sims.ts';
import openSim from './open_sim.ts';
import resetNetworkCondition from './reset_network_condition.ts';
import resetSimulatorLocation from './reset_simulator_location.ts';
import screenshot from './screenshot.ts';
import setNetworkCondition from './set_network_condition.ts';
import setSimAppearance from './set_sim_appearance.ts';
import setSimulatorLocation from './set_simulator_location.ts';
import stopAppSim from './stop_app_sim.ts';

describe('simulator-project re-exports', () => {
  describe('boot_sim re-export', () => {
    it('should re-export boot_sim tool correctly', () => {
      expect(bootSim.name).toBe('boot_sim');
      expect(typeof bootSim.handler).toBe('function');
      expect(bootSim.schema).toBeDefined();
      expect(typeof bootSim.description).toBe('string');
    });
  });

  describe('describe_ui re-export', () => {
    it('should re-export describe_ui tool correctly', () => {
      expect(describeUi.name).toBe('describe_ui');
      expect(typeof describeUi.handler).toBe('function');
      expect(describeUi.schema).toBeDefined();
      expect(typeof describeUi.description).toBe('string');
    });
  });

  describe('install_app_sim re-export', () => {
    it('should re-export install_app_sim tool correctly', () => {
      expect(installAppSim.name).toBe('install_app_sim');
      expect(typeof installAppSim.handler).toBe('function');
      expect(installAppSim.schema).toBeDefined();
      expect(typeof installAppSim.description).toBe('string');
    });
  });

  describe('launch_app_logs_sim re-export', () => {
    it('should re-export launch_app_logs_sim tool correctly', () => {
      expect(launchAppLogsSim.name).toBe('launch_app_logs_sim');
      expect(typeof launchAppLogsSim.handler).toBe('function');
      expect(launchAppLogsSim.schema).toBeDefined();
      expect(typeof launchAppLogsSim.description).toBe('string');
    });
  });

  describe('launch_app_sim re-export', () => {
    it('should re-export launch_app_sim tool correctly', () => {
      expect(launchAppSim.name).toBe('launch_app_sim');
      expect(typeof launchAppSim.handler).toBe('function');
      expect(launchAppSim.schema).toBeDefined();
      expect(typeof launchAppSim.description).toBe('string');
    });
  });

  describe('list_sims re-export', () => {
    it('should re-export list_sims tool correctly', () => {
      expect(listSims.name).toBe('list_sims');
      expect(typeof listSims.handler).toBe('function');
      expect(listSims.schema).toBeDefined();
      expect(typeof listSims.description).toBe('string');
    });
  });

  describe('open_sim re-export', () => {
    it('should re-export open_sim tool correctly', () => {
      expect(openSim.name).toBe('open_sim');
      expect(typeof openSim.handler).toBe('function');
      expect(openSim.schema).toBeDefined();
      expect(typeof openSim.description).toBe('string');
    });
  });

  describe('reset_network_condition re-export', () => {
    it('should re-export reset_network_condition tool correctly', () => {
      expect(resetNetworkCondition.name).toBe('reset_network_condition');
      expect(typeof resetNetworkCondition.handler).toBe('function');
      expect(resetNetworkCondition.schema).toBeDefined();
      expect(typeof resetNetworkCondition.description).toBe('string');
    });
  });

  describe('reset_simulator_location re-export', () => {
    it('should re-export reset_simulator_location tool correctly', () => {
      expect(resetSimulatorLocation.name).toBe('reset_simulator_location');
      expect(typeof resetSimulatorLocation.handler).toBe('function');
      expect(resetSimulatorLocation.schema).toBeDefined();
      expect(typeof resetSimulatorLocation.description).toBe('string');
    });
  });

  describe('screenshot re-export', () => {
    it('should re-export screenshot tool correctly', () => {
      expect(screenshot.name).toBe('screenshot');
      expect(typeof screenshot.handler).toBe('function');
      expect(screenshot.schema).toBeDefined();
      expect(typeof screenshot.description).toBe('string');
    });
  });

  describe('set_network_condition re-export', () => {
    it('should re-export set_network_condition tool correctly', () => {
      expect(setNetworkCondition.name).toBe('set_network_condition');
      expect(typeof setNetworkCondition.handler).toBe('function');
      expect(setNetworkCondition.schema).toBeDefined();
      expect(typeof setNetworkCondition.description).toBe('string');
    });
  });

  describe('set_sim_appearance re-export', () => {
    it('should re-export set_sim_appearance tool correctly', () => {
      expect(setSimAppearance.name).toBe('set_sim_appearance');
      expect(typeof setSimAppearance.handler).toBe('function');
      expect(setSimAppearance.schema).toBeDefined();
      expect(typeof setSimAppearance.description).toBe('string');
    });
  });

  describe('set_simulator_location re-export', () => {
    it('should re-export set_simulator_location tool correctly', () => {
      expect(setSimulatorLocation.name).toBe('set_simulator_location');
      expect(typeof setSimulatorLocation.handler).toBe('function');
      expect(setSimulatorLocation.schema).toBeDefined();
      expect(typeof setSimulatorLocation.description).toBe('string');
    });
  });

  describe('stop_app_sim re-export', () => {
    it('should re-export stop_app_sim tool correctly', () => {
      expect(stopAppSim.name).toBe('stop_app_sim');
      expect(typeof stopAppSim.handler).toBe('function');
      expect(stopAppSim.schema).toBeDefined();
      expect(typeof stopAppSim.description).toBe('string');
    });
  });

  describe('All re-exports validation', () => {
    const reExports = [
      { tool: bootSim, name: 'boot_sim' },
      { tool: describeUi, name: 'describe_ui' },
      { tool: installAppSim, name: 'install_app_sim' },
      { tool: launchAppLogsSim, name: 'launch_app_logs_sim' },
      { tool: launchAppSim, name: 'launch_app_sim' },
      { tool: listSims, name: 'list_sims' },
      { tool: openSim, name: 'open_sim' },
      { tool: resetNetworkCondition, name: 'reset_network_condition' },
      { tool: resetSimulatorLocation, name: 'reset_simulator_location' },
      { tool: screenshot, name: 'screenshot' },
      { tool: setNetworkCondition, name: 'set_network_condition' },
      { tool: setSimAppearance, name: 'set_sim_appearance' },
      { tool: setSimulatorLocation, name: 'set_simulator_location' },
      { tool: stopAppSim, name: 'stop_app_sim' },
    ];

    it('should have all required tool properties', () => {
      reExports.forEach(({ tool, name }) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('schema');
        expect(tool).toHaveProperty('handler');
        expect(tool.name).toBe(name);
      });
    });

    it('should have callable handlers', () => {
      reExports.forEach(({ tool, name }) => {
        expect(typeof tool.handler).toBe('function');
        expect(tool.handler.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid schemas', () => {
      reExports.forEach(({ tool, name }) => {
        expect(tool.schema).toBeDefined();
        expect(typeof tool.schema).toBe('object');
      });
    });

    it('should have non-empty descriptions', () => {
      reExports.forEach(({ tool, name }) => {
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });
  });
});
