/**
 * Plugin message types for communication with Moss
 */

/**
 * Messages that plugins can send to Moss
 */
export type PluginMessage =
  | LogMessage
  | ProgressMessage
  | ErrorMessage
  | CompleteMessage;

export interface LogMessage {
  type: "log";
  level: "log" | "warn" | "error";
  message: string;
}

export interface ProgressMessage {
  type: "progress";
  phase: string;
  current: number;
  total: number;
  message?: string;
}

export interface ErrorMessage {
  type: "error";
  error: string;
  context?: string;
  fatal: boolean;
}

export interface CompleteMessage {
  type: "complete";
  result: unknown;
}
