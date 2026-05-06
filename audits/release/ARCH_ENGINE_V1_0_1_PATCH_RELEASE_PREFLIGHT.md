# Arch-Engine v1.0.1 Patch Release Preflight

**Audit date:** 2026-05-06
**Auditor:** Claude Opus 4.7 (1M context), release-prep pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main` (HEAD prior to release-prep commit: `6c74491`)
**Predecessor audits:**
- [audits/ARCH_ENGINE_V1_REPO_AND_AGP_EMITTER_READINESS_AUDIT.md](../ARCH_ENGINE_V1_REPO_AND_AGP_EMITTER_READINESS_AUDIT.md)
- [audits/ARCH_ENGINE_V1_0_1_PUBLIC_CONTRACT_STABILIZATION_AUDIT.md](../ARCH_ENGINE_V1_0_1_PUBLIC_CONTRACT_STABILIZATION_AUDIT.md)
- [audits/ARCH_ENGINE_V1_0_1_EXPORT_FREEZE_REPAIR_AUDIT.md](../ARCH_ENGINE_V1_0_1_EXPORT_FREEZE_REPAIR_AUDIT.md)

---

## 1. Executive Verdict

**`V1_0_1_RELEASE_READY_WITH_HUMAN_NPM_PREFLIGHT`**

All seven public packages are bumped to `1.0.1`. Internal cross-dependencies are consistently aligned to `^1.0.1`. The full validation matrix is green: `npm run build`, `npm run typecheck`, `npm test` (1890/1890), `npm run vitest run packages/core/tests/freeze` (357/357), `npm pack --dry-run` (root + each of the seven public packages). A local public-style install smoke — pack tarballs into a tempdir, install into a fresh consumer project, run all five v1.0.0 CLI verbs — completes cleanly: `--version` reports `arch-engine/1.0.1`, `doctor` / `inspect` / `analyze` / `check` / `explain regression` all exit 0, and the `Fatal: edges is not iterable` regression confirmed gone. No public API was widened. No `@arch-governance/*` dependency was added. No npm publish was performed. The remaining preflight step is human-side: `npm login` and the seven `npm publish --access public` invocations in dependency order documented in §11.

---

## 2. Scope

Strict patch release. **No AGP emitter.**

- No new public exports.
- No widened types.
- No new packages.
- No `@arch-governance/runtime` dependency.
- No `@arch-governance/architecture-profile` dependency.
- No npm publish.
- No git tags.
- No version higher than 1.0.1.
- No experimental package promotion.
- No tests loosened.
- No freeze snapshots updated.

The pass touches only `package.json` files, `package-lock.json`, `CHANGELOG.md`, and this preflight document.

---

## 3. Packages Included

| Package | Old version | New version | Publish status | Internal deps (after bump) |
| --- | --- | --- | --- | --- |
| `@arch-engine/schema` | 1.0.0 | **1.0.1** | published 1.0.0; 1.0.1 not yet | (none) |
| `@arch-engine/core` | 1.0.0 | **1.0.1** | published 1.0.0; 1.0.1 not yet | `@arch-engine/schema: ^1.0.1`, `yaml: ^2.8.3` |
| `@arch-engine/adapter-monorepo` | 1.0.0 | **1.0.1** | published 1.0.0; 1.0.1 not yet | `@arch-engine/core: ^1.0.1` |
| `@arch-engine/governance-pack-authority` | 1.0.0 | **1.0.1** | published 1.0.0; 1.0.1 not yet | `@arch-engine/core: ^1.0.1` |
| `@arch-engine/governance-pack-rest-contract` | 1.0.0 | **1.0.1** | published 1.0.0; 1.0.1 not yet | `@arch-engine/core: ^1.0.1` |
| `@arch-engine/governance-pack-journey` | 1.0.0 | **1.0.1** | published 1.0.0; 1.0.1 not yet | `@arch-engine/core: ^1.0.1` |
| `@arch-engine/cli` | 1.0.0 | **1.0.1** | published 1.0.0; 1.0.1 not yet | `@arch-engine/core: ^1.0.1`, `@arch-engine/schema: ^1.0.1`, `cac`, `cli-table3`, `picocolors`, `yaml`; peer-optional `@arch-engine/adapter-monorepo: ^1.0.1` |

Root `arch-engine` package stays at 1.0.0 (`private: true`, never published).

The four private adapter workspaces (`@arch-engine/adapter-shared`, `@arch-engine/adapter-conformance`, `@arch-engine/adapter-github`, `@arch-engine/adapter-gitlab`) are **not** in the v1.0.1 release scope and have not been bumped.

---

## 4. Fixes Included

Sourced from the prior stabilization and freeze-repair audits. Repair-only:

- **CLI version reporting** — `arch-engine --version` now reports the package's actual version from `package.json` instead of the published v1.0.0 tarball's frozen `1.0.0-rc.3` build artifact.
- **`Fatal: edges is not iterable`** — `arch-engine analyze`, `check`, and `explain` no longer crash on real fixtures. Root cause was in `@arch-engine/adapter-monorepo`, which emitted `edgesByAdapter` as a count where the runner contract requires a `ReconcilableEdge[]`. The adapter now projects the workspace adjacency map into a deterministically-ordered edge array. Defensive `Array.isArray` guard added to `@arch-engine/core`'s `reconcileEdges` so a future malformed adapter produces a structured error.
- **Public CLI build graph** — `@arch-engine/cli` builds end-to-end again. The 324 unreached experimental command registrations in `cli.ts` (post-v1.0.0 expansion that introduced unresolved imports) were trimmed back to the 5 v1.0.0 commands. Implementation files for the experimental commands remain on disk.
- **v1.0.0 public core export freeze restored** — 26 unexpected runtime exports and 2 type-shape additions on `PolicyPackFinding` were removed from `@arch-engine/core`'s public root barrel. `dist/index.d.ts` shrank from 147 KB → 127 KB. Implementation files in `packages/core/src/{federation,policy-registry,policy-bundles}/` are kept for future minor-release promotion.
- **Misleading typecheck script** — root `npm run typecheck` now invokes `tsc --noEmit -p <tsconfig>` against each of the seven public-contract packages individually instead of vacuously checking an empty file list.
- **Unpublished adapter dependencies** — `@arch-engine/cli`'s manifest no longer lists `@arch-engine/adapter-github` and `@arch-engine/adapter-gitlab` as `dependencies`; both packages are not on npm and would have failed a fresh install.
- **README factual repairs** — quickstart now installs `@arch-engine/cli` together with `@arch-engine/adapter-monorepo`; provider adapter section reframed as preview/not-yet-released; non-existent CLI pipe example removed; stale coverage badge removed; AGP-status note added stating v1.0.x does not depend on `@arch-governance/*`.

The five v1.0.0 public CLI commands are preserved unchanged: `doctor`, `inspect`, `analyze`, `check`, `explain <target>`. Global options unchanged: `--json`, `--no-color`, `-h/--help`, `-v/--version`. `check` still has `--min-coverage <pct>` and `--sync`. The `cli-output-contract.json` JSON schema is unchanged.

---

## 5. Public API Freeze Verification

All five public-surface freeze tests pass against the v1.0.0 approved 110-symbol set with **no snapshot updates**:

```
$ npx vitest run \
    packages/core/tests/freeze/distribution_exports_surface.test.ts \
    packages/core/tests/freeze/distribution_declaration_surface.test.ts \
    packages/core/tests/publicSurface.snapshot.test.ts \
    packages/core/tests/public-types-surface.test.ts \
    packages/core/tests/sdk/core_public_surface_snapshot.test.ts
→  Test Files  5 passed (5)
→       Tests  16 passed (16)
```

Full freeze sub-suite:

```
$ npx vitest run packages/core/tests/freeze
→  Test Files  162 passed (162)
→       Tests  357 passed (357)
```

No test was loosened, skipped, excluded, or had its assertion weakened during the version bump. The frozen export surface is byte-identical to what the v1.0.0 freeze tests anchor.

---

## 6. Build / Typecheck / Test Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm install --no-audit --no-fund` | ok | `up to date in ~450ms` (lockfile already reconciled) |
| `npm run build` | **pass** | All workspaces + `arch-engine-action` build; CLI bin is 2.34 KB; core `dist/index.d.ts` is 127 KB |
| `npm run typecheck` | **pass** | `tsc --noEmit -p` chain against all 7 public-contract tsconfigs |
| `npm test` | **1890 / 1890 pass** | 648 / 648 test files pass |
| `npx vitest run packages/core/tests/freeze` | **357 / 357 pass** | 162 / 162 freeze test files pass |
| `npm pack --dry-run` (root) | **pass** | 76 files, 687.6 kB |

---

## 7. Pack Dry-Run Results (per public package)

All seven public packages produce 1.0.1 tarballs cleanly:

| Package | Filename | Files | Packed | Unpacked |
| --- | --- | --- | --- | --- |
| `@arch-engine/schema` | `arch-engine-schema-1.0.1.tgz` | 15 | 8.8 kB | 47.1 kB |
| `@arch-engine/core` | `arch-engine-core-1.0.1.tgz` | 23 | 515.7 kB | 2.6 MB |
| `@arch-engine/adapter-monorepo` | `arch-engine-adapter-monorepo-1.0.1.tgz` | 5 | 3.4 kB | 8.7 kB |
| `@arch-engine/governance-pack-authority` | `arch-engine-governance-pack-authority-1.0.1.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/governance-pack-rest-contract` | `arch-engine-governance-pack-rest-contract-1.0.1.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/governance-pack-journey` | `arch-engine-governance-pack-journey-1.0.1.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/cli` | `arch-engine-cli-1.0.1.tgz` | 14 | 11.8 kB | 46.7 kB |

CLI tarball contains `dist/bin.js` (2.4 kB), the five command chunks (`doctor`, `inspect`, `analyze`, `check`, `explain`), shared chunks, `package.json`, `README.md`, `LICENSE`. No experimental command files leak into the tarball.

---

## 8. Local Public-Style Install Smoke

Procedure:

1. `npm pack --workspace=<each>` for all seven public packages into a `mktemp` tarball directory.
2. `mktemp` consumer project, seeded with `examples/sample-monorepo`.
3. `npm install` all seven 1.0.1 tarballs (file-path style, not the registry).
4. Run all five v1.0.0 commands.
5. Cleanup.

Results:

```
$ npm install \
    $TARBALL_DIR/arch-engine-schema-1.0.1.tgz \
    $TARBALL_DIR/arch-engine-core-1.0.1.tgz \
    $TARBALL_DIR/arch-engine-adapter-monorepo-1.0.1.tgz \
    $TARBALL_DIR/arch-engine-governance-pack-authority-1.0.1.tgz \
    $TARBALL_DIR/arch-engine-governance-pack-rest-contract-1.0.1.tgz \
    $TARBALL_DIR/arch-engine-governance-pack-journey-1.0.1.tgz \
    $TARBALL_DIR/arch-engine-cli-1.0.1.tgz
→ added 20 packages in 4s

$ npx arch-engine --version
arch-engine/1.0.1 darwin-arm64 node-v25.2.1

$ npx arch-engine --help
arch-engine/1.0.1
Commands: doctor, inspect, analyze, check, explain <target>

doctor             → exit 0  (workspace yarn-npm, coverage 100%, confidence HIGH, 0 authority crossings)
inspect            → exit 0  (nodes 4, edges 2, "Adapters active: adapter-monorepo")
analyze            → exit 0  (stability score CRITICAL (0.47); JSON artifact written)
check              → exit 0  ("Verification complete. No blocking violations.")
explain regression → exit 0  ("✔ No regression detected")
```

`grep "edges is not iterable" output → no matches.`

All tempdirs cleaned up after the smoke.

---

## 9. npm Registry Preflight

```
$ npm whoami
→ E401 Unauthorized
```

The local `npm` is **not currently logged in**. This is expected for prep work. The human will need to run `npm login` (or `npm adduser`) before the publish commands in §11.

Currently published versions (snapshot at the time of this preflight):

```
@arch-engine/schema                          1.0.0-rc.1, 1.0.0-rc.2, 1.0.0-rc.3, 1.0.0
@arch-engine/core                            1.0.0-rc.1, 1.0.0-rc.2, 1.0.0-rc.3, 1.0.0
@arch-engine/adapter-monorepo                                          1.0.0-rc.4, 1.0.0
@arch-engine/governance-pack-authority       1.0.0-rc.1,             1.0.0-rc.4, 1.0.0
@arch-engine/governance-pack-rest-contract   1.0.0-rc.1,             1.0.0-rc.3, 1.0.0-rc.4, 1.0.0
@arch-engine/governance-pack-journey         1.0.0-rc.1,             1.0.0-rc.4, 1.0.0
@arch-engine/cli                             1.0.0-rc.1, 1.0.0-rc.2, 1.0.0-rc.3, 1.0.0
```

`1.0.1` is **not yet present** for any of the seven packages. No risk of overwriting an existing publish.

Registry: `https://registry.npmjs.org/`. License header: `MIT`. Maintainer (per existing 1.0.0 metadata): `tharcyn <thaasyn@gmail.com>`.

---

## 10. Publish Order

Recommended order (respects the internal dependency graph: `schema → core → {adapter-monorepo, governance-pack-*} → cli`):

1. `@arch-engine/schema`
2. `@arch-engine/core`
3. `@arch-engine/adapter-monorepo`
4. `@arch-engine/governance-pack-authority`
5. `@arch-engine/governance-pack-rest-contract`
6. `@arch-engine/governance-pack-journey`
7. `@arch-engine/cli`

`schema` has no internal deps. `core` depends on `schema`. `adapter-monorepo` and the three governance packs each depend on `core`. `cli` depends on `core`, `schema`, and peer-optionally on `adapter-monorepo`. Publishing in this order means each consumer, at install time, can resolve its dependency on the just-published `1.0.1` without falling back to `1.0.0`.

---

## 11. Exact Manual Publish Commands

Run from the repo root, on `main`, **after** `npm login`:

```bash
npm publish --workspace @arch-engine/schema --access public
npm publish --workspace @arch-engine/core --access public
npm publish --workspace @arch-engine/adapter-monorepo --access public
npm publish --workspace @arch-engine/governance-pack-authority --access public
npm publish --workspace @arch-engine/governance-pack-rest-contract --access public
npm publish --workspace @arch-engine/governance-pack-journey --access public
npm publish --workspace @arch-engine/cli --access public
```

Notes:

- All seven packages are scoped (`@arch-engine/*`) and currently public on npm. `--access public` is required on first publish of a scoped package and is harmless on subsequent ones.
- The `prepack` script (`npm run build`) will run automatically per workspace and produces a deterministic tarball.
- Recommended to run the seven commands sequentially, **not** in parallel, so a downstream package's install-time dependency resolution can pick up the just-published upstream.
- If a publish fails midway, do **not** retry with `--force` — diagnose the failure (auth, lockfile, network, registry rate-limits) and re-run the failed package's command only.
- Do **not** `npm publish` from within a workspace package directory while leaving the root in a different state; always invoke from the repo root with `--workspace`.

---

## 12. Post-Publish Verification

After all seven publishes complete:

```bash
npm view @arch-engine/schema@1.0.1
npm view @arch-engine/core@1.0.1
npm view @arch-engine/adapter-monorepo@1.0.1
npm view @arch-engine/governance-pack-authority@1.0.1
npm view @arch-engine/governance-pack-rest-contract@1.0.1
npm view @arch-engine/governance-pack-journey@1.0.1
npm view @arch-engine/cli@1.0.1
```

Each `npm view` should report `version: 1.0.1`, the correct `dist-tags.latest`, and the expected dependency lines.

Then a fresh tempdir public install smoke (uses the now-published 1.0.1 from the registry, not local tarballs):

```bash
TMPDIR=$(mktemp -d -t arch-engine-v101-public-smoke.XXXXXX)
cd "$TMPDIR"
npm init -y >/dev/null
npm install --no-audit --no-fund \
  @arch-engine/cli@1.0.1 \
  @arch-engine/adapter-monorepo@1.0.1
npx arch-engine --version    # expect: arch-engine/1.0.1 ...
npx arch-engine --help       # expect: 5 commands listed
npx arch-engine doctor       # expect: exit 0
cd / && rm -rf "$TMPDIR"
```

If `--version` does not report `1.0.1`, **stop** — the published binary's `cli.version(pkg.version)` did not pick up the new package version. (No precedent from this prep, but worth checking; the v1.0.0 tarball had this exact bug and the v1.0.1 fix is the source of the version-drift fix.)

---

## 13. Remaining Deltas

### BLOCKER

*(none)*

### HIGH

*(none)*

### MEDIUM

*(none)*

### LOW

- **`npm whoami` returns 401.** The local environment is not currently authenticated against the registry. Human follow-up: run `npm login` (or `npm adduser`) before the §11 publish commands. Not a code-side blocker.

### MICRO_DELTA

- **Experimental cli command source files still on disk** with broken imports. They are **not** registered in `cli.ts`, **not** reachable from the build, and **not** packed into any tarball. Carried over from the prior stabilization audit (out of v1.0.1 scope; future hygiene pass).
- **`packages/sdk` exists with a `package.json`** but is not in the workspaces array and is not in the v1.0.1 release graph. Untouched.
- **8 RC `.tgz` proof artifacts and `scratch*.ts` files in repo root** — tracked but never published. Not in any tarball. Untouched.
- **The four private adapter workspaces** (`@arch-engine/adapter-{shared, conformance, github, gitlab}`) remain at `1.0.0` with `private: true` and were not bumped. Documented as not-on-npm in the README; unchanged here.

---

## 14. Final Gate Decision

**`ARCH_ENGINE_V1_0_1_READY_FOR_HUMAN_NPM_PUBLISH`**

The seven-package v1.0.1 patch release is code-side ready. The only unresolved preflight item is `npm login` on the human's side (§13 LOW). All validation gates have passed:

- Build: green.
- Typecheck: green (real, not vacuous).
- Tests: 1890 / 1890 pass; 648 / 648 files pass.
- Freeze tests: 357 / 357 pass; 162 / 162 files pass.
- Pack dry-run: green for root and each of the seven public packages.
- Public-style install smoke: all five v1.0.0 commands exit 0 against `1.0.1` tarballs; `--version` reports `1.0.1`; no `edges is not iterable` regression.
- No public API expansion. No `@arch-governance/*` dependency. No AGP emitter code.

---

## 15. Recommended Next Mission

After successful publish + post-publish verification (§11 + §12) and the git tag described in the parent mission's final report:

**Arch-Engine AGP Emitter Contract Specification Pass.**

Doc-only contract specification for a new `@arch-engine/agp-emitter` workspace, with `@arch-governance/architecture-profile` as the sole permitted external AGP dependency. Targets v1.1.0 as a minor release that adds the emitter as a new opt-in package without changing the v1.0.x public contract.

---

*End of v1.0.1 patch release preflight.*
