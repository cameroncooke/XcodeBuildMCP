import { getConfig } from './config-store.ts';

const XCODE_IDE_WORKFLOW = 'xcode-ide';
const XCODE_IDE_DEBUG_TOOLS = new Set([
  'xcode_tools_bridge_status',
  'xcode_tools_bridge_sync',
  'xcode_tools_bridge_disconnect',
]);

export function shouldExposeTool(workflowDirectoryName: string, toolName: string): boolean {
  if (workflowDirectoryName !== XCODE_IDE_WORKFLOW) return true;
  if (!XCODE_IDE_DEBUG_TOOLS.has(toolName)) return true;
  return getConfig().debug;
}
