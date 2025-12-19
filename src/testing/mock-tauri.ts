/**
 * Tauri IPC mocking utilities for testing Moss plugins
 *
 * Provides in-memory implementations of Tauri IPC commands that plugins use
 * through moss-api. This enables integration testing without a running Tauri app.
 *
 * @example
 * ```typescript
 * import { setupMockTauri } from "@symbiosis-lab/moss-api/testing";
 *
 * describe("my plugin", () => {
 *   let ctx: MockTauriContext;
 *
 *   beforeEach(() => {
 *     ctx = setupMockTauri();
 *   });
 *
 *   afterEach(() => {
 *     ctx.cleanup();
 *   });
 *
 *   it("reads files", async () => {
 *     ctx.filesystem.setFile("/project/test.md", "# Hello");
 *     const content = await readFile("/project", "test.md");
 *     expect(content).toBe("# Hello");
 *   });
 * });
 * ```
 */

// Define minimal types for invoke args
interface InvokeArgs {
  [key: string]: unknown;
}

// ============================================================================
// Mock Filesystem
// ============================================================================

/**
 * A file stored in the mock filesystem
 */
export interface MockFile {
  content: string;
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * In-memory filesystem for testing file operations
 */
export interface MockFilesystem {
  /** Internal file storage */
  files: Map<string, MockFile>;
  /** Get a file by full path */
  getFile(path: string): MockFile | undefined;
  /** Set a file's content (creates or updates) */
  setFile(path: string, content: string): void;
  /** Delete a file */
  deleteFile(path: string): boolean;
  /** List files matching an optional pattern */
  listFiles(pattern?: string): string[];
  /** Clear all files */
  clear(): void;
}

/**
 * Create a new mock filesystem instance
 */
export function createMockFilesystem(): MockFilesystem {
  const files = new Map<string, MockFile>();

  return {
    files,
    getFile(path: string) {
      return files.get(path);
    },
    setFile(path: string, content: string) {
      const now = new Date();
      const existing = files.get(path);
      files.set(path, {
        content,
        createdAt: existing?.createdAt ?? now,
        modifiedAt: now,
      });
    },
    deleteFile(path: string) {
      return files.delete(path);
    },
    listFiles(pattern?: string) {
      const allPaths = Array.from(files.keys());
      if (!pattern) return allPaths;
      // Simple glob matching
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
      );
      return allPaths.filter((p) => regex.test(p));
    },
    clear() {
      files.clear();
    },
  };
}

// ============================================================================
// Download Tracker
// ============================================================================

/**
 * Tracks download activity for testing concurrency and completion
 */
export interface DownloadTracker {
  /** Number of currently active downloads */
  activeDownloads: number;
  /** Maximum concurrent downloads observed */
  maxConcurrent: number;
  /** URLs of completed downloads */
  completedDownloads: string[];
  /** Failed downloads with error messages */
  failedDownloads: Array<{ url: string; error: string }>;
  /** Mark a download as started */
  startDownload(url: string): void;
  /** Mark a download as ended */
  endDownload(url: string, success: boolean, error?: string): void;
  /** Reset all tracking state */
  reset(): void;
}

/**
 * Create a new download tracker instance
 */
export function createDownloadTracker(): DownloadTracker {
  let activeDownloads = 0;
  let maxConcurrent = 0;
  const completedDownloads: string[] = [];
  const failedDownloads: Array<{ url: string; error: string }> = [];

  return {
    get activeDownloads() {
      return activeDownloads;
    },
    get maxConcurrent() {
      return maxConcurrent;
    },
    get completedDownloads() {
      return completedDownloads;
    },
    get failedDownloads() {
      return failedDownloads;
    },
    startDownload(url: string) {
      activeDownloads++;
      if (activeDownloads > maxConcurrent) {
        maxConcurrent = activeDownloads;
      }
    },
    endDownload(url: string, success: boolean, error?: string) {
      activeDownloads--;
      if (success) {
        completedDownloads.push(url);
      } else {
        failedDownloads.push({ url, error: error || "Unknown error" });
      }
    },
    reset() {
      activeDownloads = 0;
      maxConcurrent = 0;
      completedDownloads.length = 0;
      failedDownloads.length = 0;
    },
  };
}

// ============================================================================
// URL Response Configuration
// ============================================================================

/**
 * Configuration for a mocked URL response
 */
