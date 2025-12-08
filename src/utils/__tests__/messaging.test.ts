import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  setMessageContext,
  getMessageContext,
  sendMessage,
  reportProgress,
  reportError,
  reportComplete,
} from "../messaging";

describe("Messaging Utilities", () => {
  const originalWindow = globalThis.window;
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockInvoke = vi.fn().mockResolvedValue(undefined);
    (globalThis as unknown as { window: unknown }).window = {
      __TAURI__: {
        core: { invoke: mockInvoke },
      },
    };
    // Reset context
    setMessageContext("", "");
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });

  describe("setMessageContext / getMessageContext", () => {
    it("stores and retrieves plugin context", () => {
      setMessageContext("my-plugin", "on_deploy");
      const ctx = getMessageContext();
      expect(ctx.pluginName).toBe("my-plugin");
      expect(ctx.hookName).toBe("on_deploy");
    });

    it("overwrites previous context", () => {
      setMessageContext("first-plugin", "hook1");
      setMessageContext("second-plugin", "hook2");
      const ctx = getMessageContext();
      expect(ctx.pluginName).toBe("second-plugin");
      expect(ctx.hookName).toBe("hook2");
    });

    it("returns empty strings for unset context", () => {
      const ctx = getMessageContext();
      expect(ctx.pluginName).toBe("");
      expect(ctx.hookName).toBe("");
    });
  });

  describe("sendMessage", () => {
    it("invokes plugin_message command with correct args", async () => {
      setMessageContext("test-plugin", "test-hook");
      await sendMessage({ type: "log", level: "log", message: "Hello" });

      expect(mockInvoke).toHaveBeenCalledWith("plugin_message", {
        pluginName: "test-plugin",
        hookName: "test-hook",
        message: { type: "log", level: "log", message: "Hello" },
      });
    });

    it("silently fails when Tauri is unavailable", async () => {
      (globalThis as unknown as { window: unknown }).window = {};
      await expect(
        sendMessage({ type: "log", level: "log", message: "Hello" })
      ).resolves.toBeUndefined();
    });

    it("silently catches invoke errors", async () => {
      mockInvoke.mockRejectedValue(new Error("Invoke failed"));
      setMessageContext("plugin", "hook");
      // Should not throw
      await expect(
        sendMessage({ type: "log", level: "log", message: "test" })
      ).resolves.toBeUndefined();
    });
  });

  describe("reportProgress", () => {
    it("sends progress message with correct structure", async () => {
      setMessageContext("plugin", "hook");
      await reportProgress("building", 50, 100, "Half done");

      expect(mockInvoke).toHaveBeenCalledWith("plugin_message", {
        pluginName: "plugin",
        hookName: "hook",
        message: {
          type: "progress",
          phase: "building",
          current: 50,
          total: 100,
          message: "Half done",
        },
      });
    });

    it("sends progress message without optional message", async () => {
      setMessageContext("plugin", "hook");
      await reportProgress("scanning", 1, 10);

      expect(mockInvoke).toHaveBeenCalledWith("plugin_message", {
        pluginName: "plugin",
        hookName: "hook",
        message: {
          type: "progress",
          phase: "scanning",
          current: 1,
          total: 10,
          message: undefined,
        },
      });
    });
  });

  describe("reportError", () => {
    it("sends error message with fatal=false by default", async () => {
      setMessageContext("plugin", "hook");
      await reportError("Something failed", "deployment");

      expect(mockInvoke).toHaveBeenCalledWith("plugin_message", {
        pluginName: "plugin",
        hookName: "hook",
        message: {
          type: "error",
          error: "Something failed",
          context: "deployment",
          fatal: false,
        },
      });
    });

    it("sends error message with fatal=true when specified", async () => {
      setMessageContext("plugin", "hook");
      await reportError("Fatal error", "critical", true);

      expect(mockInvoke).toHaveBeenCalledWith("plugin_message", {
        pluginName: "plugin",
        hookName: "hook",
        message: {
          type: "error",
          error: "Fatal error",
          context: "critical",
          fatal: true,
        },
      });
    });

    it("sends error message without context", async () => {
      setMessageContext("plugin", "hook");
      await reportError("Error without context");

      expect(mockInvoke).toHaveBeenCalledWith("plugin_message", {
        pluginName: "plugin",
        hookName: "hook",
        message: {
          type: "error",
          error: "Error without context",
          context: undefined,
          fatal: false,
        },
      });
    });
  });

  describe("reportComplete", () => {
    it("sends complete message with result payload", async () => {
      setMessageContext("plugin", "hook");
      await reportComplete({ success: true, data: "result" });

      expect(mockInvoke).toHaveBeenCalledWith("plugin_message", {
        pluginName: "plugin",
        hookName: "hook",
        message: {
          type: "complete",
          result: { success: true, data: "result" },
        },
      });
    });

    it("sends complete message with null result", async () => {
      setMessageContext("plugin", "hook");
      await reportComplete(null);

      expect(mockInvoke).toHaveBeenCalledWith("plugin_message", {
        pluginName: "plugin",
        hookName: "hook",
        message: {
          type: "complete",
          result: null,
        },
      });
    });
  });
});
