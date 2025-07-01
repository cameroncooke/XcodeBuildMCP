# UI Testing Tools Migration Guide

## Overview
Migration guide for making UI Testing workflow tools self-contained by removing dependencies on `src/tools/axe/` and `src/tools/screenshot/`.

## Tools in this Workflow
1. `tap` - Tap at coordinates on iOS simulator
2. `long_press` - Long press at coordinates  
3. `swipe` - Swipe between coordinates
4. `type_text` - Type text in iOS simulator
5. `key_press` - Press keys on iOS simulator
6. `button` - Press hardware buttons
7. `key_sequence` - Press key sequences using HID codes
8. `touch` - Touch down/up events
9. `gesture` - Perform preset gestures
10. `screenshot` - Capture simulator screenshots
11. `describe_ui` - Get UI element hierarchy

## Migration Pattern

### Axe-based Tools Pattern
```typescript
// BEFORE: Plugin imports from axe tool
import { [NAME], [DESC], [SCHEMA], [HANDLER] } from '../../src/tools/axe/index.js';

export default {
  name: [NAME],
  description: [DESC], 
  schema: [SCHEMA],
  handler: [HANDLER],
};

// AFTER: Self-contained plugin
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

### Shared Axe Utilities
Many UI testing tools share common functionality:
- Axe binary path detection
- Command construction patterns
- Error handling for missing axe binary
- UUID validation

**Migration Strategy**: Each plugin becomes self-contained with its own implementation. Do not create shared utilities between plugins.

### Screenshot Tool
The `screenshot` tool has its own implementation in `src/tools/screenshot/index.ts` separate from axe tools.

### Simulator UUID Validation
Common pattern across all tools:
- Validate simulator UUID format
- Handle missing simulatorUuid parameter
- Consistent error messaging

### Axe Binary Dependency
All axe-based tools depend on the bundled axe binary:
- Path detection logic
- Graceful fallback when binary not found
- Consistent error messages

## Migration Process per Tool

1. **Read Source**: Get complete implementation from:
   - `src/tools/axe/index.ts` (for most tools)
   - `src/tools/screenshot/index.ts` (for screenshot tool)
2. **Extract Components**:
   - Tool-specific exports (name, description, schema, handler)
   - Shared axe utility functions if needed
   - Error handling patterns
3. **Update Plugin**: Use MultiEdit for surgical replacement
4. **Test**: Run `npm test -- plugins/ui-testing/[tool].test.ts`

## Utility Dependencies
Common imports needed:
- `executeCommand` from `../../src/utils/command.js`
- `validateRequiredParam` from `../../src/utils/validation.js`
- `createErrorResponse` from `../../src/utils/errors.js`
- `log` from `../../src/utils/logger.js`
- Axe-specific utilities from `../../src/utils/axe-helpers.js`

## Validation Checkpoints

**After Each Tool**:
```bash
npm test -- plugins/ui-testing/[tool].test.ts
```

**After Full Workflow**:
```bash
npm test -- plugins/ui-testing/
grep -r "src/tools" plugins/ui-testing/  # Should return no results
```

## Success Criteria
- ✅ All 11 tools are self-contained
- ✅ No imports from `src/tools` remain
- ✅ All plugin tests pass
- ✅ Axe functionality preserved
- ✅ Screenshot functionality preserved