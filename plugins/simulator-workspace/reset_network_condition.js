/**
 * Reset Network Condition Plugin
 * 
 * Resets network conditions to default in the simulator.
 */

import {
  resetNetworkConditionToolName,
  resetNetworkConditionToolDescription,
  resetNetworkConditionToolSchema,
  resetNetworkConditionToolHandler,
} from '../../src/tools/simulator/index.js';

export default {
  name: resetNetworkConditionToolName,
  description: resetNetworkConditionToolDescription,
  schema: resetNetworkConditionToolSchema,
  handler: resetNetworkConditionToolHandler,
};