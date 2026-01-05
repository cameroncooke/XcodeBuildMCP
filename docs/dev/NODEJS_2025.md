# Modern Node.js Development Guide

This guide provides actionable instructions for AI agents to apply modern Node.js patterns when the scenarios are applicable. Use these patterns when creating or modifying Node.js code that fits these use cases.

## Core Principles

**WHEN APPLICABLE** apply these modern patterns:

1. **Use ES Modules** with `node:` prefix for built-in modules
2. **Leverage built-in APIs** over external dependencies when the functionality matches
3. **Use top-level await** instead of IIFE patterns when initialization is needed
4. **Implement structured error handling** with proper context when handling application errors
5. **Use built-in testing** over external test frameworks when adding tests
6. **Apply modern async patterns** for better performance when dealing with async operations

## 1. Module System Patterns

### WHEN USING MODULES: ES Modules with node: Prefix

**✅ DO THIS:**
```javascript
// Use ES modules with node: prefix for built-ins
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { EventEmitter } from 'node:events';

export function myFunction() {
  return 'modern code';
}
```

**❌ AVOID:**
```javascript
// Don't use CommonJS or bare imports for built-ins
const fs = require('fs');
const { readFile } = require('fs/promises');
import { readFile } from 'fs/promises'; // Missing node: prefix
```

### WHEN INITIALIZING: Top-Level Await

**✅ DO THIS:**
```javascript
// Use top-level await for initialization
import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile('config.json', 'utf8'));
const server = createServer(/* ... */);

console.log('App started with config:', config.appName);
```

**❌ AVOID:**
```javascript
// Don't wrap in IIFE
(async () => {
  const config = JSON.parse(await readFile('config.json', 'utf8'));
  // ...
})();
```

### WHEN USING ES MODULES: Package.json Settings

**✅ ENSURE package.json includes:**
```json
{
  "type": "module",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## 2. HTTP and Network Patterns

### WHEN MAKING HTTP REQUESTS: Use Built-in fetch

**✅ DO THIS:**
```javascript
// Use built-in fetch with AbortSignal.timeout
async function fetchData(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}
```

**❌ AVOID:**
```javascript
// Don't add axios, node-fetch, or similar dependencies
const axios = require('axios');
const response = await axios.get(url);
```

### WHEN NEEDING CANCELLATION: AbortController Pattern

**✅ DO THIS:**
```javascript
// Implement proper cancellation
const controller = new AbortController();
setTimeout(() => controller.abort(), 10000);

