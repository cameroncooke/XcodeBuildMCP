/**
 * Simulator Environment Configuration workflow
 *
 * Provides tools for configuring simulator environment settings like appearance,
 * location, and network conditions. These tools are used less frequently than
 * core build/test tools and are focused on environment setup for testing.
 */

export const workflow = {
  name: 'Simulator Environment Configuration',
  description:
    'Tools for configuring iOS Simulator environment settings including appearance, location services, and network conditions. Perfect for testing apps under various environmental conditions.',
  platforms: ['iOS'],
  targets: ['simulator'],
  projectTypes: ['project', 'workspace'],
  capabilities: ['environment-config', 'appearance', 'location', 'network-simulation'],
};
