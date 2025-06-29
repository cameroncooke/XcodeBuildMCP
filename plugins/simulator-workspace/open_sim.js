import {
  openSimToolName,
  openSimToolDescription,
  openSimToolSchema,
  openSimToolHandler,
} from '../../src/tools/simulator/index.js';

export default {
  name: openSimToolName,
  description: openSimToolDescription,
  schema: openSimToolSchema,
  handler: openSimToolHandler,
};