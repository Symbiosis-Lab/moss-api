import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { log, warn, error } from "../logger";
import { setMessageContext } from "../messaging";

describe("Logger Utilities", () => {
  const originalWindow = globalThis.window;
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockInvoke = vi.fn().mockResolvedValue(undefined);
    (globalThis as unknown as { window: unknown }).window = {
      __TAURI__: {
        core: { invoke: mockInvoke },
      },
    };
    setMessageContext("test-plugin", "test-hook");
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });

  describe("log", () => {
    it("sends log message with level 'log'", async () => {
      await log("Info message");
      expect(mockInvoke).toHaveBeenCalledWith("plugin_message", {
        pluginName: "test-plugin",
        hookName: "test-hook",
        message: {
          type: "log",
          level: "log",
          message: "Info message",
        },
      });
    });

    it("handles empty string message", async () => {
      await log("");
      expect(mockInvoke).toHaveBeenCalledWith("plugin_message", {
        pluginName: "test-plugin",
        hookName: "test-hook",
        message: {
          type: "log",
          level: "log",
          message: "",
        },
      });
    });
  });

  describe("warn", () => {
    it("sends log message with level 'warn'", async () => {
      await warn("Warning message");
      expect(mockInvoke).toHaveBeenCalledWith("plugin_message", {
        pluginName: "test-plugin",
        hookName: "test-hook",
        message: {
          type: "log",
          level: "warn",
          message: "Warning message",
        },
      });
    });
  });

  describe("error", () => {
    it("sends log message with level 'error'", async () => {
      await error("Error message");
      expect(mockInvoke).toHaveBeenCalledWith("plugin_message", {
        pluginName: "test-plugin",
        hookName: "test-hook",
        message: {
          type: "log",
          level: "error",
          message: "Error message",
        },
      });
    });
  });

  describe("integration", () => {
    it("all logger functions return promises that resolve", async () => {
      await expect(log("test")).resolves.toBeUndefined();
      await expect(warn("test")).resolves.toBeUndefined();
      await expect(error("test")).resolves.toBeUndefined();
    });

    it("logger functions work when Tauri is unavailable", async () => {
      (globalThis as unknown as { window: unknown }).window = {};
      // Should not throw
      await expect(log("test")).resolves.toBeUndefined();
      await expect(warn("test")).resolves.toBeUndefined();
      await expect(error("test")).resolves.toBeUndefined();
    });
  });
});
