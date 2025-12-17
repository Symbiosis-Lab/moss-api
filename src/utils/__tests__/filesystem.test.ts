import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFile, writeFile, listFiles, fileExists } from "../filesystem";

describe("Filesystem Utilities", () => {
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

  describe("readFile", () => {
    it("calls read_project_file with correct arguments", async () => {
      mockInvoke.mockResolvedValue("file contents");

      const result = await readFile("/path/to/project", "src/index.ts");

      expect(mockInvoke).toHaveBeenCalledWith("read_project_file", {
        projectPath: "/path/to/project",
        relativePath: "src/index.ts",
      });
      expect(result).toBe("file contents");
    });

    it("propagates errors from Tauri", async () => {
      mockInvoke.mockRejectedValue(new Error("File not found"));

      await expect(readFile("/path/to/project", "missing.txt")).rejects.toThrow(
        "File not found"
      );
    });
  });

  describe("writeFile", () => {
    it("calls write_project_file with correct arguments", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await writeFile("/path/to/project", "output/file.txt", "content");

      expect(mockInvoke).toHaveBeenCalledWith("write_project_file", {
        projectPath: "/path/to/project",
        relativePath: "output/file.txt",
        data: "content",
      });
    });

    it("propagates errors from Tauri", async () => {
      mockInvoke.mockRejectedValue(new Error("Permission denied"));

      await expect(
        writeFile("/path/to/project", "protected.txt", "data")
      ).rejects.toThrow("Permission denied");
    });
  });

  describe("listFiles", () => {
    it("calls list_project_files with correct arguments", async () => {
      const files = ["src/index.ts", "package.json", "README.md"];
      mockInvoke.mockResolvedValue(files);

      const result = await listFiles("/path/to/project");

      expect(mockInvoke).toHaveBeenCalledWith("list_project_files", {
        projectPath: "/path/to/project",
      });
      expect(result).toEqual(files);
    });

    it("returns empty array when no files", async () => {
      mockInvoke.mockResolvedValue([]);

      const result = await listFiles("/empty/project");

      expect(result).toEqual([]);
    });

    it("propagates errors from Tauri", async () => {
      mockInvoke.mockRejectedValue(new Error("Directory not found"));

      await expect(listFiles("/nonexistent")).rejects.toThrow(
        "Directory not found"
      );
    });
  });

  describe("fileExists", () => {
    it("returns true when file can be read", async () => {
      mockInvoke.mockResolvedValue("file contents");

      const result = await fileExists("/path/to/project", "existing.txt");

      expect(result).toBe(true);
    });

    it("returns false when readFile throws", async () => {
      mockInvoke.mockRejectedValue(new Error("File not found"));

      const result = await fileExists("/path/to/project", "missing.txt");

      expect(result).toBe(false);
    });

    it("calls read_project_file to check existence", async () => {
      mockInvoke.mockResolvedValue("");

      await fileExists("/path/to/project", "file.txt");

      expect(mockInvoke).toHaveBeenCalledWith("read_project_file", {
        projectPath: "/path/to/project",
        relativePath: "file.txt",
      });
    });
  });
});
