# Simulator Workspace Tools Migration Guide

## Overview
Migration guide for making Simulator + Workspace workflow tools self-contained by removing dependencies on various `src/tools/` directories.

## Tools in this Workflow
1. `build_sim_name_ws` - Build workspace for simulator by name
2. `build_sim_id_ws` - Build workspace for simulator by ID  
3. `build_run_sim_name_ws` - Build and run workspace on simulator by name
4. `build_run_sim_id_ws` - Build and run workspace on simulator by ID
5. `test_sim_name_ws` - Test workspace on simulator by name
6. `test_sim_id_ws` - Test workspace on simulator by ID
7. `get_sim_app_path_name_ws` - Get app path for workspace on simulator by name
8. `get_sim_app_path_id_ws` - Get app path for workspace on simulator by ID
9. Plus simulator utilities (boot_sim, list_sims, install_app_sim, etc.)

## Migration Pattern

### Build/Test Tools Pattern
```typescript
// BEFORE: Plugin imports from build/test tool
import { [NAME], [DESC], [SCHEMA], [HANDLER] } from '../../src/tools/[category]/index.js';

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

### Build Tools Dependencies
Source directories:
- `src/tools/build-ios-simulator/` - Build logic for simulators
- `src/tools/build-settings/` - Build settings extraction
- `src/tools/common/` - Shared schemas and utilities

### Test Tools Dependencies  
Source directories:
- `src/tools/test-ios-simulator/` - Test logic for simulators
- `src/tools/test-common/` - Shared test utilities

### Simulator Utilities
Source directories:
- `src/tools/simulator/` - Simulator management (boot, list, etc.)
- `src/tools/launch/` - App launching logic
- `src/tools/app-path/` - App path resolution

### Shared Build Utilities
Many tools import from `src/utils/build-utils.ts`:
- Build command construction
- Xcode project/workspace handling
- Error parsing and reporting

### Schema Dependencies
Tools often import shared schemas:
- Simulator selection schemas
- Build configuration schemas  
- Platform and architecture schemas

## Migration Process per Tool

1. **Read Source**: Get complete implementation from appropriate `src/tools/[category]/index.ts`
2. **Extract Components**:
   - Tool name, description, schema literals
   - Complete handler implementation
   - Required utility imports
3. **Handle Shared Dependencies**:
   - Inline shared schemas directly
   - Copy utility functions if simple
   - Maintain import paths for complex utilities
4. **Update Plugin**: Use MultiEdit for surgical replacement
5. **Test**: Run `npm test -- plugins/simulator-workspace/[tool].test.ts`

## Utility Dependencies
Common imports needed:
- `executeCommand` from `../../src/utils/command.js`
- `validateRequiredParam` from `../../src/utils/validation.js`
- `createErrorResponse` from `../../src/utils/errors.js`
- `log` from `../../src/utils/logger.js`
- `buildUtils` from `../../src/utils/build-utils.js`
- `xcode` utilities from `../../src/utils/xcode.js`

## Validation Checkpoints

**After Each Tool**:
```bash
npm test -- plugins/simulator-workspace/[tool].test.ts
```

**After Full Workflow**:
```bash
npm test -- plugins/simulator-workspace/
grep -r "src/tools" plugins/simulator-workspace/  # Should return no results
```

## Success Criteria
- ✅ All tools are self-contained
- ✅ No imports from `src/tools` remain  
- ✅ All plugin tests pass
- ✅ Build/test/simulator functionality preserved
- ✅ Shared utility imports maintained where appropriate