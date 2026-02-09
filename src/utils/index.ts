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
export {
  openBrowser,
  closeBrowser,
  openSystemBrowser,
  openBrowserWithHtml,
  showBrowserForm,
  type BrowserHandle,
  type BrowserCloseReason,
} from "./browser";

// File System (project files)
export {
  readFile,
  writeFile,
  listFiles,
  fileExists,
  createSymlink,
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
  httpPost,
  httpGet,
  downloadAsset,
  type FetchOptions,
  type FetchResult,
  type PostOptions,
  type GetOptions,
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

// Event Communication
export {
  emitEvent,
  onEvent,
  waitForEvent,
  isEventApiAvailable,
} from "./events";

// Toast Notifications
export {
  showToast,
  updateToast,
  dismissToast,
  TOAST_EVENT,
  TOAST_UPDATE_EVENT,
  TOAST_DISMISS_EVENT,
  type ToastVariant,
  type ToastAction,
  type ToastOptions,
  type ToastType, // deprecated
} from "./toast";
