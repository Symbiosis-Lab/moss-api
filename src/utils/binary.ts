/**
 * Binary execution for Moss plugins
 *
 * Allows plugins to execute external binaries (git, npm, etc.)
 * in a controlled environment.
 *
 * Working directory is auto-detected from the runtime context
 * (always the project root).
 */

import { getTauriCore } from "./tauri";
import { getInternalContext } from "./context";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for executing a binary
 */
export interface ExecuteOptions {
  /** Path to the binary (can be just the name if in PATH) */
  binaryPath: string;
  /** Arguments to pass to the binary */
  args: string[];
  /** Timeout in milliseconds (default: 60000) */
  timeoutMs?: number;
  /** Additional environment variables */
  env?: Record<string, string>;
}

/**
 * Result from binary execution
 */
export interface ExecuteResult {
  /** Whether the command succeeded (exit code 0) */
  success: boolean;
  /** Exit code from the process */
  exitCode: number;
  /** Standard output from the process */
  stdout: string;
  /** Standard error output from the process */
  stderr: string;
}

// ============================================================================
// Internal Types (Tauri response shape)
// ============================================================================

interface TauriBinaryResult {
  success: boolean;
  exit_code: number;
  stdout: string;
  stderr: string;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Execute an external binary
 *
 * Working directory is auto-detected from the runtime context
 * (always the project root).
 *
 * @param options - Execution options including binary path and args
 * @returns Execution result with stdout, stderr, and exit code
 * @throws Error if binary cannot be executed or called outside a hook
 *
 * @example
 * ```typescript
 * // Run git status
 * const result = await executeBinary({
 *   binaryPath: "git",
 *   args: ["status"],
 * });
 *
 * if (result.success) {
 *   console.log(result.stdout);
 * } else {
 *   console.error(result.stderr);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Run npm install with timeout
 * const result = await executeBinary({
 *   binaryPath: "npm",
 *   args: ["install"],
 *   timeoutMs: 120000,
 *   env: { NODE_ENV: "production" },
 * });
 * ```
 */
export async function executeBinary(
  options: ExecuteOptions
): Promise<ExecuteResult> {
  const ctx = getInternalContext();
  const { binaryPath, args, timeoutMs = 60000, env } = options;

  const result = await getTauriCore().invoke<TauriBinaryResult>(
    "execute_binary",
    {
      binaryPath,
      args,
      workingDir: ctx.project_path,
      timeoutMs,
      env,
    }
  );

  return {
    success: result.success,
    exitCode: result.exit_code,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}
