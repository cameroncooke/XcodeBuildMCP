import * as z from 'zod';

type JsonSchemaEnumValue = string | number | boolean | null;

type JsonSchema = {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
};

function applyDescription<T extends z.ZodTypeAny>(schema: T, description?: string): T {
  if (!description) return schema;
  return schema.describe(description) as T;
}

function isObjectSchema(schema: JsonSchema): boolean {
  const types =
    schema.type === undefined ? [] : Array.isArray(schema.type) ? schema.type : [schema.type];
  return types.includes('object') || schema.properties !== undefined;
}

function isEnumValue(value: unknown): value is JsonSchemaEnumValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

export function jsonSchemaToZod(schema: JsonSchema | unknown): z.ZodTypeAny {
  if (!schema || typeof schema !== 'object') {
    return z.any();
  }

  const s = schema as JsonSchema;

  if (Array.isArray(s.enum)) {
    const enumValues = s.enum.filter(isEnumValue);
    if (enumValues.length === 0) {
      return applyDescription(z.any(), s.description);
    }
    const allStrings = enumValues.every((v) => typeof v === 'string');
    if (allStrings) {
      const stringValues = enumValues as string[];
      if (stringValues.length === 1) {
        return applyDescription(z.literal(stringValues[0]), s.description);
      }
      return applyDescription(z.enum(stringValues as [string, ...string[]]), s.description);
    }

    // z.enum only supports string unions; use z.literal union for mixed enums.
    const literals = enumValues.map((v) => z.literal(v)) as z.ZodLiteral<JsonSchemaEnumValue>[];
    if (literals.length === 1) {
      return applyDescription(literals[0], s.description);
    }
    return applyDescription(
      z.union(
        literals as [
          z.ZodLiteral<JsonSchemaEnumValue>,
          z.ZodLiteral<JsonSchemaEnumValue>,
          ...z.ZodLiteral<JsonSchemaEnumValue>[],
        ],
      ),
      s.description,
    );
  }

  const types = s.type === undefined ? [] : Array.isArray(s.type) ? s.type : [s.type];
  const primaryType = types[0];

  switch (primaryType) {
    case 'string':
      return applyDescription(z.string(), s.description);
    case 'integer':
      return applyDescription(z.number().int(), s.description);
    case 'number':
      return applyDescription(z.number(), s.description);
    case 'boolean':
      return applyDescription(z.boolean(), s.description);
    case 'array': {
      const itemSchema = jsonSchemaToZod(s.items ?? {});
      return applyDescription(z.array(itemSchema), s.description);
    }
    case 'object':
    default: {
      if (!isObjectSchema(s)) {
        return applyDescription(z.any(), s.description);
      }
      const required = new Set(s.required ?? []);
      const props = s.properties ?? {};
      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [key, value] of Object.entries(props)) {
        const propSchema = jsonSchemaToZod(value);
        shape[key] = required.has(key) ? propSchema : propSchema.optional();
      }
      // Use passthrough to avoid breaking when Apple adds new fields.
      return applyDescription(z.object(shape).passthrough(), s.description);
    }
  }
}
