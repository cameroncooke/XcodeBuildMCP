export const workflow = {
  name: 'Project Utilities',
  description:
    'Essential project maintenance utilities for cleaning and managing existing projects. Provides clean operations for both .xcodeproj and .xcworkspace files.',
  platforms: ['iOS', 'macOS'],
  targets: ['simulator', 'device', 'mac'],
  projectTypes: ['project', 'workspace'],
  capabilities: ['project-cleaning', 'project-maintenance'],
};
