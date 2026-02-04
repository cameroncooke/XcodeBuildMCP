import { describe, it, expect } from 'vitest';
import { jsonSchemaToZod } from '../jsonschema-to-zod.ts';

describe('jsonSchemaToZod', () => {
  it('converts object properties + required correctly', () => {
    const schema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'integer' },
      },
      required: ['a'],
    };

    const zod = jsonSchemaToZod(schema);

    expect(zod.safeParse({ a: 'x' }).success).toBe(true);
    expect(zod.safeParse({}).success).toBe(false);
    expect(zod.safeParse({ a: 'x', b: 1 }).success).toBe(true);
    expect(zod.safeParse({ a: 'x', b: 1.5 }).success).toBe(false);
  });

  it('supports enums (mixed types)', () => {
    const schema = {
      enum: ['a', 1, true],
      description: 'mixed enum',
    };

    const zod = jsonSchemaToZod(schema);

    expect(zod.safeParse('a').success).toBe(true);
    expect(zod.safeParse(1).success).toBe(true);
    expect(zod.safeParse(true).success).toBe(true);
    expect(zod.safeParse('b').success).toBe(false);
  });

  it('supports arrays with items', () => {
    const schema = { type: 'array', items: { type: 'number' } };
    const zod = jsonSchemaToZod(schema);

    expect(zod.safeParse([1, 2, 3]).success).toBe(true);
    expect(zod.safeParse([1, 'x']).success).toBe(false);
  });

  it('is permissive for unknown constructs', () => {
    const schema: unknown = {
      type: 'object',
      properties: {
        x: { oneOf: [{ type: 'string' }, { type: 'number' }] },
      },
      required: ['x'],
    };

    const zod = jsonSchemaToZod(schema);
    expect(zod.safeParse({ x: 'hello' }).success).toBe(true);
    expect(zod.safeParse({ x: 123 }).success).toBe(true);
  });

  it('does not reject unknown fields on objects (passthrough)', () => {
    const schema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
      },
      required: ['a'],
    };

    const zod = jsonSchemaToZod(schema);
    const parsed = zod.parse({ a: 'x', extra: 1 }) as Record<string, unknown>;
    expect(parsed.extra).toBe(1);
  });
});
