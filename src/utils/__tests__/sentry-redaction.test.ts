import { describe, expect, it } from 'vitest';
import type * as Sentry from '@sentry/node';
import {
  __parseXcodeVersionForTests,
  __redactEventForTests,
  __redactLogForTests,
} from '../sentry.ts';

describe('sentry redaction', () => {
  it('removes identity/request context and redacts user paths', () => {
    const event: Sentry.Event = {
      message: 'failed to open /Users/cam/project/App/AppDelegate.swift',
      user: { id: '123' },
      request: { url: 'https://example.com' },
      breadcrumbs: [{ category: 'test', message: '/Users/cam/tmp' }],
      exception: {
        values: [
          {
            type: 'Error',
            value: 'build failed in /Users/cam/project',
            stacktrace: {
              frames: [
                {
                  abs_path: '/Users/cam/project/src/tool.ts',
                  filename: '/Users/cam/project/src/tool.ts',
                },
              ],
            },
          },
        ],
      },
      extra: {
        output: 'log at /Users/cam/project/build.log',
        attempts: 1,
      },
    };

    const redacted = __redactEventForTests(event);

    expect(redacted.user).toBeUndefined();
    expect(redacted.request).toBeUndefined();
    expect(redacted.breadcrumbs).toBeUndefined();
    expect(redacted.message).toContain('/Users/<redacted>/project/App/AppDelegate.swift');
    expect(redacted.exception?.values?.[0]?.value).toContain('/Users/<redacted>/project');
    expect(redacted.exception?.values?.[0]?.stacktrace?.frames?.[0]?.abs_path).toContain(
      '/Users/<redacted>/project/src/tool.ts',
    );
    expect(redacted.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename).toContain(
      '/Users/<redacted>/project/src/tool.ts',
    );
    expect(redacted.extra?.output).toBe('log at /Users/<redacted>/project/build.log');
    expect(redacted.extra?.attempts).toBe(1);
  });

  it('parses xcode version metadata safely', () => {
    const parsed = __parseXcodeVersionForTests('Xcode 16.3\nBuild version 16E123\n');
    expect(parsed).toEqual({ version: '16.3', buildVersion: '16E123' });
  });

  it('redacts user paths in log payloads', () => {
    const log: Sentry.Log = {
      level: 'info',
      message: 'tool failed at /Users/cam/project/build.log',
      attributes: {
        file: '/Users/cam/project/App/AppDelegate.swift',
        nested: { cwd: '/Users/cam/project' },
      },
    };

    const redacted = __redactLogForTests(log);

    expect(redacted).toEqual({
      level: 'info',
      message: 'tool failed at /Users/<redacted>/project/build.log',
      attributes: {
        file: '/Users/<redacted>/project/App/AppDelegate.swift',
        nested: { cwd: '/Users/<redacted>/project' },
      },
    });
  });
});
