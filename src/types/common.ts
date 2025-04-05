/**
 * Common type definitions used across the server
 */

/**
 * ToolResponse - Standard response format for tools
 * Compatible with MCP CallToolResult interface from the SDK
 */
export interface ToolResponse {
  content: ToolResponseContent[];
  isError?: boolean;
  _meta?: Record<string, unknown>;
  [key: string]: unknown; // Index signature to match CallToolResult
}

/**
 * Contents that can be included in a tool response
 */
export type ToolResponseContent = {
  type: 'text';
  text: string;
  [key: string]: unknown; // Index signature to match ContentItem
};

/**
 * ToolProgressUpdate - Structure for progress updates during long-running operations
 */
export interface ToolProgressUpdate {
  operationId: string;
  status: 'running' | 'completed' | 'failed';
  progress?: number; // 0-100 percentage
  message: string;
  timestamp: string;
  details?: string;
}

/**
 * ValidationResult - Result of parameter validation operations
 */
export interface ValidationResult {
  isValid: boolean;
  errorResponse?: ToolResponse;
  warningResponse?: ToolResponse;
}
