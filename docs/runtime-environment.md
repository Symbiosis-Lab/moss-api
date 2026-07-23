# The plugin runtime environment

moss plugins do **not** run in a browser. Since moss 0.7.21 the default plugin
engine is QuickJS (quickjs-ng, embedded in the moss binary) — a pure ECMAScript
engine with no DOM and no web platform APIs beyond the small set moss installs.
Code that works in your bundler's dev server, in vitest, or in a webview can
still fail at runtime in moss. This page is the contract: what globals exist,
what they do, and what to reach for instead of the missing ones.

## What's global, what's not

Available:

| Global | Notes |
|---|---|
| `console.log/info/warn/debug/error` | Routed to moss's log file — see [log levels](#console-and-log-levels) below |
| `atob` / `btoa` | Standard base64 ↔ binary-string |
| `TextEncoder` / `TextDecoder` | `encode()` / `decode()` only — no streaming variants |
| `crypto.randomUUID()` | The **only** member of `crypto` |
| `setTimeout` / `setInterval` (+ clears) | Backed by host timers |
| `URL` | Constructable, standard behavior |
| `fetch` | Buffered, minimal — see [fetch limitations](#fetch-limitations) below |
| `globalThis` / `window` | Aliased to each other |

Not available — and no polyfill is planned:

- **Web Streams**: `ReadableStream`, `WritableStream`, `TransformStream`
- **WebCrypto**: `crypto.subtle`, `crypto.getRandomValues`
- `Blob`, `File`, `FormData`, `XMLHttpRequest`, `WebSocket`, `EventSource`
- `DOMParser`, `document`, any DOM API
- `localStorage` / `sessionStorage` / `indexedDB` (use [plugin storage](api/README.md))
- `process`, `process.env`, Node built-ins (see [environment variables](#environment-variables))

Practical consequence: many npm packages assume at least one of these.
Libraries built for browsers or Node (streaming parsers, WebCrypto-based
hashing, multipart builders on `FormData`) will load-fail or throw at runtime.
Before adding a dependency, search its code for the globals above; prefer
pure-computation libraries, or do the work through an SDK function where moss's
Rust side already provides it.

## fetch limitations

The built-in `fetch(url, init?)` is a minimal shim over moss's Rust HTTP
client, not a spec-complete implementation:

- **Response surface**: `ok`, `status`, `headers.get(name)`
  (case-insensitive), `text()`, `json()`. There is **no** `arrayBuffer()`, no
  `response.body` stream, no `clone()`.
- **Request body**: strings only. Binary bodies are not expressible.
- **Methods**: `GET`, `HEAD`, `POST`, `PUT`.
- The body is fully buffered before the promise resolves; default timeout is
  30 s.

For binary transfers use the SDK instead:

- **Binary download** → `fetchUrl()` — returns the body as `Uint8Array`.
- **Binary upload** → `httpPostMultipart()` — file parts passed base64-encoded;
  moss assembles the `multipart/form-data` body on the Rust side.

There is currently no way to send a raw binary (non-multipart) request body.
If your integration needs one (e.g. an API that takes bytes via `PUT`), open
an issue — that's a host-side addition.

## Multipart uploads preserve paths

`httpPostMultipart()` passes each file part's `filename` through verbatim,
including `/` separators (only `"`, CR, and LF are stripped). This is a
supported contract: you can upload a whole directory tree in one request by
setting each part's `filename` to its relative path (e.g. `posts/hello.html`),
which is what directory-aware endpoints such as IPFS node APIs and pinning
services expect.

Two caveats:

- The entire request body is assembled **in memory** (and file parts transit
  the JS boundary base64-encoded). For large sites — especially media-heavy
  ones — budget for this: batch uploads, or check sizes first with
  `listSiteFilesWithSizes()`.
- Field/part **order is preserved**, which GraphQL-multipart-style endpoints
  require.

## console and log levels

Plugin `console` calls route into moss's log file (`moss.log`) at these levels:

| Call | Level | Visible |
|---|---|---|
| `console.error` | error | always |
| `console.warn` | warn | always |
| `console.info` | info | default production log level — use for milestones that should appear in support logs |
| `console.log` / `console.debug` | debug | only under `MOSS_LOG_LEVEL=debug` |

Pick the tier deliberately: `info` for the few events a support log should
show, `log`/`debug` for verbose detail.

## Environment variables

`getPluginEnvVar(name)` is **allowlisted on the moss side** — it is not a
general `process.env` bridge, so arbitrary variables return `undefined` even
when set in the host process. The allowlist exists so the command can't leak
host environment state; entries are added case by case via moss PR, and are
intended for test-harness wiring only (the current entries configure the
Matters e2e harness).

If your plugin needs a user-provided value — an API token, an endpoint URL —
the channel is **plugin config**, not environment variables: declare fields in
your manifest's `config_schema` (moss auto-renders them in Settings) and read
them from `context.config` in your hooks, or persist runtime state to
`config.json` with `writePluginFile()`.

## Config: two files, one merge

`context.config` in hook contexts is the merge of two files in your plugin's
folder (`.moss/plugins/<name>/`), written by different actors:

- `config.toml` — the settings-UI fields declared in your manifest's
  `config_schema`, written when the user saves Settings.
- `config.json` — whatever your plugin writes itself via
  `writePluginFile("config.json", …)` (login binding, sync bookkeeping, …),
  written at any time.

Both are merged into `context.config`; on a key conflict **`config.json`
wins** (it is the more specific, more recently written source).

**Current caveat:** default values declared in your manifest's `config` field
are *not* merged into `context.config` — a field the user never touched in
Settings is simply absent. Until that changes, apply your own defaults in
code:

```ts
const DEFAULTS = { gateway: "https://example.com", retries: 3 };
const config = { ...DEFAULTS, ...context.config };
```

This is good practice regardless: it keeps your plugin correct on older moss
versions.

## Testing caveat: mocks run in Node

The `@symbiosis-lab/moss-api/testing` mocks run your plugin under Node (e.g.
vitest), where Web Streams, `crypto.subtle`, spec-complete `fetch`, and every
Node built-in exist. **A green test suite does not prove QuickJS
compatibility.** Before shipping, check your built bundle for references to
the missing globals listed above — a plain grep for `ReadableStream`,
`crypto.subtle`, `getRandomValues`, `FormData`, and `process.env` catches most
incompatibilities — and exercise the plugin once in a real moss.

## Escape hatch

`MOSS_PLUGIN_ENGINE=webview` forces the previous webview-based engine
(plugins whose manifest declares the `enhance` capability still route through
it automatically). This is a debugging aid, not a target: the webview engine
is on its way out, and new plugins should be written against the QuickJS
environment described here.
