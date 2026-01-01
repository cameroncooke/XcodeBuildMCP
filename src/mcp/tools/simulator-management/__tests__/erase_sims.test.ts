import { describe, it, expect } from 'vitest';
import * as z from 'zod';
import eraseSims, { erase_simsLogic } from '../erase_sims.ts';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';

describe('erase_sims tool (single simulator)', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(eraseSims.name).toBe('erase_sims');
    });

    it('should have correct description', () => {
      expect(eraseSims.description).toBe('Erases a simulator by UDID.');
    });

    it('should have handler function', () => {
      expect(typeof eraseSims.handler).toBe('function');
    });

    it('should validate schema fields (shape only)', () => {
      const schema = z.object(eraseSims.schema);
      expect(schema.safeParse({ shutdownFirst: true }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(true);
    });
  });

  describe('Single mode', () => {
    it('erases a simulator successfully', async () => {
      const mock = createMockExecutor({ success: true, output: 'OK' });
      const res = await erase_simsLogic({ simulatorId: 'UD1' }, mock);
      expect(res).toEqual({
        content: [{ type: 'text', text: 'Successfully erased simulator UD1' }],
      });
    });

    it('returns failure when erase fails', async () => {
      const mock = createMockExecutor({ success: false, error: 'Booted device' });
      const res = await erase_simsLogic({ simulatorId: 'UD1' }, mock);
      expect(res).toEqual({
        content: [{ type: 'text', text: 'Failed to erase simulator: Booted device' }],
      });
    });

    it('adds tool hint when booted error occurs without shutdownFirst', async () => {
      const bootedError =
        'An error was encountered processing the command (domain=com.apple.CoreSimulator.SimError, code=405):\nUnable to erase contents and settings in current state: Booted\n';
      const mock = createMockExecutor({ success: false, error: bootedError });
      const res = await erase_simsLogic({ simulatorId: 'UD1' }, mock);
      expect((res.content?.[1] as any).text).toContain('Tool hint');
      expect((res.content?.[1] as any).text).toContain('shutdownFirst: true');
    });

    it('performs shutdown first when shutdownFirst=true', async () => {
      const calls: any[] = [];
      const exec = async (cmd: string[]) => {
        calls.push(cmd);
        return { success: true, output: 'OK', error: '', process: { pid: 1 } as any };
      };
      const res = await erase_simsLogic({ simulatorId: 'UD1', shutdownFirst: true }, exec as any);
      expect(calls).toEqual([
        ['xcrun', 'simctl', 'shutdown', 'UD1'],
        ['xcrun', 'simctl', 'erase', 'UD1'],
      ]);
      expect(res).toEqual({
        content: [{ type: 'text', text: 'Successfully erased simulator UD1' }],
      });
    });
  });
});
