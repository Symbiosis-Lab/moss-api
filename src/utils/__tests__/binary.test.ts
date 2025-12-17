import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { executeBinary } from "../binary";

describe("Binary Execution Utilities", () => {
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

  describe("executeBinary", () => {
    it("calls execute_binary with correct arguments", async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        exit_code: 0,
        stdout: "output",
        stderr: "",
      });

      await executeBinary({
        binaryPath: "git",
        args: ["status"],
        workingDir: "/path/to/repo",
      });

      expect(mockInvoke).toHaveBeenCalledWith("execute_binary", {
        binaryPath: "git",
        args: ["status"],
        workingDir: "/path/to/repo",
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
        workingDir: "/project",
        timeoutMs: 120000,
      });

      expect(mockInvoke).toHaveBeenCalledWith("execute_binary", {
        binaryPath: "npm",
        args: ["install"],
        workingDir: "/project",
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
        workingDir: "/project",
        env: { NODE_ENV: "production", DEBUG: "true" },
      });

      expect(mockInvoke).toHaveBeenCalledWith("execute_binary", {
        binaryPath: "node",
        args: ["script.js"],
        workingDir: "/project",
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
        workingDir: "/",
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
        workingDir: "/",
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
        workingDir: "/",
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(127);
    });

    it("propagates errors from Tauri", async () => {
      mockInvoke.mockRejectedValue(new Error("Binary not found"));

      await expect(
        executeBinary({
          binaryPath: "missing",
          args: [],
          workingDir: "/",
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
        workingDir: "/repo",
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toBe("main");
    });
  });
});
