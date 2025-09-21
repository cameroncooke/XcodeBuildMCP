import { describe, it, expect } from 'vitest';
import { isAxeAtLeastVersion } from '../axe-helpers.ts';
import { createMockExecutor } from '../../test-utils/mock-executors.ts';

const DI = (axePath: string | null) => ({
  getAxePath: () => axePath,
});

describe('isAxeAtLeastVersion', () => {
  it('returns true when current >= required (1.2.0 >= 1.1.0)', async () => {
    const exec = createMockExecutor({ success: true, output: 'AXe 1.2.0\n' });
    const ok = await isAxeAtLeastVersion('1.1.0', exec, DI('/fake/axe'));
    expect(ok).toBe(true);
  });

  it('returns false when current < required (1.0.9 < 1.1.0)', async () => {
    const exec = createMockExecutor({ success: true, output: '1.0.9\n' });
    const ok = await isAxeAtLeastVersion('1.1.0', exec, DI('/fake/axe'));
    expect(ok).toBe(false);
  });

  it('returns false when version cannot be parsed', async () => {
    const exec = createMockExecutor({ success: true, output: 'AXe version unknown\n' });
    const ok = await isAxeAtLeastVersion('1.1.0', exec, DI('/fake/axe'));
    expect(ok).toBe(false);
  });

  it('returns false when executor indicates failure', async () => {
    const exec = createMockExecutor({ success: false, error: 'failed' });
    const ok = await isAxeAtLeastVersion('1.1.0', exec, DI('/fake/axe'));
    expect(ok).toBe(false);
  });

  it('returns false when axe binary is not available (getAxePath returns null)', async () => {
    const exec = createMockExecutor({ success: true, output: 'AXe 1.2.0\n' });
    const ok = await isAxeAtLeastVersion('1.1.0', exec, DI(null));
    expect(ok).toBe(false);
  });

  it('prefers the version following AXe token when multiple semvers are present', async () => {
    const output = 'macOS 14.4.1\nSwift 5.10.1\nAXe version 1.1.0\n';
    const exec = createMockExecutor({ success: true, output });
    const ok = await isAxeAtLeastVersion('1.1.0', exec, DI('/fake/axe'));
    expect(ok).toBe(true);
  });

  it('falls back to the highest semver when AXe token is missing', async () => {
    const output = 'deps 0.9.0\nlib 2.0.0\ncore 1.5.1\n';
    const exec = createMockExecutor({ success: true, output });
    const ok = await isAxeAtLeastVersion('1.6.0', exec, DI('/fake/axe'));
    expect(ok).toBe(true); // picks 2.0.0
  });

  it('matches v-prefixed version on a single line output', async () => {
    const output = 'v1.1.0\n';
    const exec = createMockExecutor({ success: true, output });
    const ok = await isAxeAtLeastVersion('1.1.0', exec, DI('/fake/axe'));
    expect(ok).toBe(true);
  });

  it('handles noise lines then v-prefixed version line', async () => {
    const output = 'objc[123]: some noisy preface\nwhatever\nv1.1.0\n';
    const exec = createMockExecutor({ success: true, output });
    const ok = await isAxeAtLeastVersion('1.1.0', exec, DI('/fake/axe'));
    expect(ok).toBe(true);
  });
});
