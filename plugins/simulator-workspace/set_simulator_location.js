/**
 * Plugin: set_simulator_location
 * 
 * Sets a custom GPS location for the simulator.
 */

import {
  setSimulatorLocationToolName,
  setSimulatorLocationToolDescription,
  setSimulatorLocationToolSchema,
  setSimulatorLocationToolHandler,
} from '../../src/tools/simulator/index.js';

export default {
  name: setSimulatorLocationToolName,
  description: setSimulatorLocationToolDescription,
  schema: setSimulatorLocationToolSchema,
  handler: setSimulatorLocationToolHandler,
};