export interface MockUrlResponse {
  /** HTTP status code */
  status: number;
  /** Whether the request was successful (2xx) */
  ok: boolean;
  /** Content-Type header */
  contentType?: string;
  /** Response body as base64 (for fetch_url) */
  bodyBase64?: string;
  /** Number of bytes written (for download_asset) */
  bytesWritten?: number;
  /** Actual file path where asset was saved */
  actualPath?: string;
  /** Artificial delay in milliseconds */
  delay?: number;
}

/**
 * URL response configuration for mocking HTTP requests
 */
export interface MockUrlConfig {
  /** Map of URL to response(s) */
  responses: Map<string, MockUrlResponse | MockUrlResponse[]>;
  /** Default response for unregistered URLs */
  defaultResponse: MockUrlResponse;
  /** Set response for a URL (can be single or array for retry testing) */
  setResponse(url: string, response: MockUrlResponse | MockUrlResponse[]): void;
  /** Get response for a URL (handles retry sequences) */
  getResponse(url: string): MockUrlResponse;
  /** Reset all URL configurations */
  reset(): void;
}

/**
 * Create a new URL config instance
 */
export function createMockUrlConfig(): MockUrlConfig {
  const responses = new Map<string, MockUrlResponse | MockUrlResponse[]>();
  const callCounts = new Map<string, number>();

  // Default: 1x1 red PNG
  const defaultResponse: MockUrlResponse = {
    status: 200,
    ok: true,
    contentType: "image/png",
    bodyBase64:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    bytesWritten: 68,
    actualPath: "assets/image.png",
  };

  return {
    responses,
    defaultResponse,
    setResponse(url: string, response: MockUrlResponse | MockUrlResponse[]) {
      responses.set(url, response);
      callCounts.set(url, 0);
    },
    getResponse(url: string): MockUrlResponse {
      const config = responses.get(url);
      if (!config) return defaultResponse;

      if (Array.isArray(config)) {
        const count = callCounts.get(url) || 0;
        callCounts.set(url, count + 1);
        // Return the response at the current index, or the last one if exceeded
        return config[Math.min(count, config.length - 1)];
      }

      return config;
    },
    reset() {
      responses.clear();
      callCounts.clear();
    },
  };
}

// ============================================================================
// Binary Execution Tracker
// ============================================================================

/**
 * Result for a mocked binary execution
 */
export interface MockBinaryResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Configuration for mocking binary execution
 */
export interface MockBinaryConfig {
  /** Map of binary commands to results */
  results: Map<string, MockBinaryResult>;
  /** Default result for unregistered binaries */
  defaultResult: MockBinaryResult;
  /** Set result for a binary command (key format: "binaryPath args...") */
  setResult(key: string, result: MockBinaryResult): void;
  /** Get result for a binary command */
  getResult(binaryPath: string, args: string[]): MockBinaryResult;
  /** Reset all configurations */
  reset(): void;
}

/**
 * Create a new binary config instance
 */
export function createMockBinaryConfig(): MockBinaryConfig {
  const results = new Map<string, MockBinaryResult>();

  const defaultResult: MockBinaryResult = {
    success: true,
    exitCode: 0,
    stdout: "",
    stderr: "",
  };

  return {
    results,
    defaultResult,
    setResult(key: string, result: MockBinaryResult) {
      results.set(key, result);
    },
    getResult(binaryPath: string, args: string[]): MockBinaryResult {
      // Try exact match first
      const exactKey = `${binaryPath} ${args.join(" ")}`.trim();
      if (results.has(exactKey)) {
        return results.get(exactKey)!;
      }
      // Try binary name only
      if (results.has(binaryPath)) {
        return results.get(binaryPath)!;
      }
      return defaultResult;
    },
    reset() {
      results.clear();
    },
  };
}

// ============================================================================
// Cookie Storage
// ============================================================================

/**
 * Mock cookie storage for plugin authentication testing
 */
export interface MockCookieStorage {
  /** Map of pluginName:projectPath to cookies */
  cookies: Map<string, Array<{ name: string; value: string; domain?: string; path?: string }>>;
  /** Get cookies for a plugin/project */
  getCookies(
    pluginName: string,
    projectPath: string
  ): Array<{ name: string; value: string; domain?: string; path?: string }>;
  /** Set cookies for a plugin/project */
  setCookies(
    pluginName: string,
    projectPath: string,
    cookies: Array<{ name: string; value: string; domain?: string; path?: string }>
  ): void;
  /** Clear all cookies */
  clear(): void;
}

/**
 * Create a new cookie storage instance
 */
