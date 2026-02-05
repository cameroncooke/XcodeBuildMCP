import { describe, it, expect } from 'vitest';
import {
  PREDICATES,
  evalPredicates,
  getPredicateNames,
  isValidPredicate,
} from '../predicate-registry.ts';
import type { PredicateContext } from '../predicate-types.ts';
import type { ResolvedRuntimeConfig } from '../../utils/config-store.ts';

function createContext(overrides: Partial<PredicateContext> = {}): PredicateContext {
  const defaultConfig: ResolvedRuntimeConfig = {
    debug: false,
    enabledWorkflows: [],
    experimentalWorkflowDiscovery: false,
  };

  return {
    runtime: 'mcp',
    config: defaultConfig,
    runningUnderXcode: false,
    xcodeToolsActive: false,
    ...overrides,
  };
}

describe('predicate-registry', () => {
  describe('PREDICATES', () => {
    describe('debugEnabled', () => {
      it('should return true when debug is enabled', () => {
        const ctx = createContext({
          config: { debug: true, enabledWorkflows: [], experimentalWorkflowDiscovery: false },
        });
        expect(PREDICATES.debugEnabled(ctx)).toBe(true);
      });

      it('should return false when debug is disabled', () => {
        const ctx = createContext({
          config: { debug: false, enabledWorkflows: [], experimentalWorkflowDiscovery: false },
        });
        expect(PREDICATES.debugEnabled(ctx)).toBe(false);
      });
    });

    describe('experimentalWorkflowDiscoveryEnabled', () => {
      it('should return true when experimental workflow discovery is enabled', () => {
        const ctx = createContext({
          config: { debug: false, enabledWorkflows: [], experimentalWorkflowDiscovery: true },
        });
        expect(PREDICATES.experimentalWorkflowDiscoveryEnabled(ctx)).toBe(true);
      });

      it('should return false when experimental workflow discovery is disabled', () => {
        const ctx = createContext({
          config: { debug: false, enabledWorkflows: [], experimentalWorkflowDiscovery: false },
        });
        expect(PREDICATES.experimentalWorkflowDiscoveryEnabled(ctx)).toBe(false);
      });
    });

    describe('runningUnderXcodeAgent', () => {
      it('should return true when running under Xcode', () => {
        const ctx = createContext({ runningUnderXcode: true });
        expect(PREDICATES.runningUnderXcodeAgent(ctx)).toBe(true);
      });

      it('should return false when not running under Xcode', () => {
        const ctx = createContext({ runningUnderXcode: false });
        expect(PREDICATES.runningUnderXcodeAgent(ctx)).toBe(false);
      });
    });

    describe('requiresXcodeTools', () => {
      it('should return true when Xcode tools are active', () => {
        const ctx = createContext({ xcodeToolsActive: true });
        expect(PREDICATES.requiresXcodeTools(ctx)).toBe(true);
      });

      it('should return false when Xcode tools are not active', () => {
        const ctx = createContext({ xcodeToolsActive: false });
        expect(PREDICATES.requiresXcodeTools(ctx)).toBe(false);
      });
    });

    describe('hideWhenXcodeAgentMode', () => {
      it('should return true when not running under Xcode', () => {
        const ctx = createContext({ runningUnderXcode: false, xcodeToolsActive: false });
        expect(PREDICATES.hideWhenXcodeAgentMode(ctx)).toBe(true);
      });

      it('should return true when Xcode tools are not active', () => {
        const ctx = createContext({ runningUnderXcode: true, xcodeToolsActive: false });
        expect(PREDICATES.hideWhenXcodeAgentMode(ctx)).toBe(true);
      });

      it('should return false when running under Xcode AND tools are active', () => {
        const ctx = createContext({ runningUnderXcode: true, xcodeToolsActive: true });
        expect(PREDICATES.hideWhenXcodeAgentMode(ctx)).toBe(false);
      });
    });

    describe('always', () => {
      it('should always return true', () => {
        const ctx = createContext();
        expect(PREDICATES.always(ctx)).toBe(true);
      });
    });

    describe('never', () => {
      it('should always return false', () => {
        const ctx = createContext();
        expect(PREDICATES.never(ctx)).toBe(false);
      });
    });
  });

  describe('evalPredicates', () => {
    it('should return true for empty predicate list', () => {
      const ctx = createContext();
      expect(evalPredicates([], ctx)).toBe(true);
    });

    it('should return true for undefined predicate list', () => {
      const ctx = createContext();
      expect(evalPredicates(undefined, ctx)).toBe(true);
    });

    it('should return true when all predicates pass', () => {
      const ctx = createContext({
        config: { debug: true, enabledWorkflows: [], experimentalWorkflowDiscovery: true },
      });
      expect(evalPredicates(['debugEnabled', 'experimentalWorkflowDiscoveryEnabled'], ctx)).toBe(
        true,
      );
    });

    it('should return false when any predicate fails', () => {
      const ctx = createContext({
        config: { debug: true, enabledWorkflows: [], experimentalWorkflowDiscovery: false },
      });
      expect(evalPredicates(['debugEnabled', 'experimentalWorkflowDiscoveryEnabled'], ctx)).toBe(
        false,
      );
    });

    it('should throw for unknown predicate', () => {
      const ctx = createContext();
      expect(() => evalPredicates(['unknownPredicate'], ctx)).toThrow(
        "Unknown predicate 'unknownPredicate'",
      );
    });
  });

  describe('getPredicateNames', () => {
    it('should return all predicate names', () => {
      const names = getPredicateNames();
      expect(names).toContain('debugEnabled');
      expect(names).toContain('experimentalWorkflowDiscoveryEnabled');
      expect(names).toContain('runningUnderXcodeAgent');
      expect(names).toContain('requiresXcodeTools');
      expect(names).toContain('hideWhenXcodeAgentMode');
      expect(names).toContain('always');
      expect(names).toContain('never');
    });
  });

  describe('isValidPredicate', () => {
    it('should return true for valid predicates', () => {
      expect(isValidPredicate('debugEnabled')).toBe(true);
      expect(isValidPredicate('hideWhenXcodeAgentMode')).toBe(true);
    });

    it('should return false for invalid predicates', () => {
      expect(isValidPredicate('unknownPredicate')).toBe(false);
      expect(isValidPredicate('')).toBe(false);
    });
  });
});
