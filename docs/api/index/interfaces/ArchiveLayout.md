[@symbiosis-lab/moss-api](../../README.md) / [index](../README.md) / ArchiveLayout

# Interface: ArchiveLayout

Describes the internal layout of an archive for complex distributions.

## Properties

### binary\_path

```ts
binary_path: string;
```

Path to the main binary inside the archive (e.g., "bin/git").

***

### executable\_dirs

```ts
executable_dirs: string[];
```

Directories where all files need chmod +x after extraction.
