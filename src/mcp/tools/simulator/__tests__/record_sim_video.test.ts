import { describe, it, expect, vi, afterEach } from 'vitest';

// Import the tool and logic
import { schema, handler, record_sim_videoLogic } from '../record_sim_video.ts';
import { createMockFileSystemExecutor } from '../../../../test-utils/mock-executors.ts';

const DUMMY_EXECUTOR: any = (async () => ({ success: true })) as any; // CommandExecutor stub
const VALID_SIM_ID = '00000000-0000-0000-0000-000000000000';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('record_sim_video tool - validation', () => {
  it('errors when start and stop are both true (mutually exclusive)', async () => {
    const res = await handler({
      simulatorId: VALID_SIM_ID,
      start: true,
      stop: true,
    } as any);

    expect(res.isError).toBe(true);
    const text = (res.content?.[0] as any)?.text ?? '';
    expect(text.toLowerCase()).toContain('mutually exclusive');
  });

  it('errors when stop=true but outputFile is missing', async () => {
    const res = await handler({
      simulatorId: VALID_SIM_ID,
      stop: true,
    } as any);

    expect(res.isError).toBe(true);
    const text = (res.content?.[0] as any)?.text ?? '';
    expect(text.toLowerCase()).toContain('outputfile is required');
  });
});

describe('record_sim_video logic - start behavior', () => {
  it('starts with default fps (30) and warns when outputFile is provided on start (ignored)', async () => {
    const video: any = {
      startSimulatorVideoCapture: async () => ({
        started: true,
        sessionId: 'sess-123',
      }),
      stopSimulatorVideoCapture: async () => ({
        stopped: false,
      }),
    };

    // DI for AXe helpers: available and version OK
    const axe = {
      areAxeToolsAvailable: () => true,
      isAxeAtLeastVersion: async () => true,
      createAxeNotAvailableResponse: () => ({
        content: [{ type: 'text' as const, text: 'AXe not available' }],
        isError: true,
      }),
    };

    const fs = createMockFileSystemExecutor();

    const res = await record_sim_videoLogic(
      {
        simulatorId: VALID_SIM_ID,
        start: true,
        // fps omitted to hit default 30
        outputFile: '/tmp/ignored.mp4', // should be ignored with a note
      } as any,
      DUMMY_EXECUTOR,
      axe,
      video,
      fs,
    );

    expect(res.isError).toBe(false);
    const texts = (res.content ?? []).map((c: any) => c.text).join('\n');

    expect(texts).toMatch(/30\s*fps/i);
    expect(texts.toLowerCase()).toContain('outputfile is ignored');

    // Check nextStepParams instead of embedded text
    expect(res.nextStepParams).toBeDefined();
    expect(res.nextStepParams?.record_sim_video).toBeDefined();
    expect(res.nextStepParams?.record_sim_video).toHaveProperty('stop', true);
    expect(res.nextStepParams?.record_sim_video).toHaveProperty('outputFile');
  });
});

describe('record_sim_video logic - end-to-end stop with rename', () => {
  it('stops, parses stdout path, and renames to outputFile', async () => {
    const video: any = {
      startSimulatorVideoCapture: async () => ({
        started: true,
        sessionId: 'sess-abc',
      }),
      stopSimulatorVideoCapture: async () => ({
        stopped: true,
        parsedPath: '/tmp/recorded.mp4',
        stdout: 'Saved to /tmp/recorded.mp4',
      }),
    };

    const fs = createMockFileSystemExecutor();

    const axe = {
      areAxeToolsAvailable: () => true,
      isAxeAtLeastVersion: async () => true,
      createAxeNotAvailableResponse: () => ({
        content: [{ type: 'text' as const, text: 'AXe not available' }],
        isError: true,
      }),
    };

    // Start (not strictly required for stop path, but included to mimic flow)
    const startRes = await record_sim_videoLogic(
      {
        simulatorId: VALID_SIM_ID,
        start: true,
      } as any,
      DUMMY_EXECUTOR,
      axe,
      video,
      fs,
    );
    expect(startRes.isError).toBe(false);

    // Stop and rename
    const outputFile = '/var/videos/final.mp4';
    const stopRes = await record_sim_videoLogic(
      {
        simulatorId: VALID_SIM_ID,
        stop: true,
        outputFile,
      } as any,
      DUMMY_EXECUTOR,
      axe,
      video,
      fs,
    );

    expect(stopRes.isError).toBe(false);
    const texts = (stopRes.content ?? []).map((c: any) => c.text).join('\n');
    expect(texts).toContain('Original file: /tmp/recorded.mp4');
    expect(texts).toContain(`Saved to: ${outputFile}`);

    // _meta should include final saved path
    expect((stopRes as any)._meta?.outputFile).toBe(outputFile);
  });
});

describe('record_sim_video logic - version gate', () => {
  it('errors when AXe version is below 1.1.0', async () => {
    const axe = {
      areAxeToolsAvailable: () => true,
      isAxeAtLeastVersion: async () => false,
      createAxeNotAvailableResponse: () => ({
        content: [{ type: 'text' as const, text: 'AXe not available' }],
        isError: true,
      }),
    };

    const video: any = {
      startSimulatorVideoCapture: async () => ({
        started: true,
        sessionId: 'sess-xyz',
      }),
      stopSimulatorVideoCapture: async () => ({
        stopped: true,
      }),
    };

    const fs = createMockFileSystemExecutor();

    const res = await record_sim_videoLogic(
      {
        simulatorId: VALID_SIM_ID,
        start: true,
      } as any,
      DUMMY_EXECUTOR,
      axe,
      video,
      fs,
    );

    expect(res.isError).toBe(true);
    const text = (res.content?.[0] as any)?.text ?? '';
    expect(text).toContain('AXe v1.1.0');
  });
});
