import { Plugin } from 'esbuild';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import path from 'path';

export interface WorkflowMetadata {
  name: string;
  description: string;
  platforms?: string[];
  targets?: string[];
  projectTypes?: string[];
  capabilities?: string[];
}

export function createPluginDiscoveryPlugin(): Plugin {
  return {
    name: 'plugin-discovery',
    setup(build) {
      // Generate the workflow loaders file before build starts
      build.onStart(async () => {
        try {
          await generateWorkflowLoaders();
        } catch (error) {
          console.error('Failed to generate workflow loaders:', error);
          throw error;
        }
      });
    }
  };
}

async function generateWorkflowLoaders(): Promise<void> {
  const pluginsDir = path.resolve(process.cwd(), 'src/plugins');
  
  if (!existsSync(pluginsDir)) {
    throw new Error(`Plugins directory not found: ${pluginsDir}`);
  }

  // Scan for workflow directories
  const workflowDirs = readdirSync(pluginsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const workflowLoaders: Record<string, string> = {};
  const workflowMetadata: Record<string, WorkflowMetadata> = {};

  for (const dirName of workflowDirs) {
    const indexPath = join(pluginsDir, dirName, 'index.ts');
    
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
        // Generate dynamic import for this workflow
        workflowLoaders[dirName] = `() => import('../plugins/${dirName}/index.js')`;
        workflowMetadata[dirName] = metadata;
        
        console.log(`✅ Discovered workflow: ${dirName} - ${metadata.name}`);
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

function extractWorkflowMetadata(content: string): WorkflowMetadata | null {
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
    let platforms: string[] | undefined;
    if (platformsMatch) {
      platforms = platformsMatch[1]
        .split(',')
        .map(p => p.trim().replace(/['"]/g, ''))
        .filter(p => p.length > 0);
    }

    // Extract targets (optional)
    const targetsMatch = workflowObj.match(/targets\s*:\s*\[([^\]]*)\]/);
    let targets: string[] | undefined;
    if (targetsMatch) {
      targets = targetsMatch[1]
        .split(',')
        .map(t => t.trim().replace(/['"]/g, ''))
        .filter(t => t.length > 0);
    }

    // Extract projectTypes (optional)
    const projectTypesMatch = workflowObj.match(/projectTypes\s*:\s*\[([^\]]*)\]/);
    let projectTypes: string[] | undefined;
    if (projectTypesMatch) {
      projectTypes = projectTypesMatch[1]
        .split(',')
        .map(pt => pt.trim().replace(/['"]/g, ''))
        .filter(pt => pt.length > 0);
    }

    // Extract capabilities (optional)
    const capabilitiesMatch = workflowObj.match(/capabilities\s*:\s*\[([^\]]*)\]/);
    let capabilities: string[] | undefined;
    if (capabilitiesMatch) {
      capabilities = capabilitiesMatch[1]
        .split(',')
        .map(c => c.trim().replace(/['"]/g, ''))
        .filter(c => c.length > 0);
    }

    return {
      name: nameMatch[1],
      description: descMatch[1],
      platforms,
      targets,
      projectTypes,
      capabilities
    };
  } catch (error) {
    console.warn('Failed to extract workflow metadata:', error);
    return null;
  }
}

function generatePluginsFileContent(
  workflowLoaders: Record<string, string>,
  workflowMetadata: Record<string, WorkflowMetadata>
): string {
  const loaderEntries = Object.entries(workflowLoaders)
    .map(([key, loader]) => `  '${key}': ${loader}`)
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