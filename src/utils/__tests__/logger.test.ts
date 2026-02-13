import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { log, warn, error } from "../logger";
import { setMessageContext } from "../messaging";

describe("Logger Utilities", () => {
  const originalWindow = globalThis.window;
  let mockEmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Log messages now use events (fire-and-forget) instead of commands
    mockEmit = vi.fn().mockResolvedValue(undefined);
    (globalThis as unknown as { window: unknown }).window = {
      __TAURI__: {
        event: { emit: mockEmit, listen: vi.fn() },
        core: { invoke: vi.fn() }, // Still need this for other SDK functions
      },
    };
    setMessageContext("test-plugin", "test-hook");
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });

  describe("log", () => {
    it("sends log message via event (not command)", async () => {
      await log("Info message");
      expect(mockEmit).toHaveBeenCalledWith("plugin-message", {
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
      expect(mockEmit).toHaveBeenCalledWith("plugin-message", {
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
    it("sends log message with level 'warn' via event", async () => {
      await warn("Warning message");
      expect(mockEmit).toHaveBeenCalledWith("plugin-message", {
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
    it("sends log message with level 'error' via event", async () => {
      await error("Error message");
      expect(mockEmit).toHaveBeenCalledWith("plugin-message", {
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

    it("logger functions work when Tauri event API is unavailable", async () => {
      (globalThis as unknown as { window: unknown }).window = {};
      // Should not throw
      await expect(log("test")).resolves.toBeUndefined();
      await expect(warn("test")).resolves.toBeUndefined();
      await expect(error("test")).resolves.toBeUndefined();
    });
  });
});