try {
  const data = await fetch(url, { signal: controller.signal });
  console.log('Data received:', data);
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## 3. Testing Patterns

### WHEN ADDING TESTS: Use Built-in Test Runner

**✅ DO THIS:**
```javascript
// Use node:test instead of external frameworks
import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('My Module', () => {
  test('should work correctly', () => {
    assert.strictEqual(myFunction(), 'expected');
  });

  test('should handle async operations', async () => {
    const result = await myAsyncFunction();
    assert.strictEqual(result, 'expected');
  });

  test('should throw on invalid input', () => {
    assert.throws(() => myFunction('invalid'), /Expected error/);
  });
});
```

**✅ RECOMMENDED package.json scripts:**
```json
{
  "scripts": {
    "test": "node --test",
    "test:watch": "node --test --watch",
    "test:coverage": "node --test --experimental-test-coverage"
  }
}
```

**❌ AVOID:**
```javascript
// Don't add Jest, Mocha, or other test frameworks unless specifically required
```

## 4. Async Pattern Recommendations

### WHEN HANDLING MULTIPLE ASYNC OPERATIONS: Parallel Execution with Promise.all

**✅ DO THIS:**
```javascript
// Execute independent operations in parallel
async function processData() {
  try {
    const [config, userData] = await Promise.all([
      readFile('config.json', 'utf8'),
      fetch('/api/user').then(r => r.json())
    ]);

    const processed = processUserData(userData, JSON.parse(config));
    await writeFile('output.json', JSON.stringify(processed, null, 2));

    return processed;
  } catch (error) {
    console.error('Processing failed:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}
```

### WHEN PROCESSING EVENT STREAMS: AsyncIterators Pattern

**✅ DO THIS:**
```javascript
// Use async iterators for event processing
import { EventEmitter } from 'node:events';

class DataProcessor extends EventEmitter {
  async *processStream() {
    for (let i = 0; i < 10; i++) {
      this.emit('data', `chunk-${i}`);
      yield `processed-${i}`;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.emit('end');
  }
}

// Consume with for-await-of
const processor = new DataProcessor();
for await (const result of processor.processStream()) {
  console.log('Processed:', result);
}
```

## 5. Stream Processing Patterns

### WHEN PROCESSING STREAMS: Use pipeline with Promises

**✅ DO THIS:**
```javascript
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { Transform } from 'node:stream';

// Always use pipeline for stream processing
async function processFile(inputFile, outputFile) {
  try {
    await pipeline(
      createReadStream(inputFile),
      new Transform({
        transform(chunk, encoding, callback) {
          this.push(chunk.toString().toUpperCase());
          callback();
        }
      }),
      createWriteStream(outputFile)
    );
    console.log('File processed successfully');
  } catch (error) {
    console.error('Pipeline failed:', error);
    throw error;
  }
}
```

### WHEN NEEDING BROWSER COMPATIBILITY: Web Streams

**✅ DO THIS:**
```javascript
import { Readable } from 'node:stream';

// Convert between Web Streams and Node streams when needed
const webReadable = new ReadableStream({
  start(controller) {
    controller.enqueue('Hello ');
    controller.enqueue('World!');
    controller.close();
  }
});

const nodeStream = Readable.fromWeb(webReadable);
```

## 6. CPU-Intensive Task Patterns

### WHEN DOING HEAVY COMPUTATION: Worker Threads

**✅ DO THIS:**
```javascript
// worker.js - Separate file for CPU-intensive tasks
import { parentPort, workerData } from 'node:worker_threads';

function heavyComputation(data) {
  // CPU-intensive work here
  return processedData;
}

const result = heavyComputation(workerData);
parentPort.postMessage(result);
```

```javascript
// main.js - Delegate to worker
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

async function processHeavyTask(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      fileURLToPath(new URL('./worker.js', import.meta.url)),
      { workerData: data }
    );

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}
```

## 7. Development Configuration Patterns

### FOR NEW PROJECTS: Modern package.json

**✅ RECOMMENDED for new projects:**
```json
{
  "name": "modern-node-app",
  "type": "module",
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "dev": "node --watch --env-file=.env app.js",
    "test": "node --test --watch",
    "start": "node app.js"
  }
}
```

### WHEN LOADING ENVIRONMENT VARIABLES: Built-in Support

**✅ DO THIS:**
```javascript
// Use --env-file flag instead of dotenv package
// Environment variables are automatically available
console.log('Database URL:', process.env.DATABASE_URL);
console.log('API Key loaded:', process.env.API_KEY ? 'Yes' : 'No');
```

**❌ AVOID:**
```javascript
// Don't add dotenv dependency
require('dotenv').config();
```

## 8. Error Handling Patterns

### WHEN CREATING CUSTOM ERRORS: Structured Error Classes

**✅ DO THIS:**
```javascript
class AppError extends Error {
  constructor(message, code, statusCode = 500, context = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

// Usage with rich context
throw new AppError(
  'Database connection failed',
  'DB_CONNECTION_ERROR',
  503,
  { host: 'localhost', port: 5432, retryAttempt: 3 }
);
```

## 9. Performance Monitoring Patterns

### WHEN MONITORING PERFORMANCE: Built-in Performance APIs

**✅ DO THIS:**
```javascript
import { PerformanceObserver, performance } from 'node:perf_hooks';

// Set up performance monitoring
const obs = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 100) {
      console.log(`Slow operation: ${entry.name} took ${entry.duration}ms`);
    }
  }
});
obs.observe({ entryTypes: ['function', 'http', 'dns'] });

// Instrument operations
async function processLargeDataset(data) {
  performance.mark('processing-start');
  
  const result = await heavyProcessing(data);
  
  performance.mark('processing-end');
  performance.measure('data-processing', 'processing-start', 'processing-end');
  
  return result;
}
```

## 10. Module Organization Patterns

### WHEN ORGANIZING INTERNAL MODULES: Import Maps

**✅ DO THIS in package.json:**
```json
{
  "imports": {
    "#config": "./src/config/index.js",
    "#utils/*": "./src/utils/*.js",
    "#db": "./src/database/connection.js"
  }
}
```

**✅ Use in code:**
```javascript
// Clean internal imports
import config from '#config';
import { logger, validator } from '#utils/common';
import db from '#db';
```

### WHEN LOADING CONDITIONALLY: Dynamic Imports

**✅ DO THIS:**
```javascript
// Load features based on environment
async function loadDatabaseAdapter() {
  const dbType = process.env.DATABASE_TYPE || 'sqlite';
  
  try {
    const adapter = await import(`#db/adapters/${dbType}`);
    return adapter.default;
  } catch (error) {
    console.warn(`Database adapter ${dbType} not available, falling back to sqlite`);
    const fallback = await import('#db/adapters/sqlite');
    return fallback.default;
  }
}
```

## 11. Diagnostic Patterns

### WHEN ADDING OBSERVABILITY: Diagnostic Channels

**✅ DO THIS:**
```javascript
import diagnostics_channel from 'node:diagnostics_channel';

