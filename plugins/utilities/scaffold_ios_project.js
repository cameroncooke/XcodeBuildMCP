import {
  scaffoldIosProjectToolName,
  scaffoldIosProjectToolDescription,
  scaffoldIosProjectToolSchema,
  scaffoldIosProjectToolHandler
} from '../../src/tools/scaffold/index.js';

export default {
  name: scaffoldIosProjectToolName,
  description: scaffoldIosProjectToolDescription,
  schema: scaffoldIosProjectToolSchema,
  handler: scaffoldIosProjectToolHandler,
};