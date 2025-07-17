# Test Coverage Improvement Tasks

## Summary
**Total Tasks**: 41 files need test coverage improvements
**Audit Date**: 2025-01-17
**Status**: Ready for sub-agent orchestration

## Priority Categories

### 🔴 Category A: Missing Test Files (2 files) - HIGH PRIORITY
Files that need complete test creation from scratch

1. **A1: src/plugins/simulator-project/test_sim_id_proj.ts** ✅ COMPLETED
   - Gap: MISSING_TEST_FILE
   - Required: Create complete test file 
   - Reference: Use test_sim_id_ws.ts as template
   - **Completed**: Test file created with 9 passing tests, all patterns implemented

2. **A2: src/plugins/simulator-project/test_sim_name_proj.ts** ✅ COMPLETED
   - Gap: MISSING_TEST_FILE
   - Required: Create complete test file
   - Reference: Use test_sim_name_ws.ts as template
   - **Completed**: Test file created with 9 passing tests, all patterns implemented

### 🔴 Category B: Critical Coverage Gaps (7 files) - HIGH PRIORITY
Files with multiple coverage gaps (2-3 gaps each)

3. **B1: src/plugins/simulator-project/build_run_sim_id_proj.ts** ✅ COMPLETED
   - Gaps: MISSING_COMMAND_GENERATION_TESTS, MISSING_SUCCESS_PATH_TESTS, VALIDATION_ONLY_NO_BEHAVIOR_TESTS
   - Current: 16 total tests, 3 command, 3 success
   - **Completed**: Added command generation tests + success path tests

4. **B2: src/plugins/ui-testing/tap.ts** ✅ COMPLETED
   - Gaps: MISSING_COMMAND_GENERATION_TESTS, MISSING_SUCCESS_PATH_TESTS, VALIDATION_ONLY_NO_BEHAVIOR_TESTS
   - Current: 22 total tests, 4 command, 5 success
   - **Completed**: Added command generation tests + success path tests

5. **B3: src/plugins/device-shared/install_app_device.ts** ✅ COMPLETED
   - Gaps: MISSING_COMMAND_GENERATION_TESTS, MISSING_SUCCESS_PATH_TESTS
   - Current: 13 total tests, 3 command, 3 success
   - **Completed**: Added command generation tests + success path tests

6. **B4: src/plugins/device-shared/launch_app_device.ts** ✅ COMPLETED
   - Gaps: MISSING_COMMAND_GENERATION_TESTS, MISSING_SUCCESS_PATH_TESTS
   - Current: 15 total tests, 2 command, 4 success
   - **Completed**: Added command generation tests + success path tests

7. **B5: src/plugins/device-shared/list_devices.ts** ✅ COMPLETED
   - Gaps: MISSING_COMMAND_GENERATION_TESTS, MISSING_SUCCESS_PATH_TESTS
   - Current: 10 total tests, 2 command, 3 success
   - **Completed**: Added command generation tests + success path tests

8. **B6: src/plugins/device-shared/stop_app_device.ts** ✅ COMPLETED
   - Gaps: MISSING_COMMAND_GENERATION_TESTS, MISSING_SUCCESS_PATH_TESTS
   - Current: 13 total tests, 3 command, 3 success
   - **Completed**: Added command generation tests + success path tests

9. **B7: src/plugins/device-workspace/test_device_ws.ts** ✅ COMPLETED
   - Gaps: MISSING_SUCCESS_PATH_TESTS, VALIDATION_ONLY_NO_BEHAVIOR_TESTS
   - Current: 12 total tests, 3 command, 4 success
   - **Completed**: Added success path tests (has command tests already)

### 🟡 Category C: Success Path Tests Needed (3 files) - MEDIUM PRIORITY
Files that need success path tests only

10. **C1: src/plugins/macos-workspace/test_macos_ws.ts** ✅ COMPLETED
    - Gaps: MISSING_SUCCESS_PATH_TESTS, VALIDATION_ONLY_NO_BEHAVIOR_TESTS
    - Current: 12 total tests, 7 command, 4 success
    - **Completed**: Added success path tests (has command tests already)

11. **C2: src/plugins/simulator-workspace/test_sim_id_ws.ts** ✅ COMPLETED
    - Gaps: MISSING_SUCCESS_PATH_TESTS, VALIDATION_ONLY_NO_BEHAVIOR_TESTS
    - Current: 13 total tests, 1 command, 4 success
    - **Completed**: Added success path tests

12. **C3: src/plugins/simulator-workspace/test_sim_name_ws.ts** ✅ COMPLETED
    - Gaps: MISSING_SUCCESS_PATH_TESTS, VALIDATION_ONLY_NO_BEHAVIOR_TESTS
    - Current: 13 total tests, 1 command, 4 success
    - **Completed**: Added success path tests