// Create diagnostic channels
const dbChannel = diagnostics_channel.channel('app:database');

// Subscribe to events
dbChannel.subscribe((message) => {
  console.log('Database operation:', {
    operation: message.operation,
    duration: message.duration,
    query: message.query
  });
});

// Publish diagnostic information
async function queryDatabase(sql, params) {
  const start = performance.now();
  
  try {
    const result = await db.query(sql, params);
    
    dbChannel.publish({
      operation: 'query',
      sql,
      params,
      duration: performance.now() - start,
      success: true
    });
    
    return result;
  } catch (error) {
    dbChannel.publish({
      operation: 'query',
      sql,
      params,
      duration: performance.now() - start,
      success: false,
      error: error.message
    });
    throw error;
  }
}
```

## Modernization Checklist

When working with Node.js code, consider applying these patterns where applicable:

- [ ] `"type": "module"` in package.json
- [ ] `"engines": {"node": ">=20.0.0"}` specified
- [ ] All built-in imports use `node:` prefix
- [ ] Using `fetch()` instead of HTTP libraries
- [ ] Using `node --test` instead of external test frameworks
- [ ] Using `--watch` and `--env-file` flags
- [ ] Implementing structured error handling
- [ ] Using `Promise.all()` for parallel operations
- [ ] Using `pipeline()` for stream processing
- [ ] Implementing performance monitoring where appropriate
- [ ] Using worker threads for CPU-intensive tasks
- [ ] Using import maps for internal modules

## Dependencies to Remove

When modernizing, remove these dependencies if present:

- `axios`, `node-fetch`, `got` → Use built-in `fetch()`
- `jest`, `mocha`, `ava` → Use `node:test`
- `nodemon` → Use `node --watch`
- `dotenv` → Use `--env-file`
- `cross-env` → Use native environment handling

## Security Patterns

**WHEN SECURITY IS A CONCERN** apply these practices:

```bash
# Use permission model for enhanced security
node --experimental-permission --allow-fs-read=./data --allow-fs-write=./logs app.js

# Network restrictions
node --experimental-permission --allow-net=api.example.com app.js
```

This guide provides modern Node.js patterns to apply when the specific scenarios are encountered, ensuring code follows 2025 best practices for performance, security, and maintainability without forcing unnecessary changes.