/**
 * Moss Plugin SDK
 *
 * Shared types and utilities for Moss plugins.
 *
 * @example
 * ```typescript
 * import type { OnDeployContext, HookResult } from "moss-plugin-sdk";
 * import { log, reportProgress, openBrowser } from "moss-plugin-sdk";
 *
 * const MyPlugin = {
 *   async on_deploy(context: OnDeployContext): Promise<HookResult> {
 *     await log("Starting deployment...");
 *     await reportProgress("deploying", 0, 100, "Initializing");
 *     // ... deployment logic
 *     return { success: true, message: "Deployed successfully" };
 *   }
 * };
 * ```
 */

// Types
export * from "./types";

// Utilities
export * from "./utils";
