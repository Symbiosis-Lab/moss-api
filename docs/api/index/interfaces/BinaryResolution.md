[@symbiosis-lab/moss-api](../../README.md) / [index](../README.md) / BinaryResolution

# Interface: BinaryResolution

The result of successfully resolving a binary.

## Properties

### path

```ts
path: string;
```

Absolute path to the binary (or just the name if found in system PATH).

***

### source

```ts
source: ResolutionSource;
```

How the binary was found.

***

### version?

```ts
optional version?: string | null;
```

Version string extracted from the binary output, if available.
