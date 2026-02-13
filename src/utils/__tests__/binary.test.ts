import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { executeBinary } from "../binary";

describe("Binary Execution Utilities", () => {
  const originalWindow = globalThis.window;
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockWindow: Record<string, unknown>;

  beforeEach(() => {
    mockInvoke = vi.fn();
    mockWindow = {
      __TAURI__: {
        core: { invoke: mockInvoke },
      },
      __MOSS_INTERNAL_CONTEXT__: {
        plugin_name: "github",
        project_path: "/path/to/project",
        moss_dir: "/path/to/project/.moss",
      },
    };
    (globalThis as unknown as { window: unknown }).window = mockWindow;
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
    vi.clearAllMocks();
  });

  describe("executeBinary", () => {
    it("uses project root as working directory from context", async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        exit_code: 0,
        stdout: "output",
        stderr: "",
      });

      await executeBinary({
        binaryPath: "git",
        args: ["status"],
      });

      expect(mockInvoke).toHaveBeenCalledWith("execute_binary", {
        binaryPath: "git",
        args: ["status"],
        workingDir: "/path/to/project",
        timeoutMs: 60000,
        env: undefined,
      });
    });

    it("uses custom timeout when provided", async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        exit_code: 0,
        stdout: "",
        stderr: "",
      });

      await executeBinary({
        binaryPath: "npm",
        args: ["install"],
        timeoutMs: 120000,
      });

      expect(mockInvoke).toHaveBeenCalledWith("execute_binary", {
        binaryPath: "npm",
        args: ["install"],
        workingDir: "/path/to/project",
        timeoutMs: 120000,
        env: undefined,
      });
    });

    it("passes environment variables when provided", async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        exit_code: 0,
        stdout: "",
        stderr: "",
      });

      await executeBinary({
        binaryPath: "node",
        args: ["script.js"],
        env: { NODE_ENV: "production", DEBUG: "true" },
      });

      expect(mockInvoke).toHaveBeenCalledWith("execute_binary", {
        binaryPath: "node",
        args: ["script.js"],
        workingDir: "/path/to/project",
        timeoutMs: 60000,
        env: { NODE_ENV: "production", DEBUG: "true" },
      });
    });

    it("returns ExecuteResult with mapped field names", async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        exit_code: 0,
        stdout: "Hello from stdout",
        stderr: "Warning from stderr",
      });

      const result = await executeBinary({
        binaryPath: "echo",
        args: ["Hello"],
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("Hello from stdout");
      expect(result.stderr).toBe("Warning from stderr");
    });

    it("handles failed command execution", async () => {
      mockInvoke.mockResolvedValue({
        success: false,
        exit_code: 1,
        stdout: "",
        stderr: "Command failed",
      });

      const result = await executeBinary({
        binaryPath: "false",
        args: [],
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe("Command failed");
    });

    it("handles non-zero exit codes", async () => {
      mockInvoke.mockResolvedValue({
        success: false,
        exit_code: 127,
        stdout: "",
        stderr: "command not found",
      });

      const result = await executeBinary({
        binaryPath: "nonexistent",
        args: [],
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(127);
    });

    it("throws when called outside hook context", async () => {
      delete mockWindow.__MOSS_INTERNAL_CONTEXT__;

      await expect(
        executeBinary({
          binaryPath: "git",
          args: ["status"],
        })
      ).rejects.toThrow(/must be called from within a plugin hook/);
    });

    it("propagates errors from Tauri", async () => {
      mockInvoke.mockRejectedValue(new Error("Binary not found"));

      await expect(
        executeBinary({
          binaryPath: "missing",
          args: [],
        })
      ).rejects.toThrow("Binary not found");
    });

    it("handles git commands correctly", async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        exit_code: 0,
        stdout: "main",
        stderr: "",
      });

      const result = await executeBinary({
        binaryPath: "git",
        args: ["branch", "--show-current"],
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toBe("main");
    });
  });

  describe("context isolation", () => {
    it("uses project path from context for different projects", async () => {
      mockWindow.__MOSS_INTERNAL_CONTEXT__ = {
        plugin_name: "other-plugin",
        project_path: "/different/project",
        moss_dir: "/different/project/.moss",
      };
      mockInvoke.mockResolvedValue({
        success: true,
        exit_code: 0,
        stdout: "",
        stderr: "",
      });

      await executeBinary({
        binaryPath: "ls",
        args: ["-la"],
      });

      expect(mockInvoke).toHaveBeenCalledWith("execute_binary", {
        binaryPath: "ls",
        args: ["-la"],
        workingDir: "/different/project",
        timeoutMs: 60000,
        env: undefined,
      });
    });
  });
});
