# Tools Requiring Re-export Between Plugin Directories

Based on the PLUGIN_MIGRATION_PLAN.md structure, the following tools need to be shared between multiple plugin directories using the re-export pattern.

## Simulator Tools (8 build + 4 test = 12 total)

### Build Tools (from src/tools/build-ios-simulator/)
- `build_sim_name_ws` - Primary: simulator-workspace/, Re-export: simulator-project/
- `build_sim_id_ws` - Primary: simulator-workspace/, Re-export: simulator-project/
- `build_run_sim_name_ws` - Primary: simulator-workspace/, Re-export: simulator-project/
- `build_run_sim_id_ws` - Primary: simulator-workspace/, Re-export: simulator-project/
- `build_sim_name_proj` - Primary: simulator-workspace/, Re-export: simulator-project/
- `build_sim_id_proj` - Primary: simulator-workspace/, Re-export: simulator-project/
- `build_run_sim_name_proj` - Primary: simulator-workspace/, Re-export: simulator-project/
- `build_run_sim_id_proj` - Primary: simulator-workspace/, Re-export: simulator-project/

### Test Tools (from src/tools/test-ios-simulator/)
- `test_sim_name_ws` - Primary: simulator-workspace/, Re-export: simulator-project/
- `test_sim_id_ws` - Primary: simulator-workspace/, Re-export: simulator-project/
- `test_sim_name_proj` - Primary: simulator-workspace/, Re-export: simulator-project/
- `test_sim_id_proj` - Primary: simulator-workspace/, Re-export: simulator-project/

## Device Tools (2 build + 2 test = 4 total)

### Build Tools (from src/tools/build-ios-device/)
- `build_dev_ws` - Primary: device-workspace/, Re-export: device-project/
- `build_dev_proj` - Primary: device-workspace/, Re-export: device-project/

### Test Tools (from src/tools/test-ios-device/)
- `test_device_ws` - Primary: device-workspace/, Re-export: device-project/
- `test_device_proj` - Primary: device-workspace/, Re-export: device-project/

## macOS Tools (4 build + 2 test = 6 total)

### Build Tools (from src/tools/build-macos/)
- `build_mac_ws` - Primary: macos-workspace/, Re-export: macos-project/
- `build_mac_proj` - Primary: macos-workspace/, Re-export: macos-project/
- `build_run_mac_ws` - Primary: macos-workspace/, Re-export: macos-project/
- `build_run_mac_proj` - Primary: macos-workspace/, Re-export: macos-project/

### Test Tools (from src/tools/test-macos/)
- `test_macos_ws` - Primary: macos-workspace/, Re-export: macos-project/
- `test_macos_proj` - Primary: macos-workspace/, Re-export: macos-project/

## Summary

- **Total tools requiring re-export**: 22 tools
- **Simulator**: 12 tools (8 build + 4 test)
- **Device**: 4 tools (2 build + 2 test)
- **macOS**: 6 tools (4 build + 2 test)

## Re-export File Template

For each re-exported tool, create a file like this:

```javascript
// plugins/<workflow>-project/<tool_name>.js
// Re-export from <workflow>-workspace to avoid duplication
export { default } from '../<workflow>-workspace/<tool_name>.js';
```

## Re-export Test Template

For each re-exported tool, create a minimal test:

```typescript
// plugins/<workflow>-project/<tool_name>.test.ts
import { describe, it, expect } from 'vitest';
import tool from './<tool_name>.js';
import toolOriginal from '../<workflow>-workspace/<tool_name>.js';

describe('<tool_name> re-export', () => {
  it('should re-export the same plugin object', () => {
    expect(tool).toBe(toolOriginal);
  });
  
  it('should have the correct tool name', () => {
    expect(tool.name).toBe('<tool_name>');
  });
});
```

## Important Notes

1. **All workspace AND project tools** for simulator, device, and macOS go in the workspace directory as primary implementations
2. The project directories only contain re-exports
3. This ensures a single source of truth while making tools available in both locations
4. The surgical edit approach is maintained - no code duplication
5. Full tests only exist with the primary implementation
6. Re-export locations have minimal tests to verify the re-export works