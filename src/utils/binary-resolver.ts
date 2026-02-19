/**
 * Binary resolver for Moss plugins
 *
 * Thin wrapper around the Rust-side unified binary resolver exposed via Tauri command.
 * All resolution logic (PATH lookup, cache check, download, extraction) happens in Rust.
 *
 * TypeScript types here mirror the Rust serde shapes from binary_resolver.rs.
 */

// ============================================================================
// Types — must match Rust serde shapes exactly
// ============================================================================

/**
 * GitHub Releases download source.
 */
export interface GitHubSource {
  /** Repository owner (e.g., "gohugoio") */
  owner: string;
  /** Repository name (e.g., "hugo") */
  repo: string;
  /** Asset filename pattern with placeholders: {version}, {os}, {arch} */
  asset_pattern: string;
  /** Specific release tag (e.g., "v0.123.0"). If null, fetches "latest". */
  tag?: string | null;
}

/**
 * Archive format for downloaded binaries.
 */
export type ArchiveFormat = "tar_gz" | "zip" | "raw";

/**
 * Platform-specific download source for a binary.
 */
export interface BinarySource {
  /** Fetch a release asset via the GitHub Releases API. */
  github?: GitHubSource | null;
  /** A pinned URL to download from directly (no API call needed). */
  direct_url?: string | null;
  /** Expected SHA-256 checksum of the downloaded file (hex string). */
  sha256?: string | null;
  /** Archive format of the downloaded file. */
  archive_format?: ArchiveFormat | null;
}

/**
 * How to verify a binary works and extract its version.
 */
export interface VersionCheck {
  /** Arguments to pass (e.g., ["--version"]) */
  args: string[];
  /** Regex pattern with one capture group to extract the version string. */
  pattern?: string | null;
}

/**
 * Describes the internal layout of an archive for complex distributions.
 */
export interface ArchiveLayout {
  /** Path to the main binary inside the archive (e.g., "bin/git"). */
  binary_path: string;
  /** Directories where all files need chmod +x after extraction. */
  executable_dirs: string[];
}

/**
 * Configuration for a binary that can be resolved, cached, and downloaded.
 *
 * Platform-specific sources are keyed by platform string
 * (e.g., "darwin-arm64", "darwin-x64", "linux-x64", "windows-x64").
 */
export interface BinaryConfig {
  /** Human-readable name (e.g., "hugo", "ffmpeg", "git") */
  name: string;
  /** Filename of the binary if different from name. */
  binary_name?: string | null;
  /** How to verify the binary works and extract its version string. */
  version_check?: VersionCheck | null;
  /** Platform-specific download sources, keyed by platform string. */
  sources: Record<string, BinarySource>;
  /** For complex archives where the binary is nested inside the archive. */
  archive_layout?: ArchiveLayout | null;
  /** Subdirectory under ~/.moss/bin/ for caching. */
  cache_dir?: string | null;
  /** Minimum disk space required (in bytes) before attempting a download. */
  required_disk_space?: number | null;
}

/**
 * How the binary was found during resolution.
 */
export type ResolutionSource = "configured_path" | "system_path" | "cache" | "downloaded";

/**
 * The result of successfully resolving a binary.
 */
export interface BinaryResolution {
  /** Absolute path to the binary (or just the name if found in system PATH). */
  path: string;
  /** Version string extracted from the binary output, if available. */
  version?: string | null;
  /** How the binary was found. */
  source: ResolutionSource;
}

/**
 * Options for binary resolution
 */
export interface ResolveBinaryOptions {
  /** User-configured binary path to check first. */
  configuredPath?: string;
  /** Whether to auto-download if not found (default: true). */
  autoDownload?: boolean;
  /** Progress callback for download UI feedback. */
  onProgress?: (binary: string, bytesDownloaded: number, totalBytes?: number) => void;
}

// ============================================================================
// Error class
// ============================================================================

/**
 * Error thrown during binary resolution
 */
export class BinaryResolutionError extends Error {
  constructor(
    message: string,
    public readonly phase: "detection" | "download" | "extraction" | "validation",
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "BinaryResolutionError";
  }
}

// ============================================================================
// Main Resolution Function
// ============================================================================

/**
 * Resolve a binary by invoking the Rust-side unified resolver via Tauri command.
 *
 * Resolution order (handled in Rust):
 * 1. Check configured path (if provided)
 * 2. Check system PATH
 * 3. Check ~/.moss/bin/ cache
 * 4. Download from configured source (if autoDownload is true)
 *
 * @param config - Binary configuration matching the Rust BinaryConfig shape
 * @param options - Resolution options (configured path, auto-download, progress callback)
 * @returns Resolution result with path, version, and source
 * @throws BinaryResolutionError if binary cannot be resolved
 *
 * @example
 * ```typescript
 * const resolution = await resolveBinary({
 *   name: "hugo",
 *   version_check: { args: ["version"], pattern: "v(\\d+\\.\\d+\\.\\d+)" },
 *   sources: {
 *     "darwin-arm64": {
 *       github: { owner: "gohugoio", repo: "hugo", asset_pattern: "hugo_extended_{version}_darwin-arm64.tar.gz" },
 *       archive_format: "tar_gz",
 *     },
 *   },
 * }, {
 *   configuredPath: context.config.hugo_path,
 *   onProgress: (binary, bytes, total) => console.log(`${binary}: ${bytes}/${total}`),
 * });
 *
 * await executeBinary({ binaryPath: resolution.path, args: ["--version"] });
 * ```
 */
export async function resolveBinary(
  config: BinaryConfig,
  options: ResolveBinaryOptions = {}
): Promise<BinaryResolution> {
  const { configuredPath, autoDownload = true, onProgress } = options;

  // Set up progress listener if callback provided
  let unlisten: (() => void) | undefined;
  if (onProgress) {
    const { listen } = await import("@tauri-apps/api/event");
    unlisten = await listen<{
      binary: string;
      bytes_downloaded: number;
      total_bytes: number | null;
    }>("download-progress", (event) => {
      if (event.payload.binary === config.name) {
        const { bytes_downloaded, total_bytes } = event.payload;
        onProgress(config.name, bytes_downloaded, total_bytes ?? undefined);
      }
    });
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<BinaryResolution>("resolve_binary_command", {
      config,
      configuredPath: configuredPath ?? null,
      autoDownload,
    });
    return result;
  } catch (error) {
    throw new BinaryResolutionError(
      error instanceof Error ? error.message : String(error),
      "detection"
    );
  } finally {
    unlisten?.();
  }
}
