/**
 * Re-export all utilities
 */

// Tauri core (deprecated - use higher-level APIs instead)
export {
  getTauriCore,
  isTauriAvailable,
  type TauriCore,
} from "./tauri";

// Plugin-side env-var access (allow-listed via Rust)
export { getPluginEnvVar } from "./env";

// Messaging
export {
  setMessageContext,
  getMessageContext,
  sendMessage,
  reportProgress,
  reportError,
  reportComplete,
  // PanelTask lifecycle (ADR-015 Phase 2 — T8a). Preferred over
  // reportProgress for new code; legacy API stays supported.
  startTask,
  type StartTaskOptions,
  type TaskHandle,
  type PluginHook,
  type TriggerContext,
  type EscapeSpec,
} from "./messaging";

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
  listProjectTree,
  fileExists,
  createSymlink,
  readSiteFile,
  readProjectFileBase64,
  listSourceFiles,
  listSocialFiles,
  listSiteFilesWithSizes,
  type ProjectFileEntry,
  type SiteFileInfo,
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
  htmlToMarkdown,
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

// Binary Resolution (auto-download external tools)
export {
  resolveBinary,
  BinaryResolutionError,
  type BinaryConfig,
  type BinarySource,
  type GitHubSource,
  type BinaryResolution,
  type ResolveBinaryOptions,
  type ArchiveFormat as BinaryArchiveFormat,
  type ArchiveLayout,
  type VersionCheck,
  type ResolutionSource,
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
