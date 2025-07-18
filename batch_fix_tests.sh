#!/bin/bash

# Batch fix remaining swift-package test files

files=(
    "src/plugins/swift-package/__tests__/swift_package_run.test.ts"
    "src/plugins/swift-package/__tests__/swift_package_stop.test.ts"
    "src/plugins/swift-package/__tests__/swift_package_test.test.ts"
)

for file in "${files[@]}"; do
    echo "Fixing $file..."
    
    # Fix imports
    sed -i '' 's/import { createMockExecutor }/import { createMockExecutor, createMockFileSystemExecutor, createNoopExecutor }/' "$file"
    
    # Fix handler calls with mockExecutor
    sed -i '' 's/        mockExecutor,$/        mockExecutor,\n        createMockFileSystemExecutor(),/' "$file"
    
    # Fix handler calls with no executor
    sed -i '' 's/\.handler({})/\.handler({}, createNoopExecutor(), createMockFileSystemExecutor())/' "$file"
    
    echo "Fixed $file"
done

echo "All files fixed!"