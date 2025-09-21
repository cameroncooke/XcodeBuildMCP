import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import eraseSims, { erase_simsLogic } from '../erase_sims.ts';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';

describe('erase_sims tool (UDID or ALL only)', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(eraseSims.name).toBe('erase_sims');
    });

    it('should have correct description', () => {
      expect(eraseSims.description).toContain('Provide exactly one of: simulatorUuid or all=true');
    });

    it('should have handler function', () => {
      expect(typeof eraseSims.handler).toBe('function');
    });

    it('should validate schema fields (shape only)', () => {
      const schema = z.object(eraseSims.schema);
      // Valid
      expect(schema.safeParse({ simulatorUuid: 'UDID-1' }).success).toBe(true);
      expect(schema.safeParse({ all: true }).success).toBe(true);
      // Shape-level schema does not enforce selection rules; handler validation covers that.
    });
  });

  describe('Single mode', () => {
    it('erases a simulator successfully', async () => {
      const mock = createMockExecutor({ success: true, output: 'OK' });
      const res = await erase_simsLogic({ simulatorUuid: 'UD1' }, mock);
      expect(res).toEqual({
        content: [{ type: 'text', text: 'Successfully erased simulator UD1' }],
      });
    });

    it('returns failure when erase fails', async () => {
      const mock = createMockExecutor({ success: false, error: 'Booted device' });
      const res = await erase_simsLogic({ simulatorUuid: 'UD1' }, mock);
      expect(res).toEqual({
        content: [{ type: 'text', text: 'Failed to erase simulator: Booted device' }],
      });
    });
  });

  describe('All mode', () => {
    it('erases all simulators successfully', async () => {
      const exec = createMockExecutor({ success: true, output: 'OK' });
      const res = await erase_simsLogic({ all: true }, exec);
      expect(res).toEqual({
        content: [{ type: 'text', text: 'Successfully erased all simulators' }],
      });
    });

    it('returns failure when erase all fails', async () => {
      const exec = createMockExecutor({ success: false, error: 'Denied' });
      const res = await erase_simsLogic({ all: true }, exec);
      expect(res).toEqual({
        content: [{ type: 'text', text: 'Failed to erase all simulators: Denied' }],
      });
    });
  });
});
