[@symbiosis-lab/moss-api](../../README.md) / [index](../README.md) / BinarySource

# Interface: BinarySource

Platform-specific download source for a binary.

## Properties

### archive\_format?

```ts
optional archive_format?: BinaryArchiveFormat | null;
```

Archive format of the downloaded file.

***

### direct\_url?

```ts
optional direct_url?: string | null;
```

A pinned URL to download from directly (no API call needed).

***

### github?

```ts
optional github?: GitHubSource | null;
```

Fetch a release asset via the GitHub Releases API.

***

### sha256?

```ts
optional sha256?: string | null;
```

Expected SHA-256 checksum of the downloaded file (hex string).
