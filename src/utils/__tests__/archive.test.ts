import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { extractArchive, makeExecutable } from "../archive";
import { clearPlatformCache } from "../platform";

describe("Archive Extraction Utilities", () => {
  const originalWindow = globalThis.window;
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockWindow: Record<string, unknown>;

  beforeEach(() => {
    clearPlatformCache();
    mockInvoke = vi.fn();
    mockWindow = {
      __TAURI__: {
        core: { invoke: mockInvoke },
      },
      __MOSS_INTERNAL_CONTEXT__: {
        plugin_name: "test-plugin",
        project_path: "/path/to/project",
        moss_dir: "/path/to/project/.moss",
      },
    };
    (globalThis as unknown as { window: unknown }).window = mockWindow;
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
    clearPlatformCache();
    vi.clearAllMocks();
  });

  /**
   * Helper to set up platform detection mocks
   */
  function mockPlatform(os: "darwin" | "linux" | "windows") {
    if (os === "windows") {
      mockInvoke
        .mockRejectedValueOnce(new Error("command not found")) // uname -s
        .mockResolvedValueOnce({
          // cmd /c ver
          success: true,
          exit_code: 0,
          stdout: "Microsoft Windows",
          stderr: "",
        })
        .mockResolvedValueOnce({
          // PROCESSOR_ARCHITECTURE
          success: true,
          exit_code: 0,
          stdout: "AMD64",
          stderr: "",
        });
    } else {
      mockInvoke
        .mockResolvedValueOnce({
          // uname -s
          success: true,
          exit_code: 0,
          stdout: os === "darwin" ? "Darwin" : "Linux",
          stderr: "",
        })
        .mockResolvedValueOnce({
          // uname -m
          success: true,
          exit_code: 0,
          stdout: "x86_64",
          stderr: "",
        });
    }
  }

  describe("extractArchive", () => {
    describe("format detection", () => {
      it("detects .tar.gz format", async () => {
        mockPlatform("linux");
        mockInvoke.mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "",
          stderr: "",
        });

        const result = await extractArchive({
          archivePath: "/tmp/hugo.tar.gz",
          destDir: "/tmp/extract",
        });

        expect(result.success).toBe(true);
        expect(mockInvoke).toHaveBeenCalledWith(
          "execute_binary",
          expect.objectContaining({
            binaryPath: "tar",
            args: ["-xzf", "/tmp/hugo.tar.gz", "-C", "/tmp/extract"],
          })
        );
      });

      it("detects .tgz format as tar.gz", async () => {
        mockPlatform("linux");
        mockInvoke.mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "",
          stderr: "",
        });

        const result = await extractArchive({
          archivePath: "/tmp/hugo.tgz",
          destDir: "/tmp/extract",
        });

        expect(result.success).toBe(true);
        expect(mockInvoke).toHaveBeenCalledWith(
          "execute_binary",
          expect.objectContaining({
            binaryPath: "tar",
          })
        );
      });

      it("detects .zip format", async () => {
        mockPlatform("linux");
        mockInvoke.mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "",
          stderr: "",
        });

        const result = await extractArchive({
          archivePath: "/tmp/hugo.zip",
          destDir: "/tmp/extract",
        });

        expect(result.success).toBe(true);
        expect(mockInvoke).toHaveBeenCalledWith(
          "execute_binary",
          expect.objectContaining({
            binaryPath: "unzip",
            args: ["-o", "-q", "/tmp/hugo.zip", "-d", "/tmp/extract"],
          })
        );
      });

      it("returns error for unknown format", async () => {
        const result = await extractArchive({
          archivePath: "/tmp/hugo.rar",
          destDir: "/tmp/extract",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Unable to detect archive format");
      });

      it("uses explicit format when provided", async () => {
        mockPlatform("linux");
        mockInvoke.mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "",
          stderr: "",
        });

        const result = await extractArchive({
          archivePath: "/tmp/archive",
          destDir: "/tmp/extract",
          format: "tar.gz",
        });

        expect(result.success).toBe(true);
        expect(mockInvoke).toHaveBeenCalledWith(
          "execute_binary",
          expect.objectContaining({
            binaryPath: "tar",
          })
        );
      });
    });

    describe("tar.gz extraction", () => {
      it("extracts successfully on macOS", async () => {
        mockPlatform("darwin");
        mockInvoke.mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "",
          stderr: "",
        });

        const result = await extractArchive({
          archivePath: "/tmp/hugo.tar.gz",
          destDir: "/tmp/bin",
        });

        expect(result.success).toBe(true);
      });

      it("extracts successfully on Linux", async () => {
        mockPlatform("linux");
        mockInvoke.mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "",
          stderr: "",
        });

        const result = await extractArchive({
          archivePath: "/tmp/hugo.tar.gz",
          destDir: "/tmp/bin",
        });

        expect(result.success).toBe(true);
      });

      it("returns error when tar fails", async () => {
        mockPlatform("linux");
        mockInvoke.mockResolvedValueOnce({
          success: false,
          exit_code: 1,
          stdout: "",
          stderr: "tar: Error opening archive: Failed to open",
        });

        const result = await extractArchive({
          archivePath: "/tmp/corrupt.tar.gz",
          destDir: "/tmp/bin",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Failed to open");
      });
    });

    describe("zip extraction on Unix", () => {
      it("uses unzip on macOS", async () => {
        mockPlatform("darwin");
        mockInvoke.mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "",
          stderr: "",
        });

        const result = await extractArchive({
          archivePath: "/tmp/hugo.zip",
          destDir: "/tmp/bin",
        });

        expect(result.success).toBe(true);
        expect(mockInvoke).toHaveBeenCalledWith(
          "execute_binary",
          expect.objectContaining({
            binaryPath: "unzip",
            args: ["-o", "-q", "/tmp/hugo.zip", "-d", "/tmp/bin"],
          })
        );
      });

      it("uses unzip on Linux", async () => {
        mockPlatform("linux");
        mockInvoke.mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "",
          stderr: "",
        });

        await extractArchive({
          archivePath: "/tmp/hugo.zip",
          destDir: "/tmp/bin",
        });

        expect(mockInvoke).toHaveBeenCalledWith(
          "execute_binary",
          expect.objectContaining({
            binaryPath: "unzip",
          })
        );
      });
    });

    describe("zip extraction on Windows", () => {
      it("uses PowerShell Expand-Archive", async () => {
        mockPlatform("windows");
        mockInvoke.mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "",
          stderr: "",
        });

        const result = await extractArchive({
          archivePath: "C:\\temp\\hugo.zip",
          destDir: "C:\\temp\\bin",
        });

        expect(result.success).toBe(true);
        expect(mockInvoke).toHaveBeenCalledWith(
          "execute_binary",
          expect.objectContaining({
            binaryPath: "powershell",
            args: expect.arrayContaining([
              "-NoProfile",
              "-NonInteractive",
              "-Command",
              expect.stringContaining("Expand-Archive"),
            ]),
          })
        );
      });

      it("returns error when PowerShell fails", async () => {
        mockPlatform("windows");
        mockInvoke.mockResolvedValueOnce({
          success: false,
          exit_code: 1,
          stdout: "",
          stderr: "Expand-Archive : Cannot find path",
        });

        const result = await extractArchive({
          archivePath: "C:\\temp\\missing.zip",
          destDir: "C:\\temp\\bin",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Cannot find path");
      });
    });

    describe("timeout handling", () => {
      it("uses custom timeout when provided", async () => {
        mockPlatform("linux");
        mockInvoke.mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "",
          stderr: "",
        });

        await extractArchive({
          archivePath: "/tmp/large.tar.gz",
          destDir: "/tmp/bin",
          timeoutMs: 120000,
        });

        expect(mockInvoke).toHaveBeenCalledWith(
          "execute_binary",
          expect.objectContaining({
            timeoutMs: 120000,
          })
        );
      });

      it("uses default timeout of 60000ms", async () => {
        mockPlatform("linux");
        mockInvoke.mockResolvedValueOnce({
          success: true,
          exit_code: 0,
          stdout: "",
          stderr: "",
        });

        await extractArchive({
          archivePath: "/tmp/hugo.tar.gz",
          destDir: "/tmp/bin",
        });

        expect(mockInvoke).toHaveBeenCalledWith(
          "execute_binary",
          expect.objectContaining({
            timeoutMs: 60000,
          })
        );
      });
    });
  });

  describe("makeExecutable", () => {
    it("runs chmod +x on macOS", async () => {
      mockPlatform("darwin");
      mockInvoke.mockResolvedValueOnce({
        success: true,
        exit_code: 0,
        stdout: "",
        stderr: "",
      });

      const result = await makeExecutable("/tmp/bin/hugo");

      expect(result).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith(
        "execute_binary",
        expect.objectContaining({
          binaryPath: "chmod",
          args: ["+x", "/tmp/bin/hugo"],
        })
      );
    });

    it("runs chmod +x on Linux", async () => {
      mockPlatform("linux");
      mockInvoke.mockResolvedValueOnce({
        success: true,
        exit_code: 0,
        stdout: "",
        stderr: "",
      });

      const result = await makeExecutable("/tmp/bin/hugo");

      expect(result).toBe(true);
    });

    it("returns true without calling chmod on Windows", async () => {
      mockPlatform("windows");

      const result = await makeExecutable("C:\\bin\\hugo.exe");

      expect(result).toBe(true);
      // Only platform detection calls, no chmod
      expect(mockInvoke).toHaveBeenCalledTimes(3);
      expect(mockInvoke).not.toHaveBeenCalledWith(
        "execute_binary",
        expect.objectContaining({
          binaryPath: "chmod",
        })
      );
    });

    it("returns false when chmod fails", async () => {
      mockPlatform("linux");
      mockInvoke.mockResolvedValueOnce({
        success: false,
        exit_code: 1,
        stdout: "",
        stderr: "chmod: cannot access",
      });

      const result = await makeExecutable("/tmp/missing");

      expect(result).toBe(false);
    });
  });
});
