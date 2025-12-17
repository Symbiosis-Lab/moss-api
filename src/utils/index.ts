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

// File System
export {
  readFile,
  writeFile,
  listFiles,
  fileExists,
} from "./filesystem";

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

// Cookie Management
export {
  getPluginCookie,
  setPluginCookie,
  type Cookie,
} from "./cookies";
