import {
  cleanProjToolName,
  cleanProjToolDescription,
  cleanProjToolSchema,
  cleanProjToolHandler
} from '../../src/tools/clean/index.js';

export default {
  name: cleanProjToolName,
  description: cleanProjToolDescription,
  schema: cleanProjToolSchema,
  handler: cleanProjToolHandler,
};