export function createMockCookieStorage(): MockCookieStorage {
  const cookies = new Map<
    string,
    Array<{ name: string; value: string; domain?: string; path?: string }>
  >();

  return {
    cookies,
    getCookies(pluginName: string, projectPath: string) {
      const key = `${pluginName}:${projectPath}`;
      return cookies.get(key) || [];
    },
    setCookies(
      pluginName: string,
      projectPath: string,
      newCookies: Array<{ name: string; value: string; domain?: string; path?: string }>
    ) {
      const key = `${pluginName}:${projectPath}`;
      cookies.set(key, newCookies);
    },
    clear() {
      cookies.clear();
    },
  };
}

// ============================================================================
// Browser Tracker
// ============================================================================

/**
 * Tracks browser open/close calls for testing
 */
export interface MockBrowserTracker {
  /** URLs that were opened */
  openedUrls: string[];
  /** Number of times closeBrowser was called */
  closeCount: number;
  /** Whether browser is currently open */
  isOpen: boolean;
  /** Reset tracking state */
  reset(): void;
}

/**
 * Create a new browser tracker instance
 */
export function createMockBrowserTracker(): MockBrowserTracker {
  const openedUrls: string[] = [];
  let closeCount = 0;
  let isOpen = false;

  return {
    get openedUrls() {
      return openedUrls;
    },
    get closeCount() {
      return closeCount;
    },
    get isOpen() {
      return isOpen;
    },
    reset() {
      openedUrls.length = 0;
      closeCount = 0;
      isOpen = false;
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract filename from URL (mimics Rust backend behavior)
 */
function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split("/").filter((s) => s.length > 0);

    // Try to find UUID in path
    for (const segment of segments) {
      if (
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
          segment
        )
      ) {
        return `${segment}.png`; // Default to PNG for mock
      }
    }

    // Fallback to last segment or hash
    const lastSegment = segments[segments.length - 1] || "image";
    return lastSegment.includes(".") ? lastSegment : `${lastSegment}.png`;
  } catch {
    return "image.png";
  }
}

// ============================================================================
// Main Setup Function
// ============================================================================

/**
 * Context returned by setupMockTauri with all mock utilities
 */
export interface MockTauriContext {
  /** In-memory filesystem */
  filesystem: MockFilesystem;
  /** Download tracking for concurrency tests */
  downloadTracker: DownloadTracker;
  /** URL response configuration */
  urlConfig: MockUrlConfig;
  /** Binary execution configuration */
  binaryConfig: MockBinaryConfig;
  /** Cookie storage */
  cookieStorage: MockCookieStorage;
  /** Browser open/close tracking */
  browserTracker: MockBrowserTracker;
  /** Cleanup function - must be called after tests */
  cleanup: () => void;
}

/**
 * Set up mock Tauri IPC for testing
 *
 * This sets up `window.__TAURI__.core.invoke` to intercept all IPC calls
 * and route them to in-memory implementations.
 *
 * @returns Context with mock utilities and cleanup function
 *
 * @example
 * ```typescript
 * const ctx = setupMockTauri();
 *
 * // Set up test data
 * ctx.filesystem.setFile("/project/article.md", "# Test");
 * ctx.urlConfig.setResponse("https://example.com/image.png", {
 *   status: 200,
 *   ok: true,
 *   contentType: "image/png",
 *   bytesWritten: 1024,
 * });
 *
 * // Run your plugin code...
 *
 * // Verify results
 * expect(ctx.downloadTracker.completedDownloads).toHaveLength(1);
 *
 * // Cleanup
 * ctx.cleanup();
 * ```
 */
