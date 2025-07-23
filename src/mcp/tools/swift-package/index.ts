export const workflow = {
  name: 'Swift Package Manager',
  description:
    'Swift Package Manager operations for building, testing, running, and managing Swift packages and dependencies. Complete SPM workflow support.',
  platforms: ['iOS', 'macOS', 'watchOS', 'tvOS', 'visionOS', 'Linux'],
  targets: ['package'],
  projectTypes: ['swift-package'],
  capabilities: ['build', 'test', 'run', 'clean', 'dependency-management', 'package-management'],
};
