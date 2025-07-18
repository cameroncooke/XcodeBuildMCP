#!/bin/bash

# Final cleanup script for remaining handler calls

echo "Finding files that need additional fixes..."

# Find all test files with remaining issues
failing_files=$(npm test 2>&1 | grep "FAIL" | grep -o "src/plugins/[^>]*\.test\.ts" | sort -u)

for file in $failing_files; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        
        # Check if it needs the imports first
        if ! grep -q "createMockFileSystemExecutor" "$file"; then
            echo "  Adding missing imports..."
            sed -i '' 's/import { createMockExecutor }/import { createMockExecutor, createMockFileSystemExecutor, createNoopExecutor }/' "$file"
        fi
        
        # Fix validation calls like: .handler({ args })
        # This is a more specific pattern that catches validation calls
        sed -i '' 's/\.handler({ *$/\.handler({\n/' "$file"
        
        # Fix calls that end with just }); with no executor
        sed -i '' 's/^[[:space:]]*}); *$/      }, createNoopExecutor(), createMockFileSystemExecutor());/' "$file"
        
        # Fix calls that end with }, something); where something is not an executor
        # This catches: .handler({ args }, unknownParam);
        sed -i '' 's/}, *[^c][^r][^e][^a][^t][^e][^M][^o][^c][^k][^E][^x][^e][^c][^u][^t][^o][^r].*);$/}, createNoopExecutor(), createMockFileSystemExecutor());/' "$file"
        
        echo "  Fixed $file"
    fi
done

echo "Final cleanup complete!"