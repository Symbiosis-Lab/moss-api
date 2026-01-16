/**
 * Logging utilities for plugins
 *
 * @deprecated All functions in this module are deprecated.
 * Use console.log/warn/error directly instead.
 *
 * The plugin runtime now auto-forwards all console.* calls to Rust,
 * eliminating the need for these async wrappers. Using console.* directly
 * is simpler and has no async overhead.
 *
 * Example migration:
 *   // Before
 *   await log("Starting deployment...");
 *
 *   // After
 *   console.log("Starting deployment...");
 */

import { sendMessage } from "./messaging";

/**
 * Log an informational message
 *
 * @deprecated Use console.log() directly instead.
 * Plugin runtime auto-forwards all console.* calls to Rust.
 */
export async function log(message: string): Promise<void> {
  await sendMessage({ type: "log", level: "log", message });
}

/**
 * Log a warning message
 *
 * @deprecated Use console.warn() directly instead.
 * Plugin runtime auto-forwards all console.* calls to Rust.
 */
export async function warn(message: string): Promise<void> {
  await sendMessage({ type: "log", level: "warn", message });
}

/**
 * Log an error message
 *
 * @deprecated Use console.error() directly instead.
 * Plugin runtime auto-forwards all console.* calls to Rust.
 */
export async function error(message: string): Promise<void> {
  await sendMessage({ type: "log", level: "error", message });
}
