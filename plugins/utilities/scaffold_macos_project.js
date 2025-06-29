import {
  scaffoldMacosProjectToolName,
  scaffoldMacosProjectToolDescription,
  scaffoldMacosProjectToolSchema,
  scaffoldMacosProjectToolHandler
} from '../../src/tools/scaffold/index.js';

export default {
  name: scaffoldMacosProjectToolName,
  description: scaffoldMacosProjectToolDescription,
  schema: scaffoldMacosProjectToolSchema,
  handler: scaffoldMacosProjectToolHandler,
};