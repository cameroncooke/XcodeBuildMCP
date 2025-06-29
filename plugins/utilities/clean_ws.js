import {
  cleanWsToolName,
  cleanWsToolDescription,
  cleanWsToolSchema,
  cleanWsToolHandler
} from '../../src/tools/clean/index.js';

export default {
  name: cleanWsToolName,
  description: cleanWsToolDescription,
  schema: cleanWsToolSchema,
  handler: cleanWsToolHandler,
};