[@symbiosis-lab/moss-api](../../README.md) / [index](../README.md) / ResolveBinaryOptions

# Interface: ResolveBinaryOptions

Options for binary resolution

## Properties

### autoDownload?

```ts
optional autoDownload?: boolean;
```

Whether to auto-download if not found (default: true).

***

### configuredPath?

```ts
optional configuredPath?: string;
```

User-configured binary path to check first.

***

### onProgress?

```ts
optional onProgress?: (binary, bytesDownloaded, totalBytes?) => void;
```

Progress callback for download UI feedback.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `binary` | `string` |
| `bytesDownloaded` | `number` |
| `totalBytes?` | `number` |

#### Returns

`void`
