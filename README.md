# @symbiosis-lab/moss-api

> TypeScript API for writing moss plugins.

[![npm](https://img.shields.io/npm/v/@symbiosis-lab/moss-api)](https://www.npmjs.com/package/@symbiosis-lab/moss-api)
[![downloads](https://img.shields.io/npm/dm/@symbiosis-lab/moss-api)](https://www.npmjs.com/package/@symbiosis-lab/moss-api)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@symbiosis-lab/moss-api)](https://bundlephobia.com/package/@symbiosis-lab/moss-api)

> **Read-only mirror.** Source lives in the private moss monorepo. PRs cannot be merged here — see [CONTRIBUTING.md](CONTRIBUTING.md).

[moss](https://mosspub.com) is a desktop publishing app; this package is its plugin API surface. Use it to write plugins that publish posts, manage site assets, or extend the editor.

- [Quickstart](#quickstart)
- [API reference](#api-reference)
- [Stability](#stability)
- [Discussions](https://github.com/Symbiosis-Lab/moss-api/discussions) · [Issues](https://github.com/Symbiosis-Lab/moss-api/issues) · [moss.pub](https://mosspub.com)

## Quickstart

```sh
npm install @symbiosis-lab/moss-api
```

A plugin is an object whose methods are hooks; moss calls them with a typed context:

```ts
import type { DeployContext, HookResult } from "@symbiosis-lab/moss-api";
import { reportProgress } from "@symbiosis-lab/moss-api";

export default {
  async on_deploy(context: DeployContext): Promise<HookResult> {
    await reportProgress("deploying", 0, 100, "Initializing");
    // ... deployment logic
    return { success: true, message: "Deployed successfully" };
  },
};
```

Test plugins without a running moss app via the mock layer:

```ts
import { setupMockTauri } from "@symbiosis-lab/moss-api/testing";
```

## API reference

The full reference — every hook context, utility, and testing mock, generated from the source doc comments — lives in [docs/api](docs/api/README.md).

Topic guides: [the plugin runtime environment](docs/runtime-environment.md) (what globals exist under QuickJS, fetch limits, config merge rules — read this first), [plugin authentication](docs/plugin-auth.md).

Regenerate after an API change with `pnpm run docs` (CI flags a reference that has drifted from the source).

## Stability

This package is 0.x. The API may change between minor versions until 1.0.
Breaking changes are documented in [CHANGELOG.md](./CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).
