#!/usr/bin/env node

/**
 * Script to fix test files that are missing dependency injection parameters
 * This script adds the missing createMockFileSystemExecutor() parameter to handler calls
 */

const fs = require('fs');
const path = require('path');

// Priority test files that need fixing
const priorityFiles = [
  'src/plugins/simulator-project/__tests__/test_sim_name_proj.test.ts',
  'src/plugins/simulator-workspace/__tests__/build_run_sim_id_ws.test.ts',
  'src/plugins/simulator-workspace/__tests__/build_run_sim_name_ws.test.ts',
  'src/plugins/simulator-workspace/__tests__/test_sim_id_ws.test.ts',
  'src/plugins/simulator-workspace/__tests__/test_sim_name_ws.test.ts',
  'src/plugins/swift-package/__tests__/swift_package_build.test.ts',
  'src/plugins/swift-package/__tests__/swift_package_clean.test.ts',
  'src/plugins/swift-package/__tests__/swift_package_run.test.ts',
  'src/plugins/swift-package/__tests__/swift_package_stop.test.ts',
  'src/plugins/swift-package/__tests__/swift_package_test.test.ts',
  'src/plugins/utilities/__tests__/clean_proj.test.ts',
  'src/plugins/utilities/__tests__/clean_ws.test.ts',
  'src/plugins/utilities/__tests__/scaffold_ios_project.test.ts',
  'src/plugins/utilities/__tests__/scaffold_macos_project.test.ts',
];

function fixTestFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Fix import statements to include createMockFileSystemExecutor and createNoopExecutor
  if (content.includes('import { createMockExecutor }') && 
      !content.includes('createMockFileSystemExecutor') &&
      !content.includes('createNoopExecutor')) {
    content = content.replace(
      'import { createMockExecutor }',
      'import { createMockExecutor, createMockFileSystemExecutor, createNoopExecutor }'
    );
    modified = true;
  }
  
  // Fix handler calls that are missing the third parameter
  // Pattern 1: handler(args, mockExecutor);
  content = content.replace(
    /(\s+)await\s+(\w+)\.handler\(\s*\{([^}]+)\},\s*mockExecutor,\s*\);/g,
    '$1await $2.handler({\n$3}, mockExecutor, createMockFileSystemExecutor());'
  );
  
  // Pattern 2: handler(args);
  content = content.replace(
    /(\s+)await\s+(\w+)\.handler\(\s*\{([^}]+)\}\s*\);/g,
    '$1await $2.handler({\n$3}, createNoopExecutor(), createMockFileSystemExecutor());'
  );
  
  // Pattern 3: handler({ args }, mockExecutor);
  const handlerCallRegex = /(\s+const result = await \w+\.handler\(\s*\{[^}]+\},\s*mockExecutor,\s*\);)/g;
  if (handlerCallRegex.test(content)) {
    content = content.replace(handlerCallRegex, '$1\n        createMockFileSystemExecutor(),\n      );');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
    return true;
  }
  
  console.log(`No changes needed: ${filePath}`);
  return false;
}

// Fix all priority files
let fixedCount = 0;
for (const file of priorityFiles) {
  if (fixTestFile(file)) {
    fixedCount++;
  }
}

console.log(`Fixed ${fixedCount} out of ${priorityFiles.length} priority files`);