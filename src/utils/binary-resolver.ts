/**
 * Binary resolver for Moss plugins
 *
 * Provides auto-detection and download of external CLI tools like Hugo.
 * Implements a 4-step resolution flow:
 *   1. Check configured path (from plugin config)
 *   2. Check system PATH
 *   3. Check plugin bin directory
 *   4. Download from GitHub releases (if enabled)
 */

import { executeBinary } from "./binary";
import { fetchUrl } from "./http";
import { pluginFileExists, writePluginFile, readPluginFile } from "./plugin-storage";
import { getInternalContext } from "./context";
import { getPlatformInfo, type PlatformKey } from "./platform";
import { extractArchive, makeExecutable } from "./archive";

// ============================================================================
// Types
// ============================================================================

/**
 * GitHub source configuration for binary downloads
 */
export interface GitHubSource {
  /** Repository owner (e.g., "gohugoio") */
  owner: string;
  /** Repository name (e.g., "hugo") */
  repo: string;
  /**
   * Asset filename pattern with placeholders:
   * - {version}: Version number (e.g., "0.139.0")
   * - {os}: Operating system (darwin, linux, windows)
   * - {arch}: Architecture (arm64, amd64, x64)
   *
   * Example: "hugo_extended_{version}_{os}-{arch}.tar.gz"
   */
  assetPattern: string;
}

/**
 * Binary source configuration per platform
 */
export interface BinarySource {
  /** GitHub release source */
  github?: GitHubSource;
  /** Direct download URL (with same placeholders as assetPattern) */
  directUrl?: string;
}

/**
 * Configuration for a binary to resolve
 */
export interface BinaryConfig {
  /** Binary name (e.g., "hugo") */
  name: string;
  /** Minimum version required (semver, optional) */
  minVersion?: string;
  /** Command to check version (default: "{name} version") */
  versionCommand?: string;
  /** Regex to extract version from command output */
  versionPattern?: RegExp;
  /** Download sources per platform */
  sources: Partial<Record<PlatformKey, BinarySource>>;
  /** Binary filename inside archive (default: same as name, or name.exe on Windows) */
  binaryName?: string;
}

/**
 * Result of binary resolution
 */
export interface BinaryResolution {
  /** Absolute path to the binary */
  path: string;
  /** Detected version (if available) */
  version?: string;
  /** How the binary was found */
  source: "config" | "path" | "plugin-storage" | "downloaded";
}

/**
 * Options for binary resolution
 */
export interface ResolveBinaryOptions {
  /** Plugin's configured binary path (from context.config) */
  configuredPath?: string;
  /** Whether to auto-download if not found (default: true) */
  autoDownload?: boolean;
  /** Progress callback for UI feedback */
  onProgress?: (phase: string, message: string) => void;
}

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
 * Resolve a binary, downloading if necessary
 *
 * Resolution order:
 * 1. Configured path (from plugin config, e.g., hugo_path)
 * 2. System PATH (just the binary name)
 * 3. Plugin bin directory (.moss/plugins/{plugin}/bin/{name})
 * 4. Download from GitHub releases (if autoDownload is true)
 *
 * @param config - Binary configuration
 * @param options - Resolution options
 * @returns Resolution result with path and source
 * @throws BinaryResolutionError if binary cannot be resolved
 *
 * @example
 * ```typescript
 * const hugo = await resolveBinary(HUGO_CONFIG, {
 *   configuredPath: context.config.hugo_path,
 *   onProgress: (phase, msg) => reportProgress(phase, 0, 1, msg),
 * });
 *
 * await executeBinary({
 *   binaryPath: hugo.path,
 *   args: ["--version"],
 * });
 * ```
 */
