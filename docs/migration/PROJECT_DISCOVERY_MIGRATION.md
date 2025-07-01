# Project Discovery Tools Migration Guide

## Overview
Migration guide for making Project Discovery workflow tools self-contained by removing dependencies on various `src/tools/` directories.

## Tools in this Workflow
1. `discover_projs` - Discover Xcode projects and workspaces
2. `list_schems_proj` - List schemes in project files
3. `list_schems_ws` - List schemes in workspace files  
4. `show_build_set_proj` - Show build settings for projects
5. `show_build_set_ws` - Show build settings for workspaces
6. `get_app_bundle_id` - Extract bundle ID from app bundles
7. `get_mac_bundle_id` - Extract bundle ID from macOS app bundles

## Migration Pattern

### Standard Pattern
```typescript
// BEFORE: Plugin imports from tool
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

### Source Tool Dependencies
Source directories:
- `src/tools/discover-projects/` - Project discovery logic
- `src/tools/build-settings/` - Build settings extraction  
- `src/tools/bundle-id/` - Bundle ID extraction utilities

### Bundle ID Tools
Two separate bundle ID tools:
- Generic bundle ID extraction (iOS, etc.)
- macOS-specific bundle ID extraction
Each has different implementation patterns.

### Build Settings Tools
Handle both project and workspace variants:
- Similar logic patterns
- Different xcodebuild arguments
- Shared error handling

### Project Discovery
Complex logic for:
- Filesystem traversal
- File type detection  
- Xcode project structure analysis

## Migration Process per Tool

1. **Read Source**: Get complete implementation from appropriate `src/tools/[category]/index.ts`
2. **Extract Components**:
   - Tool name, description, schema literals
   - Complete handler implementation
   - File system and command utilities
3. **Handle Dependencies**:
   - Xcode command construction
   - File path validation
   - Error handling patterns
4. **Update Plugin**: Use MultiEdit for surgical replacement
5. **Test**: Run `npm test -- plugins/project-discovery/[tool].test.ts`

## Utility Dependencies
Common imports needed:
- `executeCommand` from `../../src/utils/command.js`
- `validateRequiredParam` from `../../src/utils/validation.js`
- `createErrorResponse` from `../../src/utils/errors.js`
- `log` from `../../src/utils/logger.js`
- File system utilities as needed
- Path manipulation utilities

## Validation Checkpoints

**After Each Tool**:
```bash
npm test -- plugins/project-discovery/[tool].test.ts
```

**After Full Workflow**:
```bash
npm test -- plugins/project-discovery/
grep -r "src/tools" plugins/project-discovery/  # Should return no results
```

## Success Criteria
- ✅ All 7 tools are self-contained
- ✅ No imports from `src/tools` remain
- ✅ All plugin tests pass
- ✅ Project discovery functionality preserved
- ✅ Bundle ID extraction works for all platforms