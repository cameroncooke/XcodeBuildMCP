/**
 * Plugin wrapper for start_sim_log_cap tool
 */
import {
  startSimLogCapToolName,
  startSimLogCapToolDescription,
  startSimLogCapToolSchema,
  startSimLogCapToolHandler,
} from '../../src/tools/log/index.js';

export default {
  name: startSimLogCapToolName,
  description: startSimLogCapToolDescription,
  schema: startSimLogCapToolSchema,
  handler: startSimLogCapToolHandler,
};