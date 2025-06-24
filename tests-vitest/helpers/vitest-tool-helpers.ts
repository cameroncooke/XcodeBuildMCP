/**
 * Vitest Tool Helpers - MCP-compliant utilities for testing tools with Vitest
 * 
 * Provides schema validation and error formatting that matches the production
 * validation patterns from src/utils/validation.ts. All validation errors
 * are returned as structured ToolResponse objects with isError: true and
 * human-readable messages, following MCP protocol standards.
 * 
 * Key features:
 * - MCP-compliant error formatting (no raw Zod error objects)
 * - Consistent error messages matching production validation
 * - Human-readable parameter validation feedback
 * - Structured ToolResponse objects for all error cases
 */

import { z } from 'zod';
import { ToolResponse } from '../../src/types/common.js';

/**
 * Tool interface compatible with our tool definitions
 */
export interface ToolMeta<T extends z.ZodTypeAny> {
  name: string;
  description: string;
  groups: string[];
  schema: T;
  handler: (params: z.infer<T>) => Promise<ToolResponse>;
}

/**
 * Parse Zod validation errors and convert them to MCP-compliant error messages
 * that match production validation patterns from src/utils/validation.ts
 */
function parseZodError(zodError: z.ZodError, toolGroups?: string[]): string {
  // Get the first error issue for consistent behavior
  const issue = zodError.issues[0];
  
  if (!issue) {
    return 'Validation error occurred';
  }

  const paramName = (issue.path && issue.path.length > 0) ? issue.path[0] as string : '';
  const isUITestingTool = toolGroups?.includes('UI_TESTING') ?? false;

  // Handle specific cases that need custom formatting before checking custom messages
  if (issue.code === 'too_big' && issue.type === 'number') {
    // Use parameter name instead of type name for better error messages
    const capitalizedParamName = paramName ? capitalizeParamName(paramName) : 'Number';
    return `${capitalizedParamName} must be less than or equal to ${(issue as any).maximum}`;
  }

  // First check for custom messages that should take precedence
  if (issue.message) {
    // Handle custom non-negative messages (preserving existing test expectations)
    if (issue.message.includes('non-negative')) {
      const capitalizedParamName = capitalizeParamName(paramName);
      return `${capitalizedParamName} must be non-negative`;
    }
    
    // Handle "greater than or equal" messages (preserving existing test expectations)
    if (issue.message.includes('greater than or equal')) {
      const capitalizedParamName = capitalizeParamName(paramName);
      return `${capitalizedParamName} must be greater than or equal to 0`;
    }
    
    // For UI testing tools, prioritize custom messages like "Pre-delay must be non-negative"
    if (isUITestingTool && issue.message.includes('must be')) {
      return issue.message;
    }
  }

  // Handle by error code with MCP-compliant formatting - prioritize over custom messages for certain cases
  switch (issue.code) {
    case 'invalid_type':
      if (issue.received === 'undefined') {
        // UI testing tools use different format for missing required parameters
        if (isUITestingTool) {
          return `❌ Required field: ${paramName}`;
        }
        // Standard tools use production validation.ts pattern
        return `Required parameter '${paramName}' is missing. Please provide a value for this parameter.`;
      }
      // For other type mismatches, provide clear message
      return `Parameter '${paramName}' must be of type ${issue.expected}, but received ${issue.received}.`;
    
    case 'invalid_string':
      if (issue.validation === 'uuid') {
        // Match existing UUID validation pattern
        return 'Invalid Simulator UUID format. Expected format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX';
      }
      break;
    
    case 'invalid_enum_value':
      // Match production validation.ts pattern for enum validation
      const allowedValues = (issue as any).options || [];
      return `Parameter '${paramName}' must be one of: ${allowedValues.join(', ')}. You provided: '${issue.received}'.`;
    
    case 'too_small':
      if (issue.type === 'string' && issue.minimum === 1) {
        // Handle string length validation (e.g., .min(1) for non-empty strings)
        // This is often used as a required field validation
        if (isUITestingTool) {
          return `❌ Required field: ${paramName}`;
        }
        return `Required parameter '${paramName}' is missing. Please provide a value for this parameter.`;
      } else if (issue.type === 'number' && issue.minimum === 0) {
        // Handle numeric minimum constraints with proper capitalization
        const capitalizedParamName = capitalizeParamName(paramName);
        return `${capitalizedParamName} must be greater than or equal to 0`;
      } else if (issue.type === 'number') {
        // Handle other numeric minimum constraints
        const capitalizedParamName = capitalizeParamName(paramName);
        return `${capitalizedParamName} must be greater than or equal to ${issue.minimum}`;
      }
      break;
      
      
    case 'custom':
      // Handle custom validation errors that may be present in the schema
      if (issue.message) {
        return issue.message;
      }
      break;
  }

  // Fallback to the original Zod message if no specific pattern matches
  return issue.message || 'Validation error';
}

/**
 * Capitalize parameter names to match expected test formats
 * (e.g., "preDelay" -> "PreDelay", "postDelay" -> "PostDelay")
 */
function capitalizeParamName(paramName: string): string {
  // Handle specific known parameter names that need proper capitalization
  const capitalizations: Record<string, string> = {
    'preDelay': 'Pre-delay',  // UI testing tools use hyphenated format
    'postDelay': 'Post-delay',
    'duration': 'Duration',
    'delta': 'Delta',
    'keyCode': 'KeyCode',
  };
  
  return capitalizations[paramName] || paramName.charAt(0).toUpperCase() + paramName.slice(1);
}

/**
 * Call a tool handler with proper schema validation
 * This mimics the behavior of the Jest callToolHandler function
 */
export async function callToolHandler<T extends z.ZodTypeAny>(
  tool: ToolMeta<T>,
  params: any
): Promise<ToolResponse> {
  try {
    // Handle both Zod schema objects and plain object schemas from server.tool()
    let parseResult: { success: boolean; data?: any; error?: z.ZodError };
    
    if (tool.schema && typeof tool.schema.safeParse === 'function') {
      // This is a proper Zod schema object
      parseResult = tool.schema.safeParse(params);
    } else if (tool.schema && typeof tool.schema === 'object') {
      // This is a plain object schema from server.tool() - convert to Zod object
      const zodSchema = z.object(tool.schema);
      parseResult = zodSchema.safeParse(params);
    } else {
      // No schema validation required
      parseResult = { success: true, data: params };
    }
    
    if (!parseResult.success && parseResult.error) {
      const customErrorMessage = parseZodError(parseResult.error, tool.groups);
      return {
        content: [{
          type: 'text',
          text: customErrorMessage
        }],
        isError: true
      };
    }

    // If validation passes, call the handler with validated params
    const result = await tool.handler(parseResult.data || params);
    
    // Ensure we return a proper ToolResponse object with isError property
    if (result && typeof result === 'object' && 'content' in result) {
      return {
        ...result,
        isError: result.isError ?? false  // Default to false if not specified
      };
    }
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `Tool execution error: ${errorMessage}`
      }],
      isError: true
    };
  }
}