import {
  launchAppLogsSimToolName,
  launchAppLogsSimToolDescription,
  launchAppLogsSimToolSchema,
  launchAppLogsSimToolHandler,
} from '../../src/tools/simulator/index.js';

export default {
  name: launchAppLogsSimToolName,
  description: launchAppLogsSimToolDescription,
  schema: launchAppLogsSimToolSchema,
  handler: launchAppLogsSimToolHandler,
};