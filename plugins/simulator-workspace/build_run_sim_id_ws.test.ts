import { describe, it, expect } from 'vitest';
import buildRunSimIdWs from './build_run_sim_id_ws.ts';

describe('build_run_sim_id_ws plugin', () => {
  it('should have the correct tool name', () => {
    expect(buildRunSimIdWs.name).toBe('build_run_sim_id_ws');
  });
  
  it('should have a description', () => {
    expect(buildRunSimIdWs.description).toBeDefined();
    expect(typeof buildRunSimIdWs.description).toBe('string');
  });

  it('should have a schema object', () => {
    expect(buildRunSimIdWs.schema).toBeDefined();
    expect(typeof buildRunSimIdWs.schema).toBe('object');
  });

  it('should have a handler function', () => {
    expect(buildRunSimIdWs.handler).toBeDefined();
    expect(typeof buildRunSimIdWs.handler).toBe('function');
  });
});