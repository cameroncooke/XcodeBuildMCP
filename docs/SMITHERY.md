# TypeScript Servers

> Deploy and publish TypeScript MCP servers on Smithery using Smithery CLI

## Overview

Deploy TypeScript MCP servers using the official MCP SDK with two deployment options:

* **Remote deployment**: Automatic containerization and infrastructure managed by Smithery
* **Local servers** (Beta): Distribute your server as [MCP bundle](https://github.com/anthropics/mcpb) allowing users to run it locally and one-click install it

## Prerequisites

* TypeScript MCP server using the official MCP SDK that exports the MCP server object at entry point
* Node.js 18+ and npm installed locally
* Smithery CLI installed as a dev dependency (`npm i -D @smithery/cli`)

<Note>
  **New to MCP servers?** See the [Getting Started guide](/getting_started) to learn how to build TypeScript MCP servers from scratch using the official SDK.
</Note>

## Project Structure

Your TypeScript project should look like this:

```
my-mcp-server/
  smithery.yaml          # Smithery configuration
  package.json           # Node.js dependencies and scripts
  tsconfig.json          # TypeScript configuration
  src/
    index.ts             # Your MCP server code with exported createServer function
```

## Setup

### 1. Configure smithery.yaml

Create a `smithery.yaml` file in your repository root (usually where the `package.json` is):

#### Remote Deployment (Default)

```yaml  theme={null}
runtime: "typescript"
```

#### Local Server (Beta)

```yaml  theme={null}
runtime: "typescript"
target: "local"
```

<Note>
  **Local servers are in beta** - When you set `target: "local"`, your server runs locally on user's machine but is accessible through Smithery's registry for easy discovery and connection by MCP clients.
</Note>

### 2. Configure package.json

Your `package.json` must include the `module` field pointing to your server entry point:

```json  theme={null}
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "module": "src/index.ts",  // Points to your server entry point
  "scripts": {
    "build": "npx smithery build",
    "dev": "npx smithery dev"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.17.3",
    "zod": "^3.25.46"
  },
  "devDependencies": {
    "@smithery/cli": "^1.4.6"
  }
}
```

<Note>
  Install the CLI locally with:

  ```bash  theme={null}
  npm i -D @smithery/cli
  ```

  The Smithery CLI externalizes your SDKs during bundling so your runtime uses the versions you install. If you see a warning about missing SDKs, add them to your dependencies (most servers need `@modelcontextprotocol/sdk` and `@smithery/sdk`).
</Note>

### 3. Ensure Proper Server Structure

Your TypeScript MCP server must export a default `createServer` function that returns the MCP server object. If you built your server following the [Getting Started guide](/getting_started), it should already have this structure.

```typescript  theme={null}
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Required: Export default createServer function
export default function createServer({ config }) {
  // config contains user-provided settings (see configSchema below)
  const server = new McpServer({
    name: "Your Server Name",
    version: "1.0.0",
  });

  // Register your tools here...

  return server.server; // Must return the MCP server object
}
```

**Optional Configuration Schema**: If your server needs user configuration (API keys, settings, etc.), export a `configSchema`:

```typescript  theme={null}
// Optional: If your server doesn't need configuration, omit this
export const configSchema = z.object({
  apiKey: z.string().describe("Your API key"),
  timeout: z.number().default(5000).describe("Request timeout in milliseconds"),
});
```

**Where it goes**: Export `configSchema` from the same file as your `createServer` function (typically `src/index.ts`).

**What it does**: Automatically generates [session configuration](/build/session-config) forms for users connecting to your server.

## OAuth

<Note>
  OAuth is designed only for **remote servers**. OAuth is not available for local servers (`target: "local"`).
</Note>

If your entry module exports `oauth`, Smithery CLI auto-mounts the required OAuth endpoints for you during remote deployment.

### Export an OAuth provider

```typescript  theme={null}
// src/index.ts
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { OAuthProvider } from "@smithery/sdk"
import { MyProvider } from "./provider.js"

export default function createServer({ auth }: { auth: AuthInfo }) {
  const server = new McpServer({ name: "My MCP", version: "1.0.0" })
  // register tools...
  return server.server
}

export const oauth: OAuthProvider = new MyProvider() // [!code highlight]
```

The CLI detects `oauth` and injects the auth routes automatically. For implementing `OAuthServerProvider`, see the [official MCP SDK authorization guide](https://modelcontextprotocol.io/docs/tutorials/security/authorization).

<Tip>
  **You don't need to implement client registration.** Modern MCP clients use [Client ID Metadata Documents](https://modelcontextprotocol.io/specification/draft/basic/authorization#client-id-metadata-documents) (CIMD). Your server should advertise `client_id_metadata_document_supported: true` in its OAuth metadata — see the [spec requirements](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization#implementation-requirements).
</Tip>

## Local Development

Test your server locally using the Smithery CLI:

```bash  theme={null}
# Start development server with interactive playground
npm run dev
```

This opens the **Smithery interactive playground** where you can:

* Test your MCP server tools in real-time
* See tool responses and debug issues
* Validate your configuration schema
* Experiment with different inputs

## Advanced Build Configuration

For advanced use cases, you can customize the build process using a `smithery.config.js` file. This is useful for:

* Marking packages as external (to avoid bundling issues)
* Configuring minification, targets, and other build options
* Adding custom esbuild plugins

### Configuration File

Create `smithery.config.js` in your project root:

```javascript  theme={null}
export default {
  esbuild: {
    // Mark problematic packages as external
    external: ["playwright-core", "puppeteer-core"],

    // Enable minification for production
    minify: true,

    // Set Node.js target version
    target: "node18",
  },
};
```

### Common Use Cases

**External Dependencies**: If you encounter bundling issues with packages like Playwright or native modules:

```javascript  theme={null}
export default {
  esbuild: {
    external: ["playwright-core", "sharp", "@grpc/grpc-js"],
  },
};
```

Configuration applies to both `build` and `dev` commands.

## Deploy

1. Push your code (including `smithery.yaml`) to GitHub
2. [Connect your GitHub](https://smithery.ai/new) to Smithery (or claim your server if already listed)
3. Navigate to the Deployments tab on your server page
4. Click Deploy to build and host your server

## Good to Know

<Accordion title="What happens under the hood">
  **Remote Deployment**: When you deploy to Smithery's infrastructure:

  1. Clone your repository
  2. Parse your `smithery.yaml` to detect TypeScript runtime
  3. Install dependencies with `npm ci`
  4. Build your TypeScript code using the `module` entry point from your `package.json`
  5. Package your server into a containerized HTTP service
  6. Deploy the container to our hosting infrastructure
  7. Send MCP `initialize` and `list_tools` messages with a dummy configuration to discover your server's capabilities
  8. Make it available at `https://server.smithery.ai/your-server`
  9. Handle load balancing, scaling, and monitoring

  **Local Server (Beta)**: When you use `target: "local"`:

  1. Your server runs locally on user's machine using `npm run dev`
  2. Smithery registers your server in the registry for discovery
  3. MCP clients can find and connect to your local server through Smithery
  4. Your server remains under your control while being accessible to others
</Accordion>

## Troubleshooting

<Accordion title="Why does my deployment fail?">
  Common issues and solutions:

  **Remote Deployment Issues**:

  * **Missing module field**: Ensure your `package.json` has the `module` field pointing to your entry point
  * **Dependencies not found**: All dependencies must be listed in `dependencies` or `devDependencies`
  * **Server doesn't build locally**: Before deploying, verify your server builds and runs locally:
    ```bash  theme={null}
    npm install
    npm run build
    ```
    If this fails, fix any TypeScript compilation errors or missing dependencies first

  **Local Server Issues** (Beta):

  * **Server not discoverable**: Ensure you have `target: "local"` in your `smithery.yaml`
  * **Local server won't start**: Verify your server runs with `npm run dev` before expecting registry integration
  * **Connection issues**: Make sure your local development environment allows the necessary network connections
</Accordion>


---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://smithery.ai/docs/llms.txt