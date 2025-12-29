/**
 * Archive extraction utilities for Moss plugins
 *
 * Provides functions to extract .tar.gz and .zip archives using
 * system commands (tar, unzip, PowerShell).
 */

import { executeBinary } from "./binary";
import { getPlatformInfo } from "./platform";

// ============================================================================
// Types
// ============================================================================

/**
 * Supported archive formats
 */
export type ArchiveFormat = "tar.gz" | "zip";

/**
 * Options for archive extraction
 */
export interface ExtractOptions {
  /** Path to the archive file (absolute) */
  archivePath: string;
  /** Directory to extract to (absolute) */
  destDir: string;
  /** Archive format (auto-detected from extension if not provided) */
  format?: ArchiveFormat;
  /** Timeout in milliseconds (default: 60000) */
  timeoutMs?: number;
}

/**
 * Result of archive extraction
 */
export interface ExtractResult {
  /** Whether extraction succeeded */
  success: boolean;
  /** Error message if extraction failed */
  error?: string;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Extract an archive to a destination directory
 *
 * Uses system commands for extraction:
 * - .tar.gz: `tar -xzf` (macOS/Linux)
 * - .zip: `unzip` (macOS/Linux) or PowerShell `Expand-Archive` (Windows)
 *
 * @param options - Extraction options
 * @returns Extraction result
 *
 * @example
 * ```typescript
 * const result = await extractArchive({
 *   archivePath: "/path/to/hugo.tar.gz",
 *   destDir: "/path/to/extract/",
 * });
 *
 * if (!result.success) {
 *   console.error(`Extraction failed: ${result.error}`);
 * }
 * ```
 */
export async function extractArchive(
  options: ExtractOptions
): Promise<ExtractResult> {
  const { archivePath, destDir, timeoutMs = 60000 } = options;

  // Auto-detect format from extension if not provided
  const format = options.format ?? detectFormat(archivePath);

  if (!format) {
    return {
      success: false,
      error: `Unable to detect archive format for: ${archivePath}. Supported formats: .tar.gz, .zip`,
    };
  }

  const platform = await getPlatformInfo();

  try {
    if (format === "tar.gz") {
      return await extractTarGz(archivePath, destDir, timeoutMs);
    } else {
      // zip format
      if (platform.os === "windows") {
        return await extractZipWindows(archivePath, destDir, timeoutMs);
      } else {
        return await extractZipUnix(archivePath, destDir, timeoutMs);
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Make a file executable (Unix only)
 *
 * Runs `chmod +x` on the specified file. No-op on Windows.
 *
 * @param filePath - Absolute path to the file
 * @returns Whether the operation succeeded
 *
 * @example
 * ```typescript
 * await makeExecutable("/path/to/binary");
 * ```
 */
export async function makeExecutable(filePath: string): Promise<boolean> {
  const platform = await getPlatformInfo();

  // No-op on Windows - executables don't need chmod
  if (platform.os === "windows") {
    return true;
  }

  try {
    const result = await executeBinary({
      binaryPath: "chmod",
      args: ["+x", filePath],
      timeoutMs: 5000,
    });

    return result.success;
  } catch {
    return false;
  }
}

// ============================================================================
// Internal Functions
// ============================================================================

/**
 * Detect archive format from file extension
 */
function detectFormat(archivePath: string): ArchiveFormat | null {
  const lowerPath = archivePath.toLowerCase();

  if (lowerPath.endsWith(".tar.gz") || lowerPath.endsWith(".tgz")) {
    return "tar.gz";
  }
  if (lowerPath.endsWith(".zip")) {
    return "zip";
  }

  return null;
}

/**
 * Extract .tar.gz using tar command
 */
async function extractTarGz(
  archivePath: string,
  destDir: string,
  timeoutMs: number
): Promise<ExtractResult> {
  const result = await executeBinary({
    binaryPath: "tar",
    args: ["-xzf", archivePath, "-C", destDir],
    timeoutMs,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.stderr || `tar extraction failed with exit code ${result.exitCode}`,
    };
  }

  return { success: true };
}

/**
 * Extract .zip using unzip command (macOS/Linux)
 */
async function extractZipUnix(
  archivePath: string,
  destDir: string,
  timeoutMs: number
): Promise<ExtractResult> {
  const result = await executeBinary({
    binaryPath: "unzip",
    args: ["-o", "-q", archivePath, "-d", destDir],
    timeoutMs,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.stderr || `unzip extraction failed with exit code ${result.exitCode}`,
    };
  }

  return { success: true };
}

/**
 * Extract .zip using PowerShell (Windows)
 */
async function extractZipWindows(
  archivePath: string,
  destDir: string,
  timeoutMs: number
): Promise<ExtractResult> {
  // Use PowerShell's Expand-Archive cmdlet
  const command = `Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force`;

  const result = await executeBinary({
    binaryPath: "powershell",
    args: ["-NoProfile", "-NonInteractive", "-Command", command],
    timeoutMs,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.stderr || `PowerShell extraction failed with exit code ${result.exitCode}`,
    };
  }

  return { success: true };
}
