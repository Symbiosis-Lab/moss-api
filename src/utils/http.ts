/**
 * HTTP operations for Moss plugins
 *
 * These functions provide HTTP capabilities that bypass browser CORS
 * restrictions by using Rust's HTTP client under the hood.
 *
 * Project path for downloads is auto-detected from the runtime context.
 */

import { getTauriCore } from "./tauri";
import { getInternalContext } from "./context";

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

  // Decode base64 body to Uint8Array using Uint8Array.from for better performance
  const binaryString = atob(result.body_base64);
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));

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
 * Options for HTTP POST requests
 */
export interface PostOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Additional headers */
  headers?: Record<string, string>;
}

/**
 * Perform an HTTP POST request with JSON body
 *
 * Uses Rust's HTTP client to bypass browser CORS restrictions.
 * This is useful for OAuth flows and other API interactions.
 *
 * @param url - URL to POST to
 * @param body - JSON object to send as the request body
 * @param options - Optional configuration including timeout and headers
 * @returns Fetch result with status, body, and helpers
 * @throws Error if network request fails
 *
 * @example
 * ```typescript
 * // GitHub OAuth device code request
 * const result = await httpPost(
 *   "https://github.com/login/device/code",
 *   { client_id: "xxx", scope: "repo workflow" },
 *   { headers: { Accept: "application/json" } }
 * );
 * if (result.ok) {
 *   const data = JSON.parse(result.text());
 * }
 * ```
 */
export async function httpPost(
  url: string,
  body: Record<string, unknown>,
  options: PostOptions = {}
): Promise<FetchResult> {
  const { timeoutMs = 30000, headers = {} } = options;

  const result = await getTauriCore().invoke<TauriFetchResult>("http_post", {
    url,
    body: JSON.stringify(body),
    headers,
    timeoutMs,
  });

  // Decode base64 body to Uint8Array using Uint8Array.from for better performance
  const binaryString = atob(result.body_base64);
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));

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
 * Options for HTTP GET requests
 */
export interface GetOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Additional headers */
  headers?: Record<string, string>;
}

/**
 * Perform an HTTP GET request
 *
 * Uses Rust's HTTP client to bypass browser CORS restrictions.
 * This is useful for API interactions that require custom headers.
 *
 * @param url - URL to GET
 * @param options - Optional configuration including timeout and headers
 * @returns Fetch result with status, body, and helpers
 * @throws Error if network request fails
 *
 * @example
 * ```typescript
 * // Buttondown API newsletter info request
 * const result = await httpGet(
 *   "https://api.buttondown.com/v1/newsletters",
 *   { headers: { Authorization: "Token xxx" } }
 * );
 * if (result.ok) {
 *   const data = JSON.parse(result.text());
 * }
 * ```
 */
export async function httpGet(
  url: string,
  options: GetOptions = {}
): Promise<FetchResult> {
  const { timeoutMs = 30000, headers = {} } = options;

  const result = await getTauriCore().invoke<TauriFetchResult>("http_get", {
    url,
    headers,
    timeoutMs,
  });

  // Decode base64 body to Uint8Array using Uint8Array.from for better performance
  const binaryString = atob(result.body_base64);
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));

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
 * Project path is auto-detected from the runtime context.
 *
 * @param url - URL to download
 * @param targetDir - Target directory within project (e.g., "assets")
 * @param options - Optional download configuration
 * @returns Download result with actual path where file was saved
 * @throws Error if download or write fails, or called outside a hook
 *
 * @example
 * ```typescript
 * const result = await downloadAsset(
 *   "https://example.com/image",
 *   "assets"
 * );
 * if (result.ok) {
 *   console.log(`Saved to ${result.actualPath}`); // e.g., "assets/image.png"
 * }
 * ```
 */
export async function downloadAsset(
  url: string,
  targetDir: string,
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const ctx = getInternalContext();
  const { timeoutMs = 30000 } = options;

  const result = await getTauriCore().invoke<TauriDownloadResult>(
    "download_asset",
    {
      url,
      projectPath: ctx.project_path,
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
