import { describe, expect, it } from 'vitest';

import { DapTransport } from '../transport.ts';
import type { DapEvent, DapResponse } from '../types.ts';
import {
  createMockInteractiveSpawner,
  type MockInteractiveSession,
} from '../../../../test-utils/mock-executors.ts';

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

describe('DapTransport framing', () => {
  it('parses responses across chunk boundaries', async () => {
    let session: MockInteractiveSession | null = null;
    const spawner = createMockInteractiveSpawner({
      onSpawn: (spawned) => {
        session = spawned;
      },
    });

    const transport = new DapTransport({ spawner, adapterCommand: ['lldb-dap'] });

    const responsePromise = transport.sendRequest<undefined, { ok: boolean }>(
      'initialize',
      undefined,
      { timeoutMs: 1_000 },
    );

    const response = encodeMessage(buildResponse(1, 'initialize', { ok: true }));
    session?.stdout.write(response.slice(0, 12));
    session?.stdout.write(response.slice(12));

    await expect(responsePromise).resolves.toEqual({ ok: true });
    transport.dispose();
  });

  it('handles multiple messages in a single chunk', async () => {
    let session: MockInteractiveSession | null = null;
    const spawner = createMockInteractiveSpawner({
      onSpawn: (spawned) => {
        session = spawned;
      },
    });

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

    session?.stdout.write(`${eventMessage}${responseMessage}`);

    await expect(responsePromise).resolves.toEqual({ ok: true });
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe('output');
    transport.dispose();
  });

  it('continues after invalid headers', async () => {
    let session: MockInteractiveSession | null = null;
    const spawner = createMockInteractiveSpawner({
      onSpawn: (spawned) => {
        session = spawned;
      },
    });

    const transport = new DapTransport({ spawner, adapterCommand: ['lldb-dap'] });

    const responsePromise = transport.sendRequest<undefined, { ok: boolean }>(
      'stackTrace',
      undefined,
      { timeoutMs: 1_000 },
    );

    session?.stdout.write('Content-Length: nope\r\n\r\n');
    const responseMessage = encodeMessage(buildResponse(1, 'stackTrace', { ok: true }));
    session?.stdout.write(responseMessage);

    await expect(responsePromise).resolves.toEqual({ ok: true });
    transport.dispose();
  });
});
