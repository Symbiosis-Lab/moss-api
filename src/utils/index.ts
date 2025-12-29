/**
 * Re-export all utilities
 */

// Tauri core (deprecated - use higher-level APIs instead)
export {
  getTauriCore,
  isTauriAvailable,
  type TauriCore,
} from "./tauri";

// Messaging
export {
  setMessageContext,
  getMessageContext,
  sendMessage,
  reportProgress,
  reportError,
  reportComplete,
} from "./messaging";

// Logging
export { log, warn, error } from "./logger";

// Browser
export { openBrowser, closeBrowser } from "./browser";

// File System (project files)
export {
  readFile,
  writeFile,
  listFiles,
  fileExists,
} from "./filesystem";

// Plugin Storage (plugin's private directory)
export {
  readPluginFile,
  writePluginFile,
  listPluginFiles,
  pluginFileExists,
} from "./plugin-storage";

// HTTP
export {
  fetchUrl,
  downloadAsset,
  type FetchOptions,
  type FetchResult,
  type DownloadOptions,
  type DownloadResult,
} from "./http";

// Binary Execution
export {
  executeBinary,
  type ExecuteOptions,
  type ExecuteResult,
} from "./binary";

// Platform Detection
export {
  getPlatformInfo,
  clearPlatformCache,
  type OSType,
  type ArchType,
  type PlatformKey,
  type PlatformInfo,
} from "./platform";

// Archive Extraction
export {
  extractArchive,
  makeExecutable,
  type ArchiveFormat,
  type ExtractOptions,
  type ExtractResult,
} from "./archive";

// Binary Resolution (auto-download external tools)
export {
  resolveBinary,
  BinaryResolutionError,
  type BinaryConfig,
  type BinarySource,
  type GitHubSource,
  type BinaryResolution,
  type ResolveBinaryOptions,
} from "./binary-resolver";

// Cookie Management
export {
  getPluginCookie,
  setPluginCookie,
  type Cookie,
} from "./cookies";

// Window/Dialog Management
export {
  showPluginDialog,
  submitDialogResult,
  cancelDialog,
  type DialogResult,
  type ShowDialogOptions,
} from "./window";

// Event Communication
export {
  emitEvent,
  onEvent,
  waitForEvent,
  isEventApiAvailable,
} from "./events";
