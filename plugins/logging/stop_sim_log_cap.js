import {
  stopSimLogCapToolName,
  stopSimLogCapToolDescription,
  stopSimLogCapToolSchema,
  stopSimLogCapToolHandler
} from '../../src/tools/log/index.js';

export default {
  name: stopSimLogCapToolName,
  description: stopSimLogCapToolDescription,
  schema: stopSimLogCapToolSchema,
  handler: stopSimLogCapToolHandler,
};