import { describe, it, expect } from 'vitest';
import {
  renderNextStep,
  renderNextStepsSection,
  processToolResponse,
} from '../next-steps-renderer.ts';
import type { NextStep, ToolResponse } from '../../../types/common.ts';

describe('next-steps-renderer', () => {
  describe('renderNextStep', () => {
    it('should format step for CLI with workflow and no params', () => {
      const step: NextStep = {
        tool: 'open_sim',
        cliTool: 'open-sim',
        workflow: 'simulator',
        label: 'Open the Simulator app',
        params: {},
      };

      const result = renderNextStep(step, 'cli');
      expect(result).toBe('Open the Simulator app: xcodebuildmcp simulator open-sim');
    });

    it('should format step for CLI with workflow and params', () => {
      const step: NextStep = {
        tool: 'install_app_sim',
        cliTool: 'install-app-sim',
        workflow: 'simulator',
        label: 'Install an app',
        params: { simulatorId: 'ABC123', appPath: '/path/to/app' },
      };

      const result = renderNextStep(step, 'cli');
      expect(result).toBe(
        'Install an app: xcodebuildmcp simulator install-app-sim --simulator-id "ABC123" --app-path "/path/to/app"',
      );
    });

    it('should use cliTool for CLI rendering', () => {
      const step: NextStep = {
        tool: 'install_app_sim',
        cliTool: 'install-app',
        workflow: 'simulator',
        label: 'Install an app',
        params: { simulatorId: 'ABC123' },
      };

      const result = renderNextStep(step, 'cli');
      expect(result).toBe(
        'Install an app: xcodebuildmcp simulator install-app --simulator-id "ABC123"',
      );
    });

    it('should throw error for CLI without cliTool', () => {
      const step: NextStep = {
        tool: 'open_sim',
        label: 'Open the Simulator app',
        params: {},
      };

      expect(() => renderNextStep(step, 'cli')).toThrow(
        "Next step for tool 'open_sim' is missing cliTool - ensure enrichNextStepsForCli was called",
      );
    });

    it('should format step for CLI without workflow', () => {
      const step: NextStep = {
        tool: 'open_sim',
        cliTool: 'open-sim',
        label: 'Open the Simulator app',
        params: {},
      };

      const result = renderNextStep(step, 'cli');
      expect(result).toBe('Open the Simulator app: xcodebuildmcp open-sim');
    });

    it('should format step for CLI with boolean param (true)', () => {
      const step: NextStep = {
        tool: 'some_tool',
        cliTool: 'some-tool',
        label: 'Do something',
        params: { verbose: true },
      };

      const result = renderNextStep(step, 'cli');
      expect(result).toBe('Do something: xcodebuildmcp some-tool --verbose');
    });

    it('should format step for CLI with boolean param (false)', () => {
      const step: NextStep = {
        tool: 'some_tool',
        cliTool: 'some-tool',
        label: 'Do something',
        params: { verbose: false },
      };

      const result = renderNextStep(step, 'cli');
      expect(result).toBe('Do something: xcodebuildmcp some-tool');
    });

    it('should format step for MCP with no params', () => {
      const step: NextStep = {
        tool: 'open_sim',
        label: 'Open the Simulator app',
        params: {},
      };

      const result = renderNextStep(step, 'mcp');
      expect(result).toBe('Open the Simulator app: open_sim()');
    });

    it('should format step for MCP with params', () => {
      const step: NextStep = {
        tool: 'install_app_sim',
        label: 'Install an app',
        params: { simulatorId: 'ABC123', appPath: '/path/to/app' },
      };

      const result = renderNextStep(step, 'mcp');
      expect(result).toBe(
        'Install an app: install_app_sim({ simulatorId: "ABC123", appPath: "/path/to/app" })',
      );
    });

    it('should format step for MCP with numeric param', () => {
      const step: NextStep = {
        tool: 'some_tool',
        label: 'Do something',
        params: { count: 42 },
      };

      const result = renderNextStep(step, 'mcp');
      expect(result).toBe('Do something: some_tool({ count: 42 })');
    });

    it('should format step for MCP with boolean param', () => {
      const step: NextStep = {
        tool: 'some_tool',
        label: 'Do something',
        params: { verbose: true },
      };

      const result = renderNextStep(step, 'mcp');
      expect(result).toBe('Do something: some_tool({ verbose: true })');
    });

    it('should handle daemon runtime same as MCP', () => {
      const step: NextStep = {
        tool: 'open_sim',
        label: 'Open the Simulator app',
        params: {},
      };

      const result = renderNextStep(step, 'daemon');
      expect(result).toBe('Open the Simulator app: open_sim()');
    });
  });

  describe('renderNextStepsSection', () => {
    it('should return empty string for empty steps', () => {
      const result = renderNextStepsSection([], 'cli');
      expect(result).toBe('');
    });

    it('should render numbered list for CLI', () => {
      const steps: NextStep[] = [
        { tool: 'open_sim', cliTool: 'open-sim', label: 'Open Simulator', params: {} },
        {
          tool: 'install_app_sim',
          cliTool: 'install-app-sim',
          label: 'Install app',
          params: { simulatorId: 'X' },
        },
      ];

      const result = renderNextStepsSection(steps, 'cli');
      expect(result).toBe(
        '\n\nNext steps:\n' +
          '1. Open Simulator: xcodebuildmcp open-sim\n' +
          '2. Install app: xcodebuildmcp install-app-sim --simulator-id "X"',
      );
    });

    it('should render numbered list for MCP', () => {
      const steps: NextStep[] = [
        { tool: 'open_sim', label: 'Open Simulator', params: {} },
        { tool: 'install_app_sim', label: 'Install app', params: { simulatorId: 'X' } },
      ];

      const result = renderNextStepsSection(steps, 'mcp');
      expect(result).toBe(
        '\n\nNext steps:\n' +
          '1. Open Simulator: open_sim()\n' +
          '2. Install app: install_app_sim({ simulatorId: "X" })',
      );
    });

    it('should sort by priority', () => {
      const steps: NextStep[] = [
        { tool: 'third', label: 'Third', params: {}, priority: 3 },
        { tool: 'first', label: 'First', params: {}, priority: 1 },
        { tool: 'second', label: 'Second', params: {}, priority: 2 },
      ];

      const result = renderNextStepsSection(steps, 'mcp');
      expect(result).toContain('1. First: first()');
      expect(result).toContain('2. Second: second()');
      expect(result).toContain('3. Third: third()');
    });

    it('should handle missing priority (defaults to 0)', () => {
      const steps: NextStep[] = [
        { tool: 'later', label: 'Later', params: {}, priority: 1 },
        { tool: 'first', label: 'First', params: {} },
      ];

      const result = renderNextStepsSection(steps, 'mcp');
      expect(result).toContain('1. First: first()');
      expect(result).toContain('2. Later: later()');
    });
  });

  describe('processToolResponse', () => {
    it('should pass through response with no nextSteps', () => {
      const response: ToolResponse = {
        content: [{ type: 'text', text: 'Success!' }],
      };

      const result = processToolResponse(response, 'cli', 'normal');
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Success!' }],
      });
    });

    it('should strip nextSteps in minimal style', () => {
      const response: ToolResponse = {
        content: [{ type: 'text', text: 'Success!' }],
        nextSteps: [{ tool: 'foo', cliTool: 'foo', label: 'Do foo', params: {} }],
      };

      const result = processToolResponse(response, 'cli', 'minimal');
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Success!' }],
      });
      expect(result.nextSteps).toBeUndefined();
    });

    it('should append next steps to last text content in normal style', () => {
      const response: ToolResponse = {
        content: [{ type: 'text', text: 'Simulator booted.' }],
        nextSteps: [
          {
            tool: 'open_sim',
            cliTool: 'open-sim',
            label: 'Open Simulator',
            params: {},
            priority: 1,
          },
        ],
      };

      const result = processToolResponse(response, 'cli', 'normal');
      expect(result.content[0].text).toBe(
        'Simulator booted.\n\nNext steps:\n1. Open Simulator: xcodebuildmcp open-sim',
      );
      expect(result.nextSteps).toBeUndefined();
    });

    it('should render MCP-style for MCP runtime', () => {
      const response: ToolResponse = {
        content: [{ type: 'text', text: 'Simulator booted.' }],
        nextSteps: [{ tool: 'open_sim', label: 'Open Simulator', params: {}, priority: 1 }],
      };

      const result = processToolResponse(response, 'mcp', 'normal');
      expect(result.content[0].text).toBe(
        'Simulator booted.\n\nNext steps:\n1. Open Simulator: open_sim()',
      );
    });

    it('should handle response with empty nextSteps array', () => {
      const response: ToolResponse = {
        content: [{ type: 'text', text: 'Done.' }],
        nextSteps: [],
      };

      const result = processToolResponse(response, 'cli', 'normal');
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Done.' }],
      });
    });

    it('should preserve other response properties', () => {
      const response: ToolResponse = {
        content: [{ type: 'text', text: 'Error!' }],
        isError: true,
        _meta: { foo: 'bar' },
        nextSteps: [{ tool: 'retry', cliTool: 'retry', label: 'Retry', params: {} }],
      };

      const result = processToolResponse(response, 'cli', 'minimal');
      expect(result.isError).toBe(true);
      expect(result._meta).toEqual({ foo: 'bar' });
    });

    it('should not mutate original response', () => {
      const response: ToolResponse = {
        content: [{ type: 'text', text: 'Original' }],
        nextSteps: [{ tool: 'foo', cliTool: 'foo', label: 'Foo', params: {} }],
      };

      processToolResponse(response, 'cli', 'normal');

      expect(response.content[0].text).toBe('Original');
      expect(response.nextSteps).toHaveLength(1);
    });

    it('should default to normal style when not specified', () => {
      const response: ToolResponse = {
        content: [{ type: 'text', text: 'Success!' }],
        nextSteps: [{ tool: 'foo', cliTool: 'foo', label: 'Do foo', params: {} }],
      };

      const result = processToolResponse(response, 'cli');
      expect(result.content[0].text).toContain('Next steps:');
    });
  });
});
