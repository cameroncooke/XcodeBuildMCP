#!/usr/bin/env node

/**
 * Script to find all test files that use setTimeout-based mocking approach
 * These tests need to be converted to dependency injection pattern
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Patterns that indicate setTimeout-based mocking approach
const TIMEOUT_PATTERNS = [
  /setTimeout\s*\(\s*\(\s*\)\s*=>/,  // setTimeout(() => {
  /setTimeout\s*\(\s*function/,      // setTimeout(function() {
  /mockProcess\.stdout\.emit/,       // mockProcess.stdout.emit
  /mockProcess\.stderr\.emit/,       // mockProcess.stderr.emit
  /mockProcess\.emit\s*\(/,          // mockProcess.emit(
  /MockChildProcess\s+extends\s+EventEmitter/, // class MockChildProcess extends EventEmitter
  /new\s+EventEmitter\(\)/,          // new EventEmitter()
];

// Patterns that indicate the new dependency injection approach
const DEPENDENCY_INJECTION_PATTERNS = [
  /createMockExecutor/,              // createMockExecutor usage
  /executor\?\s*:\s*CommandExecutor/, // executor?: CommandExecutor parameter
  /vi\.fn\(\)\.mockResolvedValue/,   // vi.fn().mockResolvedValue for custom executors
  /vi\.fn\(\)\.mockRejectedValue/,   // vi.fn().mockRejectedValue for custom executors
];

function findTestFiles(dir) {
  const testFiles = [];
  
  function traverse(currentDir) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other non-relevant directories
        if (!item.startsWith('.') && item !== 'node_modules' && item !== 'dist' && item !== 'build') {
          traverse(fullPath);
        }
      } else if (item.endsWith('.test.ts') || item.endsWith('.test.js')) {
        testFiles.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return testFiles;
}

function analyzeTestFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = relative(projectRoot, filePath);
    
    // Check for setTimeout patterns
    const hasTimeoutPatterns = TIMEOUT_PATTERNS.some(pattern => pattern.test(content));
    
    // Check for dependency injection patterns
    const hasDIPatterns = DEPENDENCY_INJECTION_PATTERNS.some(pattern => pattern.test(content));
    
    // Extract specific setTimeout occurrences for details
    const timeoutDetails = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      TIMEOUT_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          timeoutDetails.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.source
          });
        }
      });
    });
    
    return {
      filePath: relativePath,
      hasTimeoutPatterns,
      hasDIPatterns,
      timeoutDetails,
      needsConversion: hasTimeoutPatterns && !hasDIPatterns,
      isConverted: hasDIPatterns && !hasTimeoutPatterns,
      isMixed: hasTimeoutPatterns && hasDIPatterns
    };
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}

function main() {
  console.log('🔍 Finding test files that need timeout-to-dependency-injection conversion...\n');
  
  const testFiles = findTestFiles(join(projectRoot, 'src'));
  const results = testFiles.map(analyzeTestFile).filter(Boolean);
  
  const needsConversion = results.filter(r => r.needsConversion);
  const converted = results.filter(r => r.isConverted);
  const mixed = results.filter(r => r.isMixed);
  const noTimeouts = results.filter(r => !r.hasTimeoutPatterns && !r.hasDIPatterns);
  
  console.log(`📊 ANALYSIS SUMMARY`);
  console.log(`==================`);
  console.log(`Total test files analyzed: ${results.length}`);
  console.log(`❌ Need conversion (setTimeout-based): ${needsConversion.length}`);
  console.log(`✅ Already converted (dependency injection): ${converted.length}`);
  console.log(`⚠️  Mixed (both patterns): ${mixed.length}`);
  console.log(`📝 No timeout patterns: ${noTimeouts.length}`);
  console.log('');
  
  if (needsConversion.length > 0) {
    console.log(`❌ FILES THAT NEED CONVERSION (${needsConversion.length}):`);
    console.log(`=====================================`);
    needsConversion.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);
      if (result.timeoutDetails.length > 0) {
        result.timeoutDetails.slice(0, 3).forEach(detail => { // Show first 3 occurrences
          console.log(`   Line ${detail.line}: ${detail.content}`);
        });
        if (result.timeoutDetails.length > 3) {
          console.log(`   ... and ${result.timeoutDetails.length - 3} more occurrences`);
        }
      }
      console.log('');
    });
  }
  
  if (mixed.length > 0) {
    console.log(`⚠️  FILES WITH MIXED PATTERNS (${mixed.length}):`);
    console.log(`===================================`);
    mixed.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);
      console.log(`   ⚠️  Contains both setTimeout and dependency injection patterns`);
      console.log('');
    });
  }
  
  if (converted.length > 0) {
    console.log(`✅ SUCCESSFULLY CONVERTED FILES (${converted.length}):`);
    console.log(`====================================`);
    converted.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath}`);
    });
    console.log('');
  }
  
  // Summary for next steps
  if (needsConversion.length > 0) {
    console.log(`🎯 NEXT STEPS:`);
    console.log(`=============`);
    console.log(`1. Convert ${needsConversion.length} files from setTimeout to dependency injection`);
    console.log(`2. Run this script again after each fix to track progress`);
    console.log(`3. Focus on files with the most timeout patterns first`);
    console.log('');
    
    // Show top files by timeout pattern count
    const sortedByPatterns = needsConversion
      .sort((a, b) => b.timeoutDetails.length - a.timeoutDetails.length)
      .slice(0, 5);
    
    console.log(`🎯 TOP 5 FILES BY TIMEOUT PATTERN COUNT:`);
    sortedByPatterns.forEach((result, index) => {
      console.log(`${index + 1}. ${result.filePath} (${result.timeoutDetails.length} patterns)`);
    });
  } else if (mixed.length === 0) {
    console.log(`🎉 ALL FILES CONVERTED!`);
    console.log(`======================`);
    console.log(`All test files have been successfully converted to dependency injection pattern.`);
  }
  
  // Exit with appropriate code
  process.exit(needsConversion.length > 0 || mixed.length > 0 ? 1 : 0);
}

main();