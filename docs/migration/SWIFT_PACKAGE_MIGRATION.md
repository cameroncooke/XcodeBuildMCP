# Swift Package Tools Migration Guide

## Overview
Migration guide for making Swift Package workflow tools self-contained by removing dependencies on `src/tools/build-swift-package/`, `src/tools/test-swift-package/`, and `src/tools/run-swift-package/`.

## Tools in this Workflow
1. `swift_package_build` - Builds Swift packages
2. `swift_package_test` - Runs Swift package tests  
3. `swift_package_run` - Runs Swift package executables
4. `swift_package_clean` - Cleans Swift package build artifacts
5. `swift_package_list` - Lists running Swift package processes
6. `swift_package_stop` - Stops running Swift package processes

## Migration Pattern

### Standard Pattern (Most Tools)
```typescript
// BEFORE: Plugin imports from tool
import { [NAME], [DESC], [SCHEMA], [HANDLER] } from '../../src/tools/[path]/index.js';

export default {
  name: [NAME],
  description: [DESC],
  schema: [SCHEMA], 
  handler: [HANDLER],
};

// AFTER: Self-contained plugin
import { z } from 'zod';
import { [required_utils] } from '../../src/utils/[util].js';

export default {
  name: '[literal_name]',
  description: '[literal_description]',
  schema: {
    [inline_schema_object]
  },
  async handler(params) {
    [complete_handler_implementation]
  },
};
```

## Special Considerations

### Shared Schemas
Many Swift Package tools import shared schemas from `src/tools/common/index.js`:
- `swiftConfigurationSchema`
- `swiftArchitecturesSchema` 
- `parseAsLibrarySchema`

**Migration Strategy**: Inline these schemas directly in each plugin that uses them.

### Background Process Management
The `swift_package_run` tool maintains a global process map for background processes. Ensure this is preserved in the migration.

### Utility Dependencies
Common imports needed:
- `executeCommand` from `../../src/utils/command.js`
- `validateRequiredParam` from `../../src/utils/validation.js`
- `createErrorResponse` from `../../src/utils/errors.js`
- `log` from `../../src/utils/logger.js`

## Migration Process per Tool

1. **Read Source**: Get complete implementation from `src/tools/[tool-name]/index.ts`
2. **Extract Components**: 
   - Tool name literal value
   - Tool description literal value
   - Schema object (inline shared schemas)
   - Handler function implementation
3. **Update Plugin**: Use MultiEdit for surgical replacement
4. **Test**: Run `npm test -- plugins/swift-package/[tool].test.ts`

## Validation Checkpoints

**After Each Tool**:
```bash
npm test -- plugins/swift-package/[tool].test.ts
```

**After Full Workflow**:
```bash
npm test -- plugins/swift-package/
grep -r "src/tools" plugins/swift-package/  # Should return no results
```

## Success Criteria
- ✅ All 6 tools are self-contained
- ✅ No imports from `src/tools` remain
- ✅ All plugin tests pass
- ✅ Functionality identical to original tools