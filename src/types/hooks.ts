/**
 * Hook result types
 *
 * ## Architecture: Single Completion Path
 *
 * Plugins complete by returning a HookResult from their hook function.
 * The runtime handles sending the completion message to Rust.
 *
 * - **Completion** = Return HookResult (flow control for moss)
 * - **Toast** = Call showToast() (UX control by plugin)
 *
 * These are decoupled: plugins decide when/what to toast independently
 * of completion signaling.
 */

import type { DeploymentInfo } from "./context";

/**
 * Standard result returned from hook execution
 *
 * ## Design Principles
 *
 * 1. **Single completion path**: Return value only, no explicit reporting
 * 2. **Flow control only**: HookResult tells moss success/failure
 * 3. **Decoupled UX**: Plugins call showToast() separately for notifications
 *
 * ## Usage Pattern
 *
 * ```typescript
 * async function deploy(context): Promise<HookResult> {
 *   // Do work...
 *
 *   // Show toast (plugin's choice of timing, message, style)
 *   await showToast({ message: "Deployed!", variant: "success" });
 *
 *   // Return result (flow control only, no UX)
 *   return { success: true, deployment: {...} };
 * }
 * ```
 */
export interface HookResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Detailed message for logs/debugging */
  message?: string;
  /** Deployment info (populated by deploy hooks) */
  deployment?: DeploymentInfo;
}
