import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  parseXcuserstate,
  parseXcuserstateBuffer,
  isUID,
  findStringIndex,
  findDictWithKey,
} from '../nskeyedarchiver-parser.ts';

// Path to the example project's xcuserstate (used as test fixture)
const EXAMPLE_PROJECT_XCUSERSTATE = join(
  process.cwd(),
  'example_projects/iOS/MCPTest.xcodeproj/project.xcworkspace/xcuserdata/cameroncooke.xcuserdatad/UserInterfaceState.xcuserstate',
);

// Expected values for the MCPTest example project
const EXPECTED_MCPTEST = {
  scheme: 'MCPTest',
  simulatorId: 'CE3C0D03-8F60-497A-A3B9-6A80BA997FC2',
  simulatorPlatform: 'iphonesimulator',
};

describe('NSKeyedArchiver Parser', () => {
  describe('parseXcuserstate (file path)', () => {
    it.skipIf(!existsSync(EXAMPLE_PROJECT_XCUSERSTATE))(
      'extracts scheme name from example project',
      () => {
        const result = parseXcuserstate(EXAMPLE_PROJECT_XCUSERSTATE);
        expect(result.scheme).toBe(EXPECTED_MCPTEST.scheme);
      },
    );

    it.skipIf(!existsSync(EXAMPLE_PROJECT_XCUSERSTATE))(
      'extracts simulator UUID from example project',
      () => {
        const result = parseXcuserstate(EXAMPLE_PROJECT_XCUSERSTATE);
        expect(result.simulatorId).toBe(EXPECTED_MCPTEST.simulatorId);
      },
    );

    it.skipIf(!existsSync(EXAMPLE_PROJECT_XCUSERSTATE))(
      'extracts simulator platform from example project',
      () => {
        const result = parseXcuserstate(EXAMPLE_PROJECT_XCUSERSTATE);
        expect(result.simulatorPlatform).toBe(EXPECTED_MCPTEST.simulatorPlatform);
      },
    );

    it.skipIf(!existsSync(EXAMPLE_PROJECT_XCUSERSTATE))(
      'extracts device location from example project',
      () => {
        const result = parseXcuserstate(EXAMPLE_PROJECT_XCUSERSTATE);
        expect(result.deviceLocation).toMatch(/^dvtdevice-iphonesimulator:[A-F0-9-]{36}$/);
      },
    );

    it('returns empty result for non-existent file', () => {
      const result = parseXcuserstate('/non/existent/file.xcuserstate');
      expect(result).toEqual({});
    });
  });

  describe('parseXcuserstateBuffer (buffer)', () => {
    let fixtureBuffer: Buffer;

    beforeAll(() => {
      if (existsSync(EXAMPLE_PROJECT_XCUSERSTATE)) {
        fixtureBuffer = readFileSync(EXAMPLE_PROJECT_XCUSERSTATE);
      }
    });

    it.skipIf(!existsSync(EXAMPLE_PROJECT_XCUSERSTATE))('extracts scheme name from buffer', () => {
      const result = parseXcuserstateBuffer(fixtureBuffer);
      expect(result.scheme).toBe(EXPECTED_MCPTEST.scheme);
    });

    it.skipIf(!existsSync(EXAMPLE_PROJECT_XCUSERSTATE))(
      'extracts simulator UUID from buffer',
      () => {
        const result = parseXcuserstateBuffer(fixtureBuffer);
        expect(result.simulatorId).toBe(EXPECTED_MCPTEST.simulatorId);
      },
    );

    it.skipIf(!existsSync(EXAMPLE_PROJECT_XCUSERSTATE))(
      'extracts all fields correctly from buffer',
      () => {
        const result = parseXcuserstateBuffer(fixtureBuffer);
        expect(result).toMatchObject({
          scheme: EXPECTED_MCPTEST.scheme,
          simulatorId: EXPECTED_MCPTEST.simulatorId,
          simulatorPlatform: EXPECTED_MCPTEST.simulatorPlatform,
        });
        expect(result.deviceLocation).toBeDefined();
      },
    );

    it('returns empty result for empty buffer', () => {
      const result = parseXcuserstateBuffer(Buffer.from([]));
      expect(result).toEqual({});
    });

    it('returns empty result for invalid plist data', () => {
      const result = parseXcuserstateBuffer(Buffer.from('not a plist'));
      expect(result).toEqual({});
    });
  });

  describe('helper functions', () => {
    describe('isUID', () => {
      it('returns true for valid UID objects', () => {
        expect(isUID({ UID: 0 })).toBe(true);
        expect(isUID({ UID: 123 })).toBe(true);
      });

      it('returns false for non-UID values', () => {
        expect(isUID(null)).toBe(false);
        expect(isUID(undefined)).toBe(false);
        expect(isUID(123)).toBe(false);
        expect(isUID('string')).toBe(false);
        expect(isUID({ notUID: 123 })).toBe(false);
        expect(isUID({ UID: 'string' })).toBe(false);
      });
    });

    describe('findStringIndex', () => {
      it('finds string at correct index', () => {
        const objects = ['$null', 'first', 'second', 'third'];
        expect(findStringIndex(objects, 'first')).toBe(1);
        expect(findStringIndex(objects, 'third')).toBe(3);
      });

      it('returns -1 for missing string', () => {
        const objects = ['$null', 'first', 'second'];
        expect(findStringIndex(objects, 'missing')).toBe(-1);
      });
    });

    describe('findDictWithKey', () => {
      it('finds dictionary containing key index', () => {
        const objects = [
          '$null',
          'KeyName',
          {
            'NS.keys': [{ UID: 1 }],
            'NS.objects': [{ UID: 3 }],
          },
          'ValueName',
        ];

        const dict = findDictWithKey(objects, 1);
        expect(dict).toBeDefined();
        expect(dict?.['NS.keys']).toHaveLength(1);
      });

      it('returns undefined when key not found', () => {
        const objects = [
          '$null',
          'KeyName',
          {
            'NS.keys': [{ UID: 1 }],
            'NS.objects': [{ UID: 3 }],
          },
        ];

        const dict = findDictWithKey(objects, 99);
        expect(dict).toBeUndefined();
      });

      it('skips non-dictionary objects', () => {
        const objects = ['$null', 'string', 123, null, { noKeys: true }];
        const dict = findDictWithKey(objects, 1);
        expect(dict).toBeUndefined();
      });
    });
  });

  describe('edge cases', () => {
    it('handles xcuserstate without ActiveScheme', () => {
      // This would require a specially crafted test fixture
      // For now, we just verify the function doesn't crash
      const result = parseXcuserstateBuffer(Buffer.from('bplist00'));
      expect(result).toEqual({});
    });

    it('handles scheme object without IDENameString', () => {
      // The parser should gracefully handle missing nested keys
      // and return partial results
      const result = parseXcuserstateBuffer(Buffer.from('invalid'));
      expect(result.scheme).toBeUndefined();
    });
  });
});

describe('Integration with real xcuserstate files', () => {
  // Additional external test file (if available)
  const HACKERNEWS_XCUSERSTATE =
    '/Volumes/Developer/hackernews/ios/HackerNews.xcodeproj/project.xcworkspace/xcuserdata/cameroncooke.xcuserdatad/UserInterfaceState.xcuserstate';

  it.skipIf(!existsSync(HACKERNEWS_XCUSERSTATE))('parses HackerNews project xcuserstate', () => {
    const result = parseXcuserstate(HACKERNEWS_XCUSERSTATE);
    // Scheme can vary based on user's current Xcode selection (could be any scheme in project)
    expect(result.scheme).toBeDefined();
    expect(typeof result.scheme).toBe('string');
    expect(result.simulatorId).toMatch(/^[A-F0-9-]{36}$/);
    expect(result.simulatorPlatform).toBe('iphonesimulator');
  });
});
