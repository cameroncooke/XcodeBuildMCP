import {
  diagnosticToolName,
  diagnosticToolDescription,
  diagnosticToolSchema,
  diagnosticToolHandler
} from '../../src/tools/diagnostic/index.js';

export default {
  name: diagnosticToolName,
  description: diagnosticToolDescription,
  schema: diagnosticToolSchema,
  handler: diagnosticToolHandler,
};