### 🟢 Category D: Command Generation Tests Needed (19 files) - MEDIUM PRIORITY
Files that need command generation tests only

13. **D1: src/plugins/macos-project/build_mac_proj.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

14. **D2: src/plugins/macos-workspace/build_mac_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

15. **D3: src/plugins/macos-workspace/get_mac_app_path_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

16. **D4: src/plugins/simulator-project/build_sim_name_proj.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

17. **D5: src/plugins/simulator-workspace/build_run_sim_id_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

18. **D6: src/plugins/simulator-workspace/build_run_sim_name_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

19. **D7: src/plugins/simulator-workspace/build_sim_id_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

20. **D8: src/plugins/simulator-workspace/build_sim_name_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

21. **D9: src/plugins/simulator-workspace/get_sim_app_path_id_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

22. **D10: src/plugins/simulator-workspace/get_sim_app_path_name_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

23. **D11: src/plugins/simulator-workspace/install_app_sim_id_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

24. **D12: src/plugins/simulator-workspace/install_app_sim_name_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

25. **D13: src/plugins/simulator-workspace/launch_app_sim_id_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

26. **D14: src/plugins/simulator-workspace/launch_app_sim_name_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

27. **D15: src/plugins/simulator-workspace/run_sim_id_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

28. **D16: src/plugins/simulator-workspace/run_sim_name_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

29. **D17: src/plugins/simulator-workspace/stop_app_sim_id_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

30. **D18: src/plugins/simulator-workspace/stop_app_sim_name_ws.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

31. **D19: src/plugins/utilities/scaffold_ios_project.ts** ❌ PENDING
    - Gap: MISSING_COMMAND_GENERATION_TESTS
    - Required: Add command generation tests

## Test Pattern Examples

### Command Generation Test Pattern
```typescript
describe('Command Generation', () => {
  it('should generate correct command with all parameters', async () => {
    const mockExecutor = createMockExecutor({
      success: true,
      output: 'expected output'
    });

    await plugin.handler({
      param1: 'value1',
      param2: 'value2'
    }, mockExecutor);

    expect(mockExecutor).toHaveBeenCalledWith(
      ['expected', 'command', 'array'],
      'Expected Log Prefix',
      true,
      undefined
    );
  });
});
```

### Success Path Test Pattern
```typescript
describe('Success Path', () => {
  it('should handle successful execution', async () => {
    const mockExecutor = createMockExecutor({
      success: true,
      output: 'SUCCESS MESSAGE'
    });

    const result = await plugin.handler({
      param1: 'value1'
    }, mockExecutor);

    expect(result).toEqual({
      content: [{ type: 'text', text: 'Expected success message' }]
    });
  });
});
```

## Validation Process

### Pre-Work Validation
1. Run specific test: `npm test -- path/to/specific.test.ts`
2. Record current test results
3. Note existing test patterns

### Post-Work Validation
1. Run same test after changes
2. Verify all tests pass
3. Check no regressions introduced
4. Re-run audit script to confirm gaps resolved

### Individual File Commit
```bash
git add path/to/file.test.ts
git commit -m "fix: add missing test patterns for tool_name"
```

## Progress Tracking

### Completed Tasks: 12/41
- ✅ A1: test_sim_id_proj.ts (Created complete test file with 9 passing tests)
- ✅ A2: test_sim_name_proj.ts (Created complete test file with 9 passing tests)
- ✅ B1: build_run_sim_id_proj.ts (16 tests, 3 command generation, 3 success path)
- ✅ B2: tap.ts (22 tests, 4 command generation, 5 success path)
- ✅ B3: install_app_device.ts (13 tests, 3 command generation, 3 success path)
- ✅ B4: launch_app_device.ts (15 tests, 2 command generation, 4 success path)
- ✅ B5: list_devices.ts (10 tests, 2 command generation, 3 success path)
- ✅ B6: stop_app_device.ts (13 tests, 3 command generation, 3 success path)
- ✅ B7: test_device_ws.ts (12 tests, 3 command generation, 4 success path)
- ✅ C1: test_macos_ws.ts (12 tests, 7 command generation, 4 success path)
- ✅ C2: test_sim_id_ws.ts (13 tests, 1 command generation, 4 success path)
- ✅ C3: test_sim_name_ws.ts (13 tests, 1 command generation, 4 success path)

### In Progress: 0/41
- None yet

### Next Up
Starting with Category A (Missing Test Files) and Category B (Critical Coverage Gaps)

## Notes
- Use built-in Task tool for sub-agent orchestration
- Update this file manually as tasks are completed
- Each sub-agent should focus on one file at a time
- Validate each file individually before moving to next
- No bulk commits - each file committed separately after validation