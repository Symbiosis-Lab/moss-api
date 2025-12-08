# moss-api

[![CI](https://github.com/Symbiosis-Lab/moss-api/actions/workflows/ci.yml/badge.svg)](https://github.com/Symbiosis-Lab/moss-api/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Symbiosis-Lab/moss-api/branch/main/graph/badge.svg)](https://codecov.io/gh/Symbiosis-Lab/moss-api)
[![npm version](https://badge.fury.io/js/moss-api.svg)](https://www.npmjs.com/package/moss-api)

Official API for building Moss plugins. Provides types and utilities for plugin development.

## Installation

```bash
npm install moss-api
```

## Usage

### Types

```typescript
import type {
  OnDeployContext,
  AfterDeployContext,
  HookResult,
  PluginManifest,
  PluginCategory,
} from "moss-api";

// Define your plugin manifest
const manifest: PluginManifest = {
  name: "my-plugin",
  version: "1.0.0",
  entry: "main.js",
  category: "deployer",
};

// Implement a hook
async function onDeploy(context: OnDeployContext): Promise<HookResult> {
  // Your deployment logic here
  return { success: true, message: "Deployed successfully" };
}
```

### Utilities

```typescript
import {
  setMessageContext,
  reportProgress,
  reportError,
  reportComplete,
  log,
  warn,
  error,
} from "moss-api";

// Set plugin context (call once at plugin initialization)
setMessageContext("my-plugin", "on_deploy");

// Report progress during long operations
await reportProgress("deploying", 50, 100, "Uploading files...");

// Log messages
await log("Deployment started");
await warn("Deprecation warning");
await error("Something went wrong");

// Report errors with context
await reportError("Upload failed", "network", false);

// Report completion with result
await reportComplete({ url: "https://example.com" });
```

### Browser Utilities

```typescript
import { openBrowser, closeBrowser } from "moss-api";

// Open authentication page in plugin browser window
await openBrowser("https://example.com/auth");

// Close browser window when done
await closeBrowser();
```

### Tauri Utilities

```typescript
import { getTauriCore, isTauriAvailable } from "moss-api";

// Check if running in Tauri environment
if (isTauriAvailable()) {
  const core = getTauriCore();
  const result = await core.invoke("my_command", { arg: "value" });
}
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `ProjectInfo` | Project metadata (type, folders, files) |
| `PluginManifest` | Plugin configuration (name, version, entry, category) |
| `PluginCategory` | Union: "generator" \| "deployer" \| "syndicator" \| "enhancer" \| "processor" |
| `BaseContext` | Base hook context with project info |
| `BeforeBuildContext` | Context for before_build hook |
| `OnBuildContext` | Context for on_build hook (includes source files) |
| `OnDeployContext` | Context for on_deploy hook (includes output files) |
| `AfterDeployContext` | Context for after_deploy hook (includes articles, deployment) |
| `SourceFiles` | Categorized source files (markdown, pages, docx, other) |
| `ArticleInfo` | Article metadata for syndication |
| `DeploymentInfo` | Deployment result (method, url, timestamp, metadata) |
| `HookResult` | Standard hook return type |
| `PluginMessage` | Union of all message types |
| `LogMessage` | Log message with level |
| `ProgressMessage` | Progress update message |
| `ErrorMessage` | Error message with context and fatal flag |
| `CompleteMessage` | Completion message with result |

### Functions

| Function | Description |
|----------|-------------|
| `getTauriCore()` | Get Tauri API (throws if unavailable) |
| `isTauriAvailable()` | Check if Tauri is available |
| `setMessageContext(pluginName, hookName)` | Set context for messages |
| `getMessageContext()` | Get current message context |
| `sendMessage(message)` | Send raw message to Moss |
| `reportProgress(phase, current, total, message?)` | Report progress |
| `reportError(error, context?, fatal?)` | Report error |
| `reportComplete(result)` | Report completion |
| `log(message)` | Log info message |
| `warn(message)` | Log warning message |
| `error(message)` | Log error message |
| `openBrowser(url)` | Open URL in plugin browser |
| `closeBrowser()` | Close plugin browser |

## License

MIT - see [LICENSE](LICENSE) for details.
