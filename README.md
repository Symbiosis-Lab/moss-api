# @symbiosis-lab/moss-api

> TypeScript API for writing moss plugins.

[![npm](https://img.shields.io/npm/v/@symbiosis-lab/moss-api)](https://www.npmjs.com/package/@symbiosis-lab/moss-api)
[![downloads](https://img.shields.io/npm/dm/@symbiosis-lab/moss-api)](https://www.npmjs.com/package/@symbiosis-lab/moss-api)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@symbiosis-lab/moss-api)](https://bundlephobia.com/package/@symbiosis-lab/moss-api)

> **Read-only mirror.** Source lives in the private moss monorepo. PRs cannot be merged here — see [CONTRIBUTING.md](CONTRIBUTING.md).

[moss](https://mosspub.com) is a desktop publishing app; this package is its plugin API surface. Use it to write plugins that publish posts, manage site assets, or extend the editor.

- [Quickstart](#quickstart)
- [Stability](#stability)
- [Discussions](https://github.com/Symbiosis-Lab/moss-api/discussions) · [Issues](https://github.com/Symbiosis-Lab/moss-api/issues) · [moss.pub](https://mosspub.com)

## Quickstart

```sh
npm install @symbiosis-lab/moss-api
```

```ts
import { getTauriCore, fetchUrl } from "@symbiosis-lab/moss-api";

const html = await fetchUrl("https://example.com");
console.log(html);
```

## Stability

This package is 0.x. The API may change between minor versions until 1.0.
Breaking changes are documented in [CHANGELOG.md](./CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).
