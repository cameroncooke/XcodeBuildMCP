import { generateResourceLoaders, generateWorkflowLoaders } from '../build-plugins/plugin-discovery.ts';

async function main(): Promise<void> {
  await generateWorkflowLoaders();
  await generateResourceLoaders();
}

main().catch((error) => {
  console.error('Failed to generate plugin/resource loaders:', error);
  process.exit(1);
});
