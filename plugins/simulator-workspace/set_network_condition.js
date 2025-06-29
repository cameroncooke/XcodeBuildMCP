/**
 * set_network_condition tool plugin
 * Simulates different network conditions in the simulator
 */

import {
  setNetworkConditionToolName,
  setNetworkConditionToolDescription,
  setNetworkConditionToolSchema,
  setNetworkConditionToolHandler,
} from '../../src/tools/simulator/index.js';

export default {
  name: setNetworkConditionToolName,
  description: setNetworkConditionToolDescription,
  schema: setNetworkConditionToolSchema,
  handler: setNetworkConditionToolHandler,
};