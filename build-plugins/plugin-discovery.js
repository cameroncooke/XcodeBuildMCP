import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import path from 'path';

export function createPluginDiscoveryPlugin() {
  return {
    name: 'plugin-discovery',
    setup(build) {
      // Generate the workflow loaders file before build starts
      build.onStart(async () => {
        try {
          await generateWorkflowLoaders();
          await generateResourceLoaders();
        } catch (error) {
          console.error('Failed to generate loaders:', error);
          throw error;
        }
      });
    }
  };
}

async function generateWorkflowLoaders() {
  const pluginsDir = path.resolve(process.cwd(), 'src/mcp/tools');
  
  if (!existsSync(pluginsDir)) {
    throw new Error(`Plugins directory not found: ${pluginsDir}`);
  }

  // Scan for workflow directories
  const workflowDirs = readdirSync(pluginsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const workflowLoaders = {};
  const workflowMetadata = {};

  for (const dirName of workflowDirs) {
    const dirPath = join(pluginsDir, dirName);
    const indexPath = join(dirPath, 'index.ts');
    
    // Check if workflow has index.ts file
    if (!existsSync(indexPath)) {
      console.warn(`Skipping ${dirName}: no index.ts file found`);
      continue;
    }

    // Try to extract workflow metadata from index.ts
    try {
      const indexContent = readFileSync(indexPath, 'utf8');
      const metadata = extractWorkflowMetadata(indexContent);
      
      if (metadata) {
        // Find all tool files in this workflow directory
        const toolFiles = readdirSync(dirPath, { withFileTypes: true })
          .filter(dirent => dirent.isFile())
          .map(dirent => dirent.name)
          .filter(name => 
            (name.endsWith('.ts') || name.endsWith('.js')) && 
            name !== 'index.ts' && 
            name !== 'index.js' &&
            !name.endsWith('.test.ts') &&
            !name.endsWith('.test.js') &&
            name !== 'active-processes.ts' // Special exclusion for swift-package
          );

        // Generate dynamic loader function that loads workflow and all its tools
        workflowLoaders[dirName] = generateWorkflowLoader(dirName, toolFiles);
        workflowMetadata[dirName] = metadata;
        
        console.log(`✅ Discovered workflow: ${dirName} - ${metadata.name} (${toolFiles.length} tools)`);
      } else {
        console.warn(`⚠️  Skipping ${dirName}: invalid workflow metadata`);
      }
    } catch (error) {
      console.warn(`⚠️  Error processing ${dirName}:`, error);
    }
  }

  // Generate the content for generated-plugins.ts
  const generatedContent = generatePluginsFileContent(workflowLoaders, workflowMetadata);
  
  // Write to the generated file
  const outputPath = path.resolve(process.cwd(), 'src/core/generated-plugins.ts');
  
  const fs = await import('fs');
  await fs.promises.writeFile(outputPath, generatedContent, 'utf8');
  
  console.log(`🔧 Generated workflow loaders for ${Object.keys(workflowLoaders).length} workflows`);
}

function generateWorkflowLoader(workflowName, toolFiles) {
  const toolImports = toolFiles.map((file, index) => {
    const toolName = file.replace(/\.(ts|js)$/, '');
    return `const tool_${index} = await import('../mcp/tools/${workflowName}/${toolName}.js').then(m => m.default)`;
  }).join(';\n    ');

  const toolExports = toolFiles.map((file, index) => {
    const toolName = file.replace(/\.(ts|js)$/, '');
    return `'${toolName}': tool_${index}`;
  }).join(',\n      ');

  return `async () => {
    const { workflow } = await import('../mcp/tools/${workflowName}/index.js');
    ${toolImports ? toolImports + ';\n    ' : ''}
    return {
      workflow,
      ${toolExports ? toolExports : ''}
    };
  }`;
}

function extractWorkflowMetadata(content) {
  try {
    // Simple regex to extract workflow export object
    const workflowMatch = content.match(/export\s+const\s+workflow\s*=\s*({[\s\S]*?});/);
    
    if (!workflowMatch) {
      return null;
    }

    const workflowObj = workflowMatch[1];
    
    // Extract name
    const nameMatch = workflowObj.match(/name\s*:\s*['"`]([^'"`]+)['"`]/);
    if (!nameMatch) return null;
    
    // Extract description
    const descMatch = workflowObj.match(/description\s*:\s*['"`]([\s\S]*?)['"`]/);
    if (!descMatch) return null;

    // Extract platforms (optional)
    const platformsMatch = workflowObj.match(/platforms\s*:\s*\[([^\]]*)\]/);
    let platforms;
    if (platformsMatch) {
      platforms = platformsMatch[1]
        .split(',')
        .map(p => p.trim().replace(/['"]/g, ''))
        .filter(p => p.length > 0);
    }

    // Extract targets (optional)
    const targetsMatch = workflowObj.match(/targets\s*:\s*\[([^\]]*)\]/);
    let targets;
    if (targetsMatch) {
      targets = targetsMatch[1]
        .split(',')
        .map(t => t.trim().replace(/['"]/g, ''))
        .filter(t => t.length > 0);
    }

    // Extract projectTypes (optional)
    const projectTypesMatch = workflowObj.match(/projectTypes\s*:\s*\[([^\]]*)\]/);
    let projectTypes;
    if (projectTypesMatch) {
      projectTypes = projectTypesMatch[1]
        .split(',')
        .map(pt => pt.trim().replace(/['"]/g, ''))
        .filter(pt => pt.length > 0);
    }

    // Extract capabilities (optional)
    const capabilitiesMatch = workflowObj.match(/capabilities\s*:\s*\[([^\]]*)\]/);
    let capabilities;
    if (capabilitiesMatch) {
      capabilities = capabilitiesMatch[1]
        .split(',')
        .map(c => c.trim().replace(/['"]/g, ''))
        .filter(c => c.length > 0);
    }

    const result = {
      name: nameMatch[1],
      description: descMatch[1]
    };

    if (platforms) result.platforms = platforms;
    if (targets) result.targets = targets;
    if (projectTypes) result.projectTypes = projectTypes;
    if (capabilities) result.capabilities = capabilities;

    return result;
  } catch (error) {
    console.warn('Failed to extract workflow metadata:', error);
    return null;
  }
}

function generatePluginsFileContent(workflowLoaders, workflowMetadata) {
  const loaderEntries = Object.entries(workflowLoaders)
    .map(([key, loader]) => {
      // Indent the loader function properly
      const indentedLoader = loader
        .split('\n')
        .map((line, index) => index === 0 ? `  '${key}': ${line}` : `  ${line}`)
        .join('\n');
      return indentedLoader;
    })
    .join(',\n');

  const metadataEntries = Object.entries(workflowMetadata)
    .map(([key, metadata]) => {
      const metadataJson = JSON.stringify(metadata, null, 4)
        .split('\n')
        .map(line => `    ${line}`)
        .join('\n');
      return `  '${key}': ${metadataJson.trim()}`;
    })
    .join(',\n');

  return `// AUTO-GENERATED - DO NOT EDIT
// This file is generated by the plugin discovery esbuild plugin

// Generated based on filesystem scan
export const WORKFLOW_LOADERS = {
${loaderEntries}
};

export type WorkflowName = keyof typeof WORKFLOW_LOADERS;

// Optional: Export workflow metadata for quick access
export const WORKFLOW_METADATA = {
${metadataEntries}
};
`;
}

async function generateResourceLoaders() {
  const resourcesDir = path.resolve(process.cwd(), 'src/mcp/resources');
  
  if (!existsSync(resourcesDir)) {
    console.log('Resources directory not found, skipping resource generation');
    return;
  }

  // Scan for resource files
  const resourceFiles = readdirSync(resourcesDir, { withFileTypes: true })
    .filter(dirent => dirent.isFile())
    .map(dirent => dirent.name)
    .filter(name => 
      (name.endsWith('.ts') || name.endsWith('.js')) && 
      !name.endsWith('.test.ts') &&
      !name.endsWith('.test.js') &&
      !name.startsWith('__') // Exclude test directories
    );

  const resourceLoaders = {};

  for (const fileName of resourceFiles) {
    const resourceName = fileName.replace(/\.(ts|js)$/, '');
    
    // Generate dynamic loader for this resource
    resourceLoaders[resourceName] = `async () => {
    const module = await import('../mcp/resources/${resourceName}.js');
    return module.default;
  }`;
    
    console.log(`✅ Discovered resource: ${resourceName}`);
  }

  // Generate the content for generated-resources.ts
  const generatedContent = generateResourcesFileContent(resourceLoaders);
  
  // Write to the generated file
  const outputPath = path.resolve(process.cwd(), 'src/core/generated-resources.ts');
  
  const fs = await import('fs');
  await fs.promises.writeFile(outputPath, generatedContent, 'utf8');
  
  console.log(`🔧 Generated resource loaders for ${Object.keys(resourceLoaders).length} resources`);
}

function generateResourcesFileContent(resourceLoaders) {
  const loaderEntries = Object.entries(resourceLoaders)
    .map(([key, loader]) => `  '${key}': ${loader}`)
    .join(',\n');

  return `// AUTO-GENERATED - DO NOT EDIT
// This file is generated by the plugin discovery esbuild plugin

export const RESOURCE_LOADERS = {
${loaderEntries}
};

export type ResourceName = keyof typeof RESOURCE_LOADERS;
`;
}