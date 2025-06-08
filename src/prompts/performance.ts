/**
 * Performance Prompts - Xcode Build and App Performance Optimization
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { log } from '../utils/logger.js';

export function registerPerformancePrompts(server: McpServer): void {
  server.prompt(
    'optimize-build-performance',
    'Analyze and optimize Xcode build performance',
    {
      build_time: z.string().describe('Current build time or performance metrics'),
      project_size: z.string().optional().describe('Project size and complexity'),
      bottlenecks: z.string().optional().describe('Known performance bottlenecks'),
    },
    async (args) => {
      const { build_time, project_size, bottlenecks } = args;

      let prompt = `# Xcode Build Performance Optimization

## Current Performance
**Build Time:** ${build_time}`;

      if (project_size) prompt += `\n**Project Size:** ${project_size}`;
      if (bottlenecks) prompt += `\n**Known Bottlenecks:** ${bottlenecks}`;

      prompt += `

## Optimization Request
Provide comprehensive build performance optimization strategies:

1. **Build Time Analysis**
   - Identify major build time contributors
   - Analyze compilation bottlenecks
   - Review dependency compilation impact

2. **Xcode Configuration Optimization**
   - Optimize build settings for faster compilation
   - Configure incremental builds effectively
   - Set up build parallelization

3. **Code and Architecture Improvements**
   - Suggest code patterns for faster compilation
   - Recommend module and framework organization
   - Identify expensive compile-time operations

4. **Development Workflow Optimization**
   - Optimize development build configurations
   - Set up effective caching strategies
   - Configure development vs. release build differences

Focus on actionable improvements with measurable impact.`;

      return {
        messages: [{ role: 'user', content: { type: 'text', text: prompt } }],
      };
    },
  );

  server.prompt(
    'analyze-app-performance',
    'Analyze and optimize iOS/macOS app runtime performance',
    {
      performance_issue: z.string().describe('Description of performance issue'),
      profiling_data: z.string().optional().describe('Instruments or profiling data'),
      target_metrics: z.string().optional().describe('Target performance metrics'),
    },
    async (args) => {
      const { performance_issue, profiling_data, target_metrics } = args;

      let prompt = `# App Performance Analysis and Optimization

## Performance Issue
${performance_issue}`;

      if (profiling_data) prompt += `\n**Profiling Data:**\n\`\`\`\n${profiling_data}\n\`\`\``;
      if (target_metrics) prompt += `\n**Target Metrics:** ${target_metrics}`;

      prompt += `

## Analysis Request
Provide comprehensive app performance optimization guidance:

1. **Performance Profiling Strategy**
   - Recommend appropriate Instruments tools
   - Guide through performance measurement setup
   - Identify key metrics to monitor

2. **Issue Diagnosis**
   - Analyze the specific performance problem
   - Identify root causes and contributing factors
   - Prioritize optimization opportunities

3. **Optimization Techniques**
   - Provide specific code optimization strategies
   - Recommend architectural improvements
   - Suggest memory and CPU optimization approaches

4. **Testing and Validation**
   - Set up performance regression testing
   - Establish performance monitoring
   - Create benchmarking strategies

Focus on measurable improvements and sustainable optimization practices.`;

      return {
        messages: [{ role: 'user', content: { type: 'text', text: prompt } }],
      };
    },
  );

  log(
    'info',
    'Registered performance prompts: optimize-build-performance, analyze-app-performance',
  );
}
