[@symbiosis-lab/moss-api](../../README.md) / [index](../README.md) / BinaryConfig

# Interface: BinaryConfig

Configuration for a binary that can be resolved, cached, and downloaded.

Platform-specific sources are keyed by platform string
(e.g., "darwin-arm64", "darwin-x64", "linux-x64", "windows-x64").

## Properties

### archive\_layout?

```ts
optional archive_layout?: ArchiveLayout | null;
```

For complex archives where the binary is nested inside the archive.

***

### binary\_name?

```ts
optional binary_name?: string | null;
```

Filename of the binary if different from name.

***

### cache\_dir?

```ts
optional cache_dir?: string | null;
```

Subdirectory under ~/.moss/bin/ for caching.

***

### name

```ts
name: string;
```

Human-readable name (e.g., "hugo", "ffmpeg", "git")

***

### required\_disk\_space?

```ts
optional required_disk_space?: number | null;
```

Minimum disk space required (in bytes) before attempting a download.

***

### sources

```ts
sources: Record<string, BinarySource>;
```

Platform-specific download sources, keyed by platform string.

***

### version\_check?

```ts
optional version_check?: VersionCheck | null;
```

How to verify the binary works and extract its version string.