export function setupMockTauri(): MockTauriContext {
  const filesystem = createMockFilesystem();
  const downloadTracker = createDownloadTracker();
  const urlConfig = createMockUrlConfig();
  const binaryConfig = createMockBinaryConfig();
  const cookieStorage = createMockCookieStorage();
  const browserTracker = createMockBrowserTracker();

  // Create invoke handler
  const invoke = async (cmd: string, args?: InvokeArgs): Promise<unknown> => {
    const payload = args as Record<string, unknown> | undefined;

    switch (cmd) {
      // ======================================================================
      // Filesystem Operations
      // ======================================================================
      case "read_project_file": {
        const projectPath = payload?.projectPath as string;
        const relativePath = payload?.relativePath as string;
        const fullPath = `${projectPath}/${relativePath}`;
        const file = filesystem.getFile(fullPath);
        if (file) {
          return file.content;
        }
        throw new Error(`File not found: ${fullPath}`);
      }

      case "write_project_file": {
        const projectPath = payload?.projectPath as string;
        const relativePath = payload?.relativePath as string;
        const content = payload?.data as string; // Note: moss-api uses 'data' not 'content'
        const fullPath = `${projectPath}/${relativePath}`;
        filesystem.setFile(fullPath, content);
        return null;
      }

      case "list_project_files": {
        const projectPath = payload?.projectPath as string;
        // Return all file paths relative to the project path
        const allPaths = filesystem.listFiles();
        return allPaths
          .filter((p) => p.startsWith(projectPath + "/"))
          .map((p) => p.substring(projectPath.length + 1));
      }

      // ======================================================================
      // HTTP Operations
      // ======================================================================
      case "fetch_url": {
        const url = payload?.url as string;
        const response = urlConfig.getResponse(url);

        if (response.delay) {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  status: response.status,
                  ok: response.ok,
                  body_base64: response.bodyBase64 || "",
                  content_type: response.contentType || null,
                }),
              response.delay
            )
          );
        }

        return {
          status: response.status,
          ok: response.ok,
          body_base64: response.bodyBase64 || "",
          content_type: response.contentType || null,
        };
      }

      case "download_asset": {
        const url = payload?.url as string;
        const targetDir = payload?.targetDir as string;
        const response = urlConfig.getResponse(url);

        downloadTracker.startDownload(url);

        // status 0 simulates a network error/timeout - throw an error
        if (response.status === 0) {
          downloadTracker.endDownload(url, false, "Network error");
          throw new Error("Network timeout");
        }

        // Generate actual_path based on URL or use configured value
        const actualPath =
          response.actualPath || `${targetDir}/${extractFilenameFromUrl(url)}`;

        const result = {
          status: response.status,
          ok: response.ok,
          content_type: response.contentType || null,
          bytes_written: response.bytesWritten || 0,
          actual_path: actualPath,
        };

        if (response.delay) {
          return new Promise((resolve) =>
            setTimeout(() => {
              downloadTracker.endDownload(url, response.ok);
              resolve(result);
            }, response.delay)
          );
        }

        downloadTracker.endDownload(url, response.ok);
        return result;
      }

      // ======================================================================
      // Cookie Operations
      // ======================================================================
      case "get_plugin_cookie": {
        const pluginName = payload?.pluginName as string;
        const projectPath = payload?.projectPath as string;
        return cookieStorage.getCookies(pluginName, projectPath);
      }

      case "set_plugin_cookie": {
        const pluginName = payload?.pluginName as string;
        const projectPath = payload?.projectPath as string;
        const cookies = payload?.cookies as Array<{
          name: string;
          value: string;
          domain?: string;
          path?: string;
        }>;
        cookieStorage.setCookies(pluginName, projectPath, cookies);
        return null;
      }

      // ======================================================================
      // Browser Operations
      // ======================================================================
      case "open_plugin_browser": {
        const url = payload?.url as string;
        browserTracker.openedUrls.push(url);
        (browserTracker as { isOpen: boolean }).isOpen = true;
        return null;
      }

      case "close_plugin_browser": {
        (browserTracker as { closeCount: number }).closeCount++;
        (browserTracker as { isOpen: boolean }).isOpen = false;
        return null;
      }

      // ======================================================================
      // Binary Execution
      // ======================================================================
      case "execute_binary": {
        const binaryPath = payload?.binaryPath as string;
        const binaryArgs = payload?.args as string[];
        const result = binaryConfig.getResult(binaryPath, binaryArgs);

        return {
          success: result.success,
          exit_code: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
        };
      }

      // ======================================================================
      // Messaging (silent no-op)
      // ======================================================================
      case "plugin_message": {
        // Silently accept plugin messages (logs, progress, errors, etc.)
        return null;
      }

      default:
        console.warn(`Unhandled IPC command: ${cmd}`);
        return null;
    }
  };

  // Set up window.__TAURI__ directly (moss-api checks for this)
  const w = globalThis as unknown as {
    window?: {
      __TAURI__?: { core?: { invoke: typeof invoke } };
    };
  };

  // Ensure window exists (for Node.js environments like happy-dom)
  if (typeof w.window === "undefined") {
    (globalThis as unknown as { window: object }).window = {};
  }

  const win = (globalThis as unknown as { window: { __TAURI__?: { core?: { invoke: typeof invoke } } } }).window;
  win.__TAURI__ = {
    core: { invoke },
  };

  return {
    filesystem,
    downloadTracker,
    urlConfig,
    binaryConfig,
    cookieStorage,
    browserTracker,
    cleanup: () => {
      // Clear the mock Tauri interface
      delete win.__TAURI__;
      filesystem.clear();
      downloadTracker.reset();
      urlConfig.reset();
      binaryConfig.reset();
      cookieStorage.clear();
      browserTracker.reset();
    },
  };
}
