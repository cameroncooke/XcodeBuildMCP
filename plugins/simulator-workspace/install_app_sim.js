import {
  installAppSimToolName,
  installAppSimToolDescription,
  installAppSimToolSchema,
  installAppSimToolHandler
} from '../../src/tools/simulator/index.js';

export default {
  name: installAppSimToolName,
  description: installAppSimToolDescription,
  schema: installAppSimToolSchema,
  handler: installAppSimToolHandler,
};