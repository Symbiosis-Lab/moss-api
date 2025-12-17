import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getPluginCookie, setPluginCookie } from "../cookies";

describe("Cookie Utilities", () => {
  const originalWindow = globalThis.window;
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockInvoke = vi.fn();
    (globalThis as unknown as { window: unknown }).window = {
      __TAURI__: {
        core: { invoke: mockInvoke },
      },
    };
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
    vi.clearAllMocks();
  });

  describe("getPluginCookie", () => {
    it("calls get_plugin_cookie with correct arguments", async () => {
      mockInvoke.mockResolvedValue([]);

      await getPluginCookie("my-plugin", "/path/to/project");

      expect(mockInvoke).toHaveBeenCalledWith("get_plugin_cookie", {
        pluginName: "my-plugin",
        projectPath: "/path/to/project",
      });
    });

    it("returns array of cookies", async () => {
      const cookies = [
        { name: "session", value: "abc123" },
        { name: "token", value: "xyz789", domain: "example.com" },
      ];
      mockInvoke.mockResolvedValue(cookies);

      const result = await getPluginCookie("matters-syndicator", "/project");

      expect(result).toEqual(cookies);
    });

    it("returns empty array when no cookies", async () => {
      mockInvoke.mockResolvedValue([]);

      const result = await getPluginCookie("new-plugin", "/project");

      expect(result).toEqual([]);
    });

    it("propagates errors from Tauri", async () => {
      mockInvoke.mockRejectedValue(new Error("Failed to read cookies"));

      await expect(
        getPluginCookie("plugin", "/project")
      ).rejects.toThrow("Failed to read cookies");
    });
  });

  describe("setPluginCookie", () => {
    it("calls set_plugin_cookie with correct arguments", async () => {
      mockInvoke.mockResolvedValue(undefined);

      const cookies = [{ name: "auth", value: "token123" }];
      await setPluginCookie("my-plugin", "/project", cookies);

      expect(mockInvoke).toHaveBeenCalledWith("set_plugin_cookie", {
        pluginName: "my-plugin",
        projectPath: "/project",
        cookies,
      });
    });

    it("handles cookies with all fields", async () => {
      mockInvoke.mockResolvedValue(undefined);

      const cookies = [
        {
          name: "session",
          value: "abc123",
          domain: "example.com",
          path: "/api",
        },
      ];
      await setPluginCookie("plugin", "/project", cookies);

      expect(mockInvoke).toHaveBeenCalledWith("set_plugin_cookie", {
        pluginName: "plugin",
        projectPath: "/project",
        cookies,
      });
    });

    it("handles multiple cookies", async () => {
      mockInvoke.mockResolvedValue(undefined);

      const cookies = [
        { name: "cookie1", value: "value1" },
        { name: "cookie2", value: "value2" },
        { name: "cookie3", value: "value3" },
      ];
      await setPluginCookie("plugin", "/project", cookies);

      expect(mockInvoke).toHaveBeenCalledWith("set_plugin_cookie", {
        pluginName: "plugin",
        projectPath: "/project",
        cookies,
      });
    });

    it("handles empty cookie array", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await setPluginCookie("plugin", "/project", []);

      expect(mockInvoke).toHaveBeenCalledWith("set_plugin_cookie", {
        pluginName: "plugin",
        projectPath: "/project",
        cookies: [],
      });
    });

    it("propagates errors from Tauri", async () => {
      mockInvoke.mockRejectedValue(new Error("Failed to save cookies"));

      await expect(
        setPluginCookie("plugin", "/project", [{ name: "a", value: "b" }])
      ).rejects.toThrow("Failed to save cookies");
    });
  });
});
