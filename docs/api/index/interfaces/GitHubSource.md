[@symbiosis-lab/moss-api](../../README.md) / [index](../README.md) / GitHubSource

# Interface: GitHubSource

GitHub Releases download source.

## Properties

### asset\_pattern

```ts
asset_pattern: string;
```

Asset filename pattern with placeholders: {version}, {os}, {arch}

***

### owner

```ts
owner: string;
```

Repository owner (e.g., "gohugoio")

***

### repo

```ts
repo: string;
```

Repository name (e.g., "hugo")

***

### tag?

```ts
optional tag?: string | null;
```

Specific release tag (e.g., "v0.123.0"). If null, fetches "latest".