export async function resolveBinary(
  config: BinaryConfig,
  options: ResolveBinaryOptions = {}
): Promise<BinaryResolution> {
  const { configuredPath, autoDownload = true, onProgress } = options;

  const progress = (phase: string, message: string) => {
    onProgress?.(phase, message);
  };

  // Step 1: Check configured path
  if (configuredPath) {
    progress("detection", `Checking configured path: ${configuredPath}`);
    const result = await checkBinary(configuredPath, config);
    if (result) {
      return { path: configuredPath, version: result.version, source: "config" };
    }
  }

  // Step 2: Check system PATH
  progress("detection", `Checking system PATH for ${config.name}`);
  const pathResult = await checkBinary(config.name, config);
  if (pathResult) {
    return { path: config.name, version: pathResult.version, source: "path" };
  }

  // Step 3: Check plugin bin directory
  const pluginBinPath = await getPluginBinPath(config);
  progress("detection", `Checking plugin storage: ${pluginBinPath}`);

  if (await binaryExistsInPluginStorage(config)) {
    const storedResult = await checkBinary(pluginBinPath, config);
    if (storedResult) {
      return { path: pluginBinPath, version: storedResult.version, source: "plugin-storage" };
    }
  }

  // Step 4: Download if enabled
  if (!autoDownload) {
    throw new BinaryResolutionError(
      `${config.name} not found. ` +
        `Please install it manually or set the path in plugin configuration.\n\n` +
        `Installation options:\n` +
        `- Install via package manager (brew, apt, etc.)\n` +
        `- Download from the official website\n` +
        `- Set ${config.name}_path in .moss/config.toml`,
      "detection"
    );
  }

  progress("download", `Downloading ${config.name}...`);
  const downloadedPath = await downloadBinary(config, progress);

  // Verify the downloaded binary works
  const downloadedResult = await checkBinary(downloadedPath, config);
  if (!downloadedResult) {
    throw new BinaryResolutionError(
      `Downloaded ${config.name} binary failed verification. ` +
        `The binary may be corrupted or incompatible with your system.`,
      "validation"
    );
  }

  return {
    path: downloadedPath,
    version: downloadedResult.version,
    source: "downloaded",
  };
}

// ============================================================================
// Binary Checking
// ============================================================================

interface CheckResult {
  version?: string;
}

/**
 * Check if a binary exists and optionally extract its version
 */
async function checkBinary(
  binaryPath: string,
  config: BinaryConfig
): Promise<CheckResult | null> {
  try {
    // Build version command
    const versionCmd = config.versionCommand ?? `${config.name} version`;
    const [cmd, ...args] = parseCommand(versionCmd, binaryPath, config.name);

    const result = await executeBinary({
      binaryPath: cmd,
      args,
      timeoutMs: 10000,
    });

    if (!result.success) {
      return null;
    }

    // Extract version if pattern provided
    let version: string | undefined;
    if (config.versionPattern) {
      const output = result.stdout + result.stderr;
      const match = output.match(config.versionPattern);
      if (match && match[1]) {
        version = match[1];
      }
    }

    return { version };
  } catch {
    return null;
  }
}

/**
 * Parse a version command, replacing {name} with the binary path
 */
function parseCommand(
  template: string,
  binaryPath: string,
  name: string
): string[] {
  // Replace {name} with actual binary path
  const resolved = template.replace(/{name}/g, binaryPath);

  // If the template is just "{name} version", use the binaryPath directly
  if (resolved.startsWith(binaryPath)) {
    const rest = resolved.slice(binaryPath.length).trim();
    return [binaryPath, ...rest.split(/\s+/).filter(Boolean)];
  }

  // Otherwise split normally
  return resolved.split(/\s+/).filter(Boolean);
}

// ============================================================================
// Plugin Storage Helpers
// ============================================================================

/**
 * Get the full path to the binary in plugin storage
 */
async function getPluginBinPath(config: BinaryConfig): Promise<string> {
  const ctx = getInternalContext();
  const platform = await getPlatformInfo();

  const binaryName = getBinaryFilename(config, platform.os === "windows");
  return `${ctx.moss_dir}/plugins/${ctx.plugin_name}/bin/${binaryName}`;
}

/**
 * Get the binary filename (with .exe on Windows)
 */
function getBinaryFilename(config: BinaryConfig, isWindows: boolean): string {
  const baseName = config.binaryName ?? config.name;
  return isWindows ? `${baseName}.exe` : baseName;
}

/**
 * Check if binary exists in plugin storage
 */
