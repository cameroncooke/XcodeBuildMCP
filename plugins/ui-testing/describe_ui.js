import {
  describeUIToolName,
  describeUIToolDescription,
  describeUIToolSchema,
  describeUIToolHandler,
} from '../../src/tools/axe/index.js';

export default {
  name: describeUIToolName,
  description: describeUIToolDescription,
  schema: describeUIToolSchema,
  handler: describeUIToolHandler,
};