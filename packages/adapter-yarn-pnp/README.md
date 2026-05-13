# @arch-engine/adapter-yarn-pnp

Safe, deterministic workspace-topology extraction adapter for Yarn Berry / Plug'n'Play (PnP) repositories.

## Purpose

This package teaches Arch-Engine to recognise Yarn Berry workspaces that ship with `.pnp.cjs` or `.pnp.loader.mjs`. It conforms to the internal `ArchitectureAdapter` contract introduced in Pass 1 (`docs/adapters/multi-adapter-surface-spec.md` §6).

The CLI's adapter registry consumes the adapter structurally — this package has no runtime dependency on `@arch-engine/cli`.

## Installation

```bash
npm install --save-dev @arch-engine/cli @arch-engine/adapter-yarn-pnp
```

The CLI dynamically resolves this package at runtime when `.pnp.cjs` or `.pnp.loader.mjs` is present at the repository root. When it is not installed, the CLI falls back to `@arch-engine/adapter-monorepo` (which handles `package.json#workspaces` as a plain yarn-classic workspace).

## MVP scope (v0.1.0)

The v0.1.0 release is a **safe, package.json-shape extractor** — no PnP runtime parity. Specifically:

- **Detection** keys off file presence only:
  - `.pnp.cjs` — yarn-berry default
  - `.pnp.loader.mjs` — yarn-berry esm loader
  - `.yarnrc.yml` — optionally parsed for `nodeLinker: pnp`
- **Topology extraction** reads `package.json#workspaces` and the workspace package `package.json` files. Supported `workspaces` shapes:
  - Array form: `"workspaces": ["packages/*", "apps/*"]`
  - Object form: `"workspaces": { "packages": ["packages/*"] }`
- **Dependency protocols** classified into `workspace`, `portal`, `link`, or `semver`:
  - `workspace:*`, `workspace:^`, `workspace:~`, `workspace:<version>` — resolved as internal workspace edges.
  - `portal:<path>` / `link:<path>` — resolved as internal edges *only* when the target path is a known workspace package; otherwise the dependency is treated as external and `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` is surfaced.
  - Anything else (`^1.0.0`, etc.) is treated as opaque semver and does not materialise into an internal edge.
- `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` is **always** emitted (INFO severity) whenever a PnP file is present. The diagnostic explains that the v0.1.0 adapter intentionally does not execute `.pnp.cjs` for resolver parity. The diagnostic does not block extraction and does not affect exit codes.

## Determinism / safety invariants

The v0.1.0 adapter **never**:

- executes `.pnp.cjs` or `.pnp.loader.mjs` (no `require()`, no `import()`)
- invokes `yarn` or any other package-manager binary
- opens network sockets
- reads `node_modules/`, `.yarn/cache`, `.yarn/unplugged`, or `.yarn/install-state.gz`
- mutates the user's repository
- emits absolute paths or wall-clock-derived data

These properties are pinned by tests under `tests/yarn-pnp-adapter.test.ts` and in the CLI's `packages/cli/tests/adapters/` suite.

## JSON v2 metadata shape

When the CLI selects this adapter, the JSON v2 `data.adapter` block carries:

```jsonc
{
  "name": "@arch-engine/adapter-yarn-pnp",
  "version": "0.1.0",
  "packageManager": "yarn",
  "workspaceKind": "yarn-pnp",
  "confidence": "HIGH",
  "reasons": [
    ".pnp.cjs present",
    ".yarnrc.yml present",
    ".yarnrc.yml#nodeLinker is pnp",
    "package.json#packageManager identifies yarn",
    "package.json#workspaces is set"
  ],
  "warnings": [],
  "alsoDetected": [],
  "metadata": {
    "yarnPnp": {
      "packageManagerVersion": "4.0.2",
      "pnpFilePresent": true,
      "pnpLoaderPresent": false,
      "yarnrcPresent": true,
      "nodeLinker": "pnp",
      "workspacesPresent": true,
      "workspacesObjectForm": false,
      "rawGlobs": ["apps/*", "packages/*"],
      "excludedGlobs": [],
      "matchedGlobs": ["apps/api", "apps/web", "packages/shared"]
    },
    "edges": {
      "e_<hex8>": { "kind": "dependency", "protocol": "workspace" }
    }
  }
}
```

`packageManagerVersion` is always present:
- the bare version string when `package.json#packageManager` is `yarn@<x.y.z>` (Corepack `+<sha>` integrity suffix is stripped)
- `null` when the field is absent or does not identify yarn

## Known limitations

- No full PnP resolver. External `node:` requires that go through `.pnp.cjs` at runtime are not modelled.
- No `nohoist` semantics (PnP makes hoisting moot anyway).
- No brace expansion (`{a,b}`) or `**` globs.
- Catalog-style `catalog:` / `catalogs:` protocols are pnpm-specific and ignored here.

These deferrals are intentional and tested. Future minor releases may extend support without breaking the v0.1.0 metadata shape.

## Adapter precedence

| # | Adapter | Wins when |
| --- | --- | --- |
| 2 | `@arch-engine/adapter-pnpm` | `pnpm-workspace.yaml` is present |
| 3 | `@arch-engine/adapter-yarn-pnp` | `.pnp.cjs` or `.pnp.loader.mjs` is present (and no `pnpm-workspace.yaml`) |
| 4 | `@arch-engine/adapter-monorepo` | Fallback — npm/yarn-classic workspaces, single-package, or one of the above when the dedicated adapter isn't installed |

The cache-hint protocol documented in `docs/adapters/multi-adapter-surface-spec.md` §11.4 prevents conflict diagnostics when more than one adapter could plausibly claim a repository.

## License

MIT
