import type { RuntimeKind } from '../../runtime/types.ts';
import type { NextStep, OutputStyle, ToolResponse } from '../../types/common.ts';
import { toKebabCase } from '../../runtime/naming.ts';

/**
 * Format a single next step for CLI output.
 * Example: xcodebuildmcp simulator open-sim
 * Example: xcodebuildmcp simulator install-app-sim --simulator-id "ABC123" --app-path "PATH"
 */
function formatNextStepForCli(step: NextStep): string {
  const cliName = step.cliTool ?? toKebabCase(step.tool);
  const parts = ['xcodebuildmcp'];

  // Include workflow as subcommand if provided
  if (step.workflow) {
    parts.push(step.workflow);
  }

  parts.push(cliName);

  for (const [key, value] of Object.entries(step.params)) {
    const flagName = toKebabCase(key);
    if (typeof value === 'boolean') {
      if (value) {
        parts.push(`--${flagName}`);
      }
    } else {
      parts.push(`--${flagName} "${String(value)}"`);
    }
  }

  return parts.join(' ');
}

/**
 * Format a single next step for MCP output.
 * Example: open_sim()
 * Example: install_app_sim({ simulatorId: "ABC123", appPath: "PATH" })
 */
function formatNextStepForMcp(step: NextStep): string {
  const paramEntries = Object.entries(step.params);
  if (paramEntries.length === 0) {
    return `${step.tool}()`;
  }

  const paramsStr = paramEntries
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}: "${value}"`;
      }
      return `${key}: ${String(value)}`;
    })
    .join(', ');

  return `${step.tool}({ ${paramsStr} })`;
}

/**
 * Render a single next step based on runtime.
 */
export function renderNextStep(step: NextStep, runtime: RuntimeKind): string {
  const formatted = runtime === 'cli' ? formatNextStepForCli(step) : formatNextStepForMcp(step);
  return `${step.label}: ${formatted}`;
}

/**
 * Render the full next steps section.
 * Returns empty string if no steps.
 */
export function renderNextStepsSection(steps: NextStep[], runtime: RuntimeKind): string {
  if (steps.length === 0) {
    return '';
  }

  const sorted = [...steps].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  const lines = sorted.map((step, index) => `${index + 1}. ${renderNextStep(step, runtime)}`);

  return `\n\nNext steps:\n${lines.join('\n')}`;
}

/**
 * Process a tool response, applying next steps rendering based on runtime and style.
 *
 * - In 'minimal' style, nextSteps are stripped entirely
 * - In 'normal' style, nextSteps are rendered and appended to text content
 *
 * Returns a new response object (does not mutate the original).
 */
export function processToolResponse(
  response: ToolResponse,
  runtime: RuntimeKind,
  style: OutputStyle = 'normal',
): ToolResponse {
  const { nextSteps, ...rest } = response;

  // If no nextSteps or minimal style, strip nextSteps and return
  if (!nextSteps || nextSteps.length === 0 || style === 'minimal') {
    return { ...rest };
  }

  // Render next steps section
  const nextStepsSection = renderNextStepsSection(nextSteps, runtime);

  // Append to the last text content item
  const processedContent = response.content.map((item, index) => {
    if (item.type === 'text' && index === response.content.length - 1) {
      return { ...item, text: item.text + nextStepsSection };
    }
    return item;
  });

  // If no text content existed, add one with just the next steps
  const hasTextContent = response.content.some((item) => item.type === 'text');
  if (!hasTextContent && nextStepsSection) {
    processedContent.push({ type: 'text', text: nextStepsSection.trim() });
  }

  return { ...rest, content: processedContent };
}
