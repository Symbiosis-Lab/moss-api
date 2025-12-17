/**
 * HTTP operations for Moss plugins
 *
 * These functions provide HTTP capabilities that bypass browser CORS
 * restrictions by using Rust's HTTP client under the hood.
 */

import { getTauriCore } from "./tauri";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for HTTP fetch requests
 */
export interface FetchOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * Result from an HTTP fetch operation
 */
export interface FetchResult {
  /** HTTP status code */
  status: number;
  /** Whether the request was successful (2xx status) */
  ok: boolean;
  /** Content-Type header from response */
  contentType: string | null;
  /** Response body as Uint8Array */
  body: Uint8Array;
  /** Get response body as text */
  text(): string;
}

/**
 * Options for asset download
 */
export interface DownloadOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * Result from an asset download operation
 */
export interface DownloadResult {
  /** HTTP status code */
  status: number;
  /** Whether the request was successful (2xx status) */
  ok: boolean;
  /** Content-Type header from response */
  contentType: string | null;
  /** Number of bytes written to disk */
  bytesWritten: number;
  /** Actual path where file was saved (relative to project) */
  actualPath: string;
}

// ============================================================================
// Internal Types (Tauri response shapes)
// ============================================================================

interface TauriFetchResult {
  status: number;
  ok: boolean;
  body_base64: string;
  content_type: string | null;
}

interface TauriDownloadResult {
  status: number;
  ok: boolean;
  content_type: string | null;
  bytes_written: number;
  actual_path: string;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Fetch a URL using Rust's HTTP client (bypasses CORS)
 *
 * @param url - URL to fetch
 * @param options - Optional fetch configuration
 * @returns Fetch result with status, body, and helpers
 * @throws Error if network request fails
 *
 * @example
 * ```typescript
 * const result = await fetchUrl("https://api.example.com/data");
 * if (result.ok) {
 *   const data = JSON.parse(result.text());
 * }
 * ```
 */
export async function fetchUrl(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const { timeoutMs = 30000 } = options;

  const result = await getTauriCore().invoke<TauriFetchResult>("fetch_url", {
    url,
    timeoutMs,
  });

  // Decode base64 body to Uint8Array
  const binaryString = atob(result.body_base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return {
    status: result.status,
    ok: result.ok,
    contentType: result.content_type,
    body: bytes,
    text(): string {
      return new TextDecoder().decode(bytes);
    },
  };
}

/**
 * Download a URL and save directly to disk
 *
 * Downloads the file and writes it directly to disk without passing
 * the binary data through JavaScript. The filename is derived from
 * the URL, and file extension is inferred from Content-Type if needed.
 *
 * @param url - URL to download
 * @param projectPath - Absolute path to the project directory
 * @param targetDir - Target directory within project (e.g., "assets")
 * @param options - Optional download configuration
 * @returns Download result with actual path where file was saved
 * @throws Error if download or write fails
 *
 * @example
 * ```typescript
 * const result = await downloadAsset(
 *   "https://example.com/image",
 *   "/path/to/project",
 *   "assets"
 * );
 * if (result.ok) {
 *   console.log(`Saved to ${result.actualPath}`); // e.g., "assets/image.png"
 * }
 * ```
 */
export async function downloadAsset(
  url: string,
  projectPath: string,
  targetDir: string,
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const { timeoutMs = 30000 } = options;

  const result = await getTauriCore().invoke<TauriDownloadResult>(
    "download_asset",
    {
      url,
      projectPath,
      targetDir,
      timeoutMs,
    }
  );

  return {
    status: result.status,
    ok: result.ok,
    contentType: result.content_type,
    bytesWritten: result.bytes_written,
    actualPath: result.actual_path,
  };
}
