[@symbiosis-lab/moss-api](../../README.md) / [index](../README.md) / VersionCheck

# Interface: VersionCheck

How to verify a binary works and extract its version.

## Properties

### args

```ts
args: string[];
```

Arguments to pass (e.g., ["--version"])

***

### pattern?

```ts
optional pattern?: string | null;
```

Regex pattern with one capture group to extract the version string.
