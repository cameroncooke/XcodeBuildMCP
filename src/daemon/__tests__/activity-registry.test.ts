import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  acquireDaemonActivity,
  clearDaemonActivityRegistry,
  getDaemonActivitySnapshot,
} from '../activity-registry.ts';

describe('daemon activity registry', () => {
  beforeEach(() => {
    clearDaemonActivityRegistry();
  });

  afterEach(() => {
    clearDaemonActivityRegistry();
  });

  it('tracks acquired activity by category', () => {
    const releaseFirst = acquireDaemonActivity('logging.simulator');
    const releaseSecond = acquireDaemonActivity('logging.simulator');

    expect(getDaemonActivitySnapshot()).toEqual({
      activeOperationCount: 2,
      byCategory: {
        'logging.simulator': 2,
      },
    });

    releaseFirst();
    expect(getDaemonActivitySnapshot()).toEqual({
      activeOperationCount: 1,
      byCategory: {
        'logging.simulator': 1,
      },
    });

    releaseSecond();
    expect(getDaemonActivitySnapshot()).toEqual({
      activeOperationCount: 0,
      byCategory: {},
    });
  });

  it('treats release as idempotent', () => {
    const release = acquireDaemonActivity('video.capture');
    release();
    release();

    expect(getDaemonActivitySnapshot()).toEqual({
      activeOperationCount: 0,
      byCategory: {},
    });
  });

  it('rejects empty activity keys', () => {
    expect(() => acquireDaemonActivity('   ')).toThrow('activityKey must be a non-empty string');
  });
});
