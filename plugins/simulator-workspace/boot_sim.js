import {
  bootSimToolName,
  bootSimToolDescription,
  bootSimToolSchema,
  bootSimToolHandler
} from '../../src/tools/simulator/index.js';

export default {
  name: bootSimToolName,
  description: bootSimToolDescription,
  schema: bootSimToolSchema,
  handler: bootSimToolHandler,
};