async function binaryExistsInPluginStorage(config: BinaryConfig): Promise<boolean> {
  const platform = await getPlatformInfo();
  const binaryName = getBinaryFilename(config, platform.os === "windows");
  return pluginFileExists(`bin/${binaryName}`);
}

// ============================================================================
// Download Logic
// ============================================================================

/**
 * Download and extract binary from GitHub releases
 */
async function downloadBinary(
  config: BinaryConfig,
  progress: (phase: string, message: string) => void
): Promise<string> {
  const platform = await getPlatformInfo();
  const source = config.sources[platform.platformKey];

  if (!source) {
    throw new BinaryResolutionError(
      `No download source configured for platform: ${platform.platformKey}`,
      "download"
    );
  }

  // Get latest version from GitHub
  let version: string;
  let downloadUrl: string;

  if (source.github) {
    progress("download", "Fetching latest release info from GitHub...");
    const releaseInfo = await getLatestRelease(source.github.owner, source.github.repo);
    version = releaseInfo.version;

    // Construct download URL
    const assetName = resolveAssetPattern(source.github.assetPattern, version, platform);
    downloadUrl = `https://github.com/${source.github.owner}/${source.github.repo}/releases/download/v${version}/${assetName}`;
  } else if (source.directUrl) {
    // Use direct URL - version is extracted from URL if possible
    downloadUrl = source.directUrl;

    // Try to extract version from URL (e.g., "/v0.152.2/" or "_0.152.2_")
    const versionMatch = downloadUrl.match(/[/v_](\d+\.\d+\.\d+)[/_]/);
    version = versionMatch ? versionMatch[1] : "unknown";

    progress("download", `Using direct download URL (v${version})...`);
  } else {
    throw new BinaryResolutionError(
      `No download source configured for ${config.name}`,
      "download"
    );
  }

  progress("download", `Downloading ${config.name} v${version}...`);

  // Download to temp location
  const ctx = getInternalContext();
  const archiveFilename = downloadUrl.split("/").pop() ?? "archive";
  const archivePath = `${ctx.moss_dir}/plugins/${ctx.plugin_name}/.tmp/${archiveFilename}`;

  await downloadToPluginStorage(downloadUrl, `.tmp/${archiveFilename}`);

  // Extract archive
  progress("extraction", "Extracting archive...");
  const binDir = `${ctx.moss_dir}/plugins/${ctx.plugin_name}/bin`;

  // Ensure bin directory exists by writing a marker file
  await writePluginFile("bin/.gitkeep", "");

  const extractResult = await extractArchive({
    archivePath,
    destDir: binDir,
  });

  if (!extractResult.success) {
    throw new BinaryResolutionError(
      `Failed to extract archive: ${extractResult.error}`,
      "extraction"
    );
  }

  // Make binary executable (Unix only)
  const binaryPath = await getPluginBinPath(config);
  await makeExecutable(binaryPath);

  // Clean up temp archive
  // Note: We don't have a delete API, so we just leave it for now
  // The temp file will be overwritten on next download

  progress("complete", `${config.name} v${version} installed successfully`);

  // Cache the version info
  await cacheReleaseInfo(config.name, version);

  return binaryPath;
}

/**
 * Fetch latest release info from GitHub API
 */
async function getLatestRelease(
  owner: string,
  repo: string
): Promise<{ version: string; tag: string }> {
  // Try to use cached info if GitHub API fails
  const cacheKey = `${owner}/${repo}`;

  try {
    const response = await fetchUrl(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
      { timeoutMs: 10000 }
    );

    if (!response.ok) {
      // Check for rate limiting
      if (response.status === 403 || response.status === 429) {
        const cached = await getCachedRelease(cacheKey);
        if (cached) {
          return cached;
        }
        throw new BinaryResolutionError(
          "GitHub API rate limit exceeded. Please try again later or install the binary manually.",
          "download"
        );
      }
      throw new BinaryResolutionError(
        `Failed to fetch release info: HTTP ${response.status}`,
        "download"
      );
    }

    const data = JSON.parse(response.text());
    const tag = data.tag_name as string;
    const version = tag.replace(/^v/, ""); // "v0.139.0" -> "0.139.0"

    return { version, tag };
  } catch (error) {
    if (error instanceof BinaryResolutionError) {
      throw error;
    }

    // Try cache on any error
    const cached = await getCachedRelease(cacheKey);
    if (cached) {
      return cached;
    }

    throw new BinaryResolutionError(
      `Failed to fetch release info: ${error instanceof Error ? error.message : String(error)}`,
      "download",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Resolve asset pattern with actual values
 */
function resolveAssetPattern(
  pattern: string,
  version: string,
  platform: { os: string; arch: string }
): string {
  // Map our arch names to common GitHub naming conventions
  const archMap: Record<string, string> = {
    x64: "amd64",
    arm64: "arm64",
  };

  return pattern
    .replace(/{version}/g, version)
    .replace(/{os}/g, platform.os)
    .replace(/{arch}/g, archMap[platform.arch] ?? platform.arch);
}

/**
 * Download a file to plugin storage
 *
 * Uses curl (macOS/Linux) or PowerShell (Windows) to download the file
 * directly to the target path, avoiding memory limitations of base64 encoding.
 */
async function downloadToPluginStorage(
  url: string,
  relativePath: string
): Promise<void> {
  const ctx = getInternalContext();
  const platform = await getPlatformInfo();

  const targetPath = `${ctx.moss_dir}/plugins/${ctx.plugin_name}/${relativePath}`;

  // Ensure parent directory exists
  const parentDir = targetPath.substring(0, targetPath.lastIndexOf("/"));

  if (platform.os === "windows") {
    // Use PowerShell for Windows
    const mkdirCmd = `New-Item -ItemType Directory -Force -Path '${parentDir}'`;
    await executeBinary({
      binaryPath: "powershell",
      args: ["-NoProfile", "-NonInteractive", "-Command", mkdirCmd],
      timeoutMs: 5000,
    });

    const downloadCmd = `Invoke-WebRequest -Uri '${url}' -OutFile '${targetPath}'`;
    const result = await executeBinary({
      binaryPath: "powershell",
      args: ["-NoProfile", "-NonInteractive", "-Command", downloadCmd],
      timeoutMs: 300000, // 5 minutes
    });

    if (!result.success) {
      throw new BinaryResolutionError(
        `Download failed: ${result.stderr || result.stdout}`,
        "download"
      );
    }
  } else {
    // Use curl for macOS/Linux (pre-installed on both)
    await executeBinary({
      binaryPath: "mkdir",
      args: ["-p", parentDir],
      timeoutMs: 5000,
    });

    const result = await executeBinary({
      binaryPath: "curl",
      args: [
        "-fsSL", // fail silently, follow redirects, show errors
        "--create-dirs",
        "-o", targetPath,
        url,
      ],
      timeoutMs: 300000, // 5 minutes
    });

    if (!result.success) {
      throw new BinaryResolutionError(
        `Download failed: ${result.stderr || `curl exited with code ${result.exitCode}`}`,
        "download"
      );
    }
  }
}

// ============================================================================
// Caching
// ============================================================================

interface CachedRelease {
  version: string;
  tag: string;
  cachedAt: string;
}

/**
 * Cache release info for fallback
 */
async function cacheReleaseInfo(name: string, version: string): Promise<void> {
  try {
    const cached: CachedRelease = {
      version,
      tag: `v${version}`,
      cachedAt: new Date().toISOString(),
    };
    await writePluginFile(
      `cache/${name}-release.json`,
      JSON.stringify(cached, null, 2)
    );
  } catch {
    // Ignore cache write failures
  }
}

/**
 * Get cached release info
 */
async function getCachedRelease(
  cacheKey: string
): Promise<{ version: string; tag: string } | null> {
  try {
    // Extract name from cache key (owner/repo -> repo)
    const name = cacheKey.split("/")[1];
    if (!name) return null;

    if (!(await pluginFileExists(`cache/${name}-release.json`))) {
      return null;
    }

    const content = await readPluginFile(`cache/${name}-release.json`);
    const cached = JSON.parse(content) as CachedRelease;

    return { version: cached.version, tag: cached.tag };
  } catch {
    return null;
  }
}
