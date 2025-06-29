import {
  getDeviceAppPathProjToolName,
  getDeviceAppPathProjToolDescription,
  getDeviceAppPathProjToolSchema,
  getDeviceAppPathProjToolHandler
} from '../../src/tools/app-path/index.js';

export default {
  name: getDeviceAppPathProjToolName,
  description: getDeviceAppPathProjToolDescription,
  schema: getDeviceAppPathProjToolSchema,
  handler: getDeviceAppPathProjToolHandler,
};