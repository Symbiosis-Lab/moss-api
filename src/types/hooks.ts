/**
 * Hook result types
 */

import type { DeploymentInfo } from "./context";

/**
 * Standard result returned from hook execution
 */
export interface HookResult {
  success: boolean;
  message?: string;
  deployment?: DeploymentInfo;
}
