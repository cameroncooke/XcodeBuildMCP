import { describe, it, expect } from 'vitest';
import buildDevProj from './build_dev_proj.js';

describe('build_dev_proj plugin', () => {
  it('should have the correct tool name', () => {
    expect(buildDevProj.name).toBe('build_dev_proj');
  });
  
  it('should have a description', () => {
    expect(buildDevProj.description).toBeDefined();
    expect(typeof buildDevProj.description).toBe('string');
  });

  it('should have a schema object', () => {
    expect(buildDevProj.schema).toBeDefined();
    expect(typeof buildDevProj.schema).toBe('object');
  });

  it('should have a handler function', () => {
    expect(buildDevProj.handler).toBeDefined();
    expect(typeof buildDevProj.handler).toBe('function');
  });
});