import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { InteractiveProcess, InteractiveSpawner } from '../../../execution/index.ts';
import { describe, expect, it } from 'vitest';

import { DapTransport } from '../transport.ts';
import type { DapEvent, DapResponse } from '../types.ts';
type TestSession = {
  stdout: PassThrough;
  stderr: PassThrough;
  stdin: PassThrough;
  emitExit: (code?: number | null, signal?: NodeJS.Signals | null) => void;
  emitError: (error: Error) => void;
};

function encodeMessage(message: Record<string, unknown>): string {
  const payload = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`;
}

function buildResponse(
  requestSeq: number,
  command: string,
  body?: Record<string, unknown>,
): DapResponse {
  return {
    seq: requestSeq + 100,
    type: 'response',
    request_seq: requestSeq,
    success: true,
    command,
    body,
  };
}

function createTestSpawner(): { spawner: InteractiveSpawner; session: TestSession } {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdin = new PassThrough();
  const emitter = new EventEmitter();
  const mockProcess = emitter as unknown as ChildProcess;
  const mutableProcess = mockProcess as unknown as {
    stdout: PassThrough | null;
    stderr: PassThrough | null;
    stdin: PassThrough | null;
    killed: boolean;
    exitCode: number | null;
    signalCode: NodeJS.Signals | null;
    spawnargs: string[];
    spawnfile: string;
    pid: number;
  };

  mutableProcess.stdout = stdout;
  mutableProcess.stderr = stderr;
  mutableProcess.stdin = stdin;
  mutableProcess.killed = false;
  mutableProcess.exitCode = null;
  mutableProcess.signalCode = null;
  mutableProcess.spawnargs = [];
  mutableProcess.spawnfile = 'mock';
  mutableProcess.pid = 12345;
  mockProcess.kill = ((signal?: NodeJS.Signals): boolean => {
    mutableProcess.killed = true;
    emitter.emit('exit', 0, signal ?? null);
    return true;
  }) as ChildProcess['kill'];

  const session: TestSession = {
    stdout,
    stderr,
    stdin,
    emitExit: (code = 0, signal = null) => {
      emitter.emit('exit', code, signal);
    },
    emitError: (error) => {
      emitter.emit('error', error);
    },
  };

  const spawner: InteractiveSpawner = (): InteractiveProcess => ({
    process: mockProcess,
    write(data: string): void {
      stdin.write(data);
    },
    kill(signal?: NodeJS.Signals): void {
      mockProcess.kill?.(signal);
    },
    dispose(): void {
      stdout.end();
      stderr.end();
      stdin.end();
      emitter.removeAllListeners();
    },
  });

  return { spawner, session };
}

describe('DapTransport framing', () => {
  it('parses responses across chunk boundaries', async () => {
    const { spawner, session } = createTestSpawner();

    const transport = new DapTransport({ spawner, adapterCommand: ['lldb-dap'] });

    const responsePromise = transport.sendRequest<undefined, { ok: boolean }>(
      'initialize',
      undefined,
      { timeoutMs: 1_000 },
    );

    const response = encodeMessage(buildResponse(1, 'initialize', { ok: true }));
    session.stdout.write(response.slice(0, 12));
    session.stdout.write(response.slice(12));

    await expect(responsePromise).resolves.toEqual({ ok: true });
    transport.dispose();
  });

  it('handles multiple messages in a single chunk', async () => {
    const { spawner, session } = createTestSpawner();

    const transport = new DapTransport({ spawner, adapterCommand: ['lldb-dap'] });
    const events: DapEvent[] = [];
    transport.onEvent((event) => events.push(event));

    const responsePromise = transport.sendRequest<undefined, { ok: boolean }>(
      'threads',
      undefined,
      { timeoutMs: 1_000 },
    );

    const eventMessage = encodeMessage({
      seq: 55,
      type: 'event',
      event: 'output',
      body: { output: 'hello' },
    });
    const responseMessage = encodeMessage(buildResponse(1, 'threads', { ok: true }));

    session.stdout.write(`${eventMessage}${responseMessage}`);

    await expect(responsePromise).resolves.toEqual({ ok: true });
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe('output');
    transport.dispose();
  });

  it('continues after invalid headers', async () => {
    const { spawner, session } = createTestSpawner();

    const transport = new DapTransport({ spawner, adapterCommand: ['lldb-dap'] });

    const responsePromise = transport.sendRequest<undefined, { ok: boolean }>(
      'stackTrace',
      undefined,
      { timeoutMs: 1_000 },
    );

    session.stdout.write('Content-Length: nope\r\n\r\n');
    const responseMessage = encodeMessage(buildResponse(1, 'stackTrace', { ok: true }));
    session.stdout.write(responseMessage);

    await expect(responsePromise).resolves.toEqual({ ok: true });
    transport.dispose();
  });
});
