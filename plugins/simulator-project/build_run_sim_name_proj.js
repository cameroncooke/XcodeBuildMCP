import {
  buildRunSimNameProjToolName,
  buildRunSimNameProjToolDescription,
  buildRunSimNameProjToolSchema,
  buildRunSimNameProjToolHandler
} from '../../src/tools/build-ios-simulator/index.js';

export default {
  name: buildRunSimNameProjToolName,
  description: buildRunSimNameProjToolDescription,
  schema: buildRunSimNameProjToolSchema,
  handler: buildRunSimNameProjToolHandler,
};