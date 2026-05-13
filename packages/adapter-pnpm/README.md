# @arch-engine/adapter-pnpm

Deterministic workspace-topology extraction adapter for pnpm-managed monorepos.

## Purpose

This package teaches Arch-Engine to read `pnpm-workspace.yaml` workspaces with full glob expansion, exclusion-glob support, and the `workspace:*` / `workspace:^` / `workspace:~` / `workspace:<version>` protocols on `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies`.

It conforms to the internal `ArchitectureAdapter` contract introduced in Pass 1 (`docs/adapters/multi-adapter-surface-spec.md` §6). The CLI's adapter registry consumes it structurally — this package has no runtime dependency on `@arch-engine/cli`.

## Installation

```bash
npm install --save-dev @arch-engine/adapter-pnpm
```

The CLI dynamically resolves this package at runtime when `pnpm-workspace.yaml` is present at the repository root. When it is not installed, the CLI falls back to `@arch-engine/adapter-monorepo`'s line-based pnpm parser (degraded mode).

## Determinism Invariants

The adapter is pure-fs read:

- Never executes `pnpm` or any other package-manager binary.
- Never reads `node_modules/` or `.pnpm-store/`.
- Never opens network sockets.
- Never mutates the user's repository.
- Re-running on the same source produces byte-identical output.

## MVP Scope

| Feature | v0.1.0 |
| --- | --- |
| `packages: [...]` array form in `pnpm-workspace.yaml` | ✅ |
| `apps/*`, `packages/*`, `services/*` glob patterns | ✅ |
| Nested patterns (`packages/*/*`) | ✅ |
| Exclusion globs (`!packages/private-*`) | ✅ |
| `workspace:*`, `workspace:^`, `workspace:~`, `workspace:<version>` | ✅ |
| `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies` edges | ✅ |
| Catalog protocol (`catalog:*`) | ⚠ Detected, surfaced as `ARCH_ENGINE_LOCKFILE_UNSUPPORTED` warning |
| Deep `pnpm-lock.yaml` parsing | Deferred to v1.4+ |
| Hoisting / `node-linker` interpretation | Out of scope |

## License

[MIT](./LICENSE)
