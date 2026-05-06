# Arch-Engine v1.0.1 Public Contract Stabilization Audit

**Audit date:** 2026-05-04
**Auditor:** Claude Opus 4.7 (1M context), stabilization pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main` (no commits made; changes left unstaged for review)
**Predecessor audit:** [audits/ARCH_ENGINE_V1_REPO_AND_AGP_EMITTER_READINESS_AUDIT.md](./ARCH_ENGINE_V1_REPO_AND_AGP_EMITTER_READINESS_AUDIT.md)

---

## 1. Executive Verdict

**`V1_0_1_READY_WITH_MICRO_DELTAS`**

All four hard bugs from the predecessor audit are fixed at the source level: the workspace build graph compiles end-to-end, the CLI binary now self-reports the correct `pkg.version` instead of a frozen `1.0.0-rc.3`, the `Fatal: edges is not iterable` runtime defect is root-caused and patched in `@arch-engine/adapter-monorepo` (with a defensive guard added in `@arch-engine/core` for third-party adapters), `npm pack` succeeds, and the README is factually correct again. Public-style smoke installs of locally packed tarballs now run all five v1.0.0 commands (`doctor` / `inspect` / `analyze` / `check` / `explain`) end-to-end on a clean fixture with exit code 0. The remaining 9 test failures (5 public-surface freeze drifts + 2 federation-capability-matrix mock/source mismatches + 1 sdk surface freeze + 1 d.ts surface freeze) are pre-existing post-v1.0.0 source drift in surfaces that are *not* part of the published v1.0.0 CLI contract; they are explicitly preserved to keep the freeze diagnostic intact, and they are the gate for the actual `npm publish` of v1.0.1 — not for this stabilization PR. Versions intentionally remain at `1.0.0`; the human-facing version-bump command for the future v1.0.1 publish is captured in §12.

Proceed: this stabilization pass is mergeable. Do **not** publish v1.0.1 until the surface-freeze drift is reconciled (separate decision).

---

## 2. Scope

This is a **stabilization-only** pass.

- No AGP emitter implementation.
- No `@arch-governance/runtime` or `@arch-governance/architecture-profile` dependency added.
- No new `@arch-engine/agp-emitter` package.
- No SaaS, dashboard, registry, or federation product work.
- No experimental package expansion.
- No npm publish performed.
- No version bump applied (deliberate; see §12).
- No tests deleted or assertions weakened.
- No experimental packages deleted.
- No `git push`, no force-push, no destructive git operations.

The pass touches the *smallest* set of files needed to make the published v1.0.0 surface buildable, packable, smoke-installable, and truthfully documented.

---

## 3. Public v1.0.0 Contract Reviewed

| Package | Published `latest` | In v1.0.1 scope | Notes |
| --- | --- | --- | --- |
| `@arch-engine/schema` | 1.0.0 | yes | exports `.` and `./schemas/*` |
| `@arch-engine/core` | 1.0.0 | yes | exports `.`, `./analysis`, `./parsers` |
| `@arch-engine/cli` | 1.0.0 | yes | bin `arch-engine`, peer-optional `@arch-engine/adapter-monorepo` |
| `@arch-engine/adapter-monorepo` | 1.0.0 | yes | dep on `@arch-engine/core` |
| `@arch-engine/governance-pack-rest-contract` | 1.0.0 | yes | |
| `@arch-engine/governance-pack-authority` | 1.0.0 | yes | |
| `@arch-engine/governance-pack-journey` | 1.0.0 | yes | |
| `@arch-engine/adapter-shared` | — (404) | no | private workspace, build-only |
| `@arch-engine/adapter-conformance` | — (404) | no | private workspace, factory-only |
| `@arch-engine/adapter-github` | — (404) | no | private workspace; README marked preview |
| `@arch-engine/adapter-gitlab` | — (404) | no | private workspace; README marked preview |
| `@arch-engine/sdk` | — (not published) | no | not in workspaces, used only by post-v1.0 experimental cli commands that have been removed from registration |
| `arch-engine` (root) | — (private) | n/a | `private: true`, never published |

Published v1.0.0 CLI surface (preserved, unchanged):

```
arch-engine doctor
arch-engine inspect
arch-engine analyze
arch-engine check               [--min-coverage <pct>] [--sync]
arch-engine explain <target>
                                [--json] [--no-color] [-h|--help] [-v|--version]
```

---

## 4. Issues Addressed

| # | Issue (from predecessor audit) | Status | How fixed |
| --- | --- | --- | --- |
| 1 | `npm run build` fails: `commands/pack/{init,validate}.ts` import `@arch-engine/sdk` (not in workspaces) | **fixed** | Reduced `packages/cli/src/cli.ts` from 324 unreachable command registrations down to the 5 published v1.0.0 commands. Source files for all unregistered experimental commands stay on disk untouched; tsup no longer enters them, so the unresolved imports are dead code from the build's perspective. Also removed unpublished `@arch-engine/adapter-github`/`adapter-gitlab` deps from `packages/cli/package.json` so the CLI's declared deps match its actual published v1.0.0 manifest. |
| 2 | CLI `--version` reports `1.0.0-rc.3` even at `@arch-engine/cli@1.0.0` | **fixed** | Root-caused as a stale build artifact in the published tarball: the source already used `cli.version(pkg.version)`, but the published `dist/bin.js` had been rebuilt during an RC and never re-bundled before the final publish. The freshly rebuilt `dist/bin.js` reads `pkg.version` correctly: `arch-engine/1.0.0 darwin-arm64 node-v25.2.1`. No source change required. |
| 3 | `analyze` / `check` / `explain` fail with `Fatal: edges is not iterable` on every fixture | **fixed** | Root cause: `packages/adapter-monorepo/src/index.ts` emitted `edgesByAdapter: { local_fs: internalNodes.size }` — a number — but `EngineExecutionState.edgesByAdapter` is typed `Record<string, ReconcilableEdge[]>` and `reconcileEdges` does `for (const edge of edges)`. The adapter now emits a real array of `ReconcilableEdge` objects projected from the adjacency map (`source`, `target`, `type: 'workspace_dependency'`, `confidence: 'namespace_inferred'`, `adapter_id: 'local_fs'`), with stable iteration order. A defensive `Array.isArray` guard was added to `reconcileEdges` so a future third-party adapter that emits a malformed shape produces a structured user-facing error instead of a TypeError. |
| 4 | README quickstart broken: `npm install @arch-engine/cli && npx arch-engine doctor` errors with `requires @arch-engine/adapter-monorepo` | **fixed** | Quickstart now installs `@arch-engine/cli @arch-engine/adapter-monorepo` together. |
| 5 | README markets `@arch-engine/adapter-github`/`adapter-gitlab` as installable; both 404 on npm | **fixed** | Provider Adapter Architecture section reframed as "preview, not yet released" with explicit "not on npm" note. |
| 6 | README contains pipe example `arch-engine policies emit-policy-pr ...` for non-existent CLI verb | **fixed** | Example removed. |
| 7 | README test-count badge `tests-915%20passed` stale | **fixed** | Stale badge removed (current test count varies; intentionally not replaced with another stale number). |
| 8 | `npm run typecheck` is misleading — root `tsconfig.json` has empty `files:[]`, so `tsc --noEmit` checks nothing | **fixed** | Root `typecheck` script now invokes `tsc --noEmit -p <tsconfig>` against each of the 7 public-contract packages individually. CLI's own `tsconfig.json` was tightened from `include: ["src/**/*.ts", "bin/**/*.ts"]` to an explicit allow-list of v1.0.0-reachable files (13 files), so the CLI typecheck no longer pulls in the unreached experimental files (which still have known broken imports). All 7 public packages now typecheck cleanly. |
| 9 | `packages/core/src/evaluation-trace/index.ts` had escaped backticks (`\`trace-\${...}\``) — a real syntax error | **fixed** | Restored to plain template literal. File is unreached from `@arch-engine/core`'s tsup entries, so no built artifact changes; only typecheck cleanliness improves. |
| 10 | 21 / 662 test files failed, 9 / 1890 tests failed, 5 snapshot mismatches | **partially fixed** | 14 of the 21 file failures were `packages/adapters/conformance/tests/*.test.ts` — these export `defineXxxTests(adapter)` factories with no top-level `describe()` and were never standalone tests. They are excluded from the vitest `include` glob (the conformance package itself is private and outside the v1.0.x published surface). Remaining 7 file failures and 9 test failures are pre-existing post-v1.0.0 source drift; none was introduced by this pass and none was weakened away. See §11. |

---

## 5. Package / Workspace Boundary

**In v1.0.1 scope (preserved):**

- `packages/schema` (`@arch-engine/schema`)
- `packages/core` (`@arch-engine/core`)
- `packages/cli` (`@arch-engine/cli`) — cli.ts trimmed to the 5 v1.0.0 commands
- `packages/adapter-monorepo` (`@arch-engine/adapter-monorepo`) — edgesByAdapter shape fixed
- `packages/governance-pack-authority`
- `packages/governance-pack-journey`
- `packages/governance-pack-rest-contract`

**Internal / private workspaces (build cleanly, not published, not in v1.0.1 scope):**

- `packages/adapters/shared`
- `packages/adapters/conformance` — tests excluded from vitest run (factory-only)
- `packages/adapters/github`
- `packages/adapters/gitlab`

**Out of scope (loose source under `packages/`, no `package.json`, never built or published):**

- 42 directories: `agents`, `agp-foundation`, `agp-spec`, `agl`, `approval`, `assurance`, `assurance-orchestrator`, `benchmarking`, `capsule`, `certification`, `continuous-assurance`, `controller`, `copilot`, `dataset-exchange`, `discovery`, `ecosystem-kit`, `exchange`, `interoperability`, `kernel`, `maturity`, `migration`, `observability`, `ontology`, `operator-sdk`, `platform-interface`, `plugins`, `policy-apps`, `productization`, `proofs`, `recommendation-graph`, `reference-node`, `registry-network`, `scorecard`, `semantic-compatibility`, `service`, `spec-portal`, `standards`, `testing`, `transparency-explorer`, `transparency-ledger`, `trust-federation`, `verifier-sdk`, `workflows`.
- `packages/sdk` — has `package.json` (`@arch-engine/sdk`), but is not in the workspaces array and is referenced only by the (now-unregistered) experimental `pack init` / `pack validate` commands.
- `packages/adapter-sdk` — has source code, no `package.json`.

These directories were left untouched. Build pollution (.js / .d.ts emitted into `src/` by an earlier `tsc -b` investigation) was cleaned up to keep `git status` honest.

---

## 6. Code Changes Made

| File | Change | Reason |
| --- | --- | --- |
| `packages/cli/src/cli.ts` | 2 722 lines → 88 lines. Kept the file's existing 5 v1.0.0 command registrations + global options + error-handling tail; removed the 319 unreached experimental command registrations that followed. | The 319 unreached `cli.command(...)` calls referenced action files that import from packages outside the workspace contract (`@arch-engine/sdk`, `@arch-engine/agents`, etc.), which broke the tsup bundle. Removing the registrations (without deleting the action source files) restores the build without changing the published v1.0.0 contract surface. |
| `packages/cli/package.json` | Removed `@arch-engine/adapter-github` and `@arch-engine/adapter-gitlab` from `dependencies`. | The published v1.0.0 of `@arch-engine/cli` does not list these. They were added locally post-1.0 but never made it to npm; removing keeps the local manifest aligned with the published manifest. |
| `packages/cli/tsconfig.json` | `include: ["src/**/*.ts", "bin/**/*.ts"]` → explicit allow-list of 13 v1.0.0-reachable files. | The previous wide glob included experimental files with broken imports, making `tsc --noEmit -p packages/cli` produce hundreds of errors. The narrowed include matches what the v1.0.0 CLI bundle actually compiles. |
| `packages/adapter-monorepo/src/index.ts` | `edgesByAdapter: { local_fs: internalNodes.size }` (a count) → `edgesByAdapter: { local_fs: edges }` where `edges` is an array of `ReconcilableEdge`-shaped objects projected from the adjacency map. | Root cause of `Fatal: edges is not iterable`. The adapter now emits the shape the runner contract requires. Iteration order is stable: nodes sorted alphabetically, then their internal targets in the order produced by the existing alphabetical filter. |
| `packages/core/src/reconciliation/edge-reconciliation.ts` | Added `Array.isArray(edges)` guard inside the `for (const [adapterId, edges] of …)` loop in `reconcileEdges`. | Defensive: if a third-party adapter emits a malformed `edgesByAdapter`, the runner now produces a clear `reconcileEdges: edgesByAdapter[…] must be ReconcilableEdge[]` error instead of `TypeError: edges is not iterable`. |
| `packages/core/src/evaluation-trace/index.ts` | Replaced ` \`trace-\${this.currentIndex}\` ` with plain `` `trace-${this.currentIndex}` ``. | Real syntax error in source. File is unreached from core's tsup entries, but `tsc --noEmit` on the package walks `src/**/*.ts`. Fixing the file makes typecheck pass. |
| `vitest.config.ts` | Added `exclude: ['**/node_modules/**', '**/dist/**', 'packages/adapters/conformance/tests/**']`. | The conformance "tests" are factory exports (`defineBranchNamingTests` etc.) with no top-level `describe()`. They are designed to be invoked from a wrapper, not run standalone. Excluding them removes 14 spurious "No test suite found" file failures without weakening any real assertion. |
| `package.json` | `typecheck: "tsc --noEmit --project tsconfig.json"` → explicit `tsc --noEmit -p <each contract package>` chain. | The previous root-tsconfig path checked nothing (empty `files:[]`, references not built). The new script checks all 7 public packages. |
| `README.md` | (a) Removed stale `tests-915%20passed` badge. (b) Quickstart now installs `@arch-engine/cli @arch-engine/adapter-monorepo` together. (c) "Provider Adapter Architecture" section reframed as "preview, not yet released" with explicit "not on npm" note. (d) Removed the non-existent `arch-engine policies emit-policy-pr …` pipe example. (e) Added a short "AGP integration (upcoming)" section that explicitly states v1.0.x does **not** depend on `@arch-governance/*` and does **not** emit AGP records. | Mission-required factual repairs. No marketing rewrite. |
| `package-lock.json` | Two lines removed corresponding to the `adapter-github` / `adapter-gitlab` dep entries. | Auto-regenerated by `npm install` after the cli `package.json` change. |

**Files NOT changed** (intentional):

- No `dist/` artifacts committed.
- No `node_modules/`.
- No experimental package directories.
- No tests.
- No snapshots.
- No published-package version strings.
- No GitHub Action workflow.
- No `tsconfig.base.json` or other workspace tsconfigs beyond cli.

---

## 7. Build / Typecheck / Test Results

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short` | 9 modified files + `audits/` untracked | Expected. |
| `npm install --no-audit --no-fund` | ok | `up to date in 460ms` |
| `npm run build` | **pass** | All workspaces build, including `@arch-engine/cli` (5 commands, 14 files, 11.8 KB tarball) and the `arch-engine-action` GitHub Action. |
| `npm run typecheck` | **pass** | Now actually checks 7 public-contract packages individually; previously vacuous. |
| `npm test` | **9 / 1890 fail, 7 / 648 files fail** | 14 conformance factory files now correctly excluded. Remaining failures are pre-existing surface drift; see §11. |
| `npm pack --dry-run` (root) | **pass** | 76 files, 687.6 KB tarball, name `arch-engine`, version `1.0.0`. |
| `npm pack --dry-run` (per-public-package) | **pass for all 7** | All public-contract packages tarball cleanly. |

---

## 8. CLI Smoke Results (locally rebuilt `dist/`)

| Command | Fixture | stdout/stderr | Exit |
| --- | --- | --- | --- |
| `arch-engine --help` | n/a | Lists 5 commands + global options | 0 |
| `arch-engine --version` | n/a | `arch-engine/1.0.0 darwin-arm64 node-v25.2.1` (drift fixed) | 0 |
| `arch-engine doctor` | `examples/sample-monorepo/` (4 packages) | Workspace yarn-npm, coverage 100%, confidence HIGH, 0 authority crossings, "No policy file detected" | 0 |
| `arch-engine inspect` | same | Nodes 4, edges 2, crossings 0, "Adapters active: adapter-monorepo" | 0 |
| `arch-engine analyze` | same | Stability score `CRITICAL (0.47)`, artifact written to `.arch-engine/stability-score.json` | 0 |
| `arch-engine check` | same | "Verification complete. No blocking violations." | 0 |
| `arch-engine explain regression` | same | "✔ No regression detected" | 0 |
| `arch-engine analyze --json` | same | Valid JSON with `score`, `classification`, `coverage`, `connectivity`, `domainDistribution`, `blast_radius` | 0 |
| `arch-engine check --json` | same | Valid JSON matching `cli-output-contract.json` shape | 0 |

All five v1.0.0 contract commands now exit 0 on a real fixture. Previously, `analyze`, `check`, and `explain` exited with `Fatal: edges is not iterable`.

---

## 9. Pack / Install Smoke Results

### 9.1 `npm pack --dry-run` per public package

```
@arch-engine/cli                           1.0.0   46.7 kB unpacked  14 files
@arch-engine/core                          1.0.0  ~1.6 MB unpacked
@arch-engine/schema                        1.0.0
@arch-engine/adapter-monorepo              1.0.0
@arch-engine/governance-pack-authority     1.0.0
@arch-engine/governance-pack-rest-contract 1.0.0
@arch-engine/governance-pack-journey       1.0.0
```

All seven pack cleanly. CLI tarball contains: `dist/bin.js`, `dist/{doctor,inspect,analyze,check,explain}-*.js`, 5 chunk files, `package.json`, `README.md`, `LICENSE` — 14 files total.

### 9.2 Tempdir public-style install (locally packed tarballs)

```
TARBALL_DIR=/var/folders/.../v101-tarballs.*/
SMOKE_DIR=/var/folders/.../v101-smoke.*/

cp -r examples/sample-monorepo/. "$SMOKE_DIR/"
cd "$SMOKE_DIR"
npm install \
  $TARBALL_DIR/arch-engine-schema-1.0.0.tgz \
  $TARBALL_DIR/arch-engine-core-1.0.0.tgz \
  $TARBALL_DIR/arch-engine-adapter-monorepo-1.0.0.tgz \
  $TARBALL_DIR/arch-engine-cli-1.0.0.tgz
# → "added 17 packages in 4s"

npx arch-engine --help    → lists 5 commands
npx arch-engine --version → "arch-engine/1.0.0 darwin-arm64 node-v25.2.1"
npx arch-engine doctor    → exit 0
npx arch-engine inspect   → exit 0
npx arch-engine analyze   → exit 0  (was: TypeError: edges is not iterable)
npx arch-engine check     → exit 0  (was: TypeError: edges is not iterable)
npx arch-engine explain regression → exit 0  (was: TypeError)
```

All tempdirs cleaned up.

---

## 10. README / Docs Corrections

Five factual repairs in `README.md`. No prose rewrite, no marketing changes, no new sections beyond the AGP-status note.

| Region | Before | After |
| --- | --- | --- |
| Top badges | Stale `tests-915%20passed` coverage badge | Removed (not replaced with another stale number) |
| Quickstart | `npm install @arch-engine/cli` then `npx arch-engine doctor` | Now installs both `@arch-engine/cli` and `@arch-engine/adapter-monorepo` |
| Provider Adapter Architecture | "**GitHub Adapter** — Complete and fully operational. **GitLab Adapter** — Planned next." (both unpublished) | "Provider Adapter Architecture (preview, not yet released)" with explicit "not on npm" note |
| Pipe example | `arch-engine policies emit-policy-pr --json \| arch-engine github create-policy-pr --execute` (non-existent verb) | Removed |
| Status / Out of scope | (no AGP context) | Added "AGP integration (upcoming)" section explicitly stating that v1.0.x does **not** depend on `@arch-governance/*` and does **not** emit AGP records yet |

Other documentation in `docs/` was left untouched. The deeper `docs/contracts/agp-*.md` files remain — that's a separate documentation cleanup mission, not v1.0.1 stabilization.

---

## 11. Remaining Deltas

### BLOCKER

*(none — `npm pack --dry-run` succeeds and the CLI smoke is green)*

### HIGH

- **Public-surface freeze drift (5 test failures + 1 obsolete snapshot set in core).** `packages/core/src/index.ts` re-exports more functions than the v1.0.0 public surface snapshot anchors. Specifically, the freeze tests in `packages/core/tests/freeze/distribution_exports_surface.test.ts`, `packages/core/tests/freeze/distribution_declaration_surface.test.ts`, `packages/core/tests/freeze/policy_loader_pipeline_contract_snapshot.test.ts`, `packages/core/tests/publicSurface.snapshot.test.ts`, `packages/core/tests/public-types-surface.test.ts`, and `packages/core/tests/sdk/core_public_surface_snapshot.test.ts` flag new exports such as `verifyBundleLockfileCompatibility`, `verifyPolicyPackBundleSignature`, `verifyPolicyPackLockfileReplay`, `verifyRegistryCatalogSignature`. These were added to core post-v1.0.0 and are detected as drift by design. The freeze tests are intentionally **not** updated in this pass — that would be loosening assertions to pass. Decision required before a v1.0.1 publish: either (a) revert the post-v1.0.0 core export additions to match v1.0.0 exactly (truly a patch release), or (b) intentionally update the snapshots to document v1.0.1's additive surface (then it's a minor release). This is a **publish-gate**, not a stabilization-PR gate.

### MEDIUM

- **Federation-capability-matrix mock/source mismatch (2 test failures).** `packages/core/tests/federation/federated-capability-matrix.test.ts` mocks `assessPolicyPackExecutionCompatibility` to return `{ overallStatus, violations: [...] }`, but the real `computeFederatedCapabilityMatrix` reads `compat.findings.map(...)`. The mock and the production interface have drifted. `computeFederatedCapabilityMatrix` is exported from core but is not exercised by any published v1.0.0 CLI command. Fix is a 1-line update to the test mock or the production function — out of scope for v1.0.1 stabilization.

- **Experimental cli command source files have known broken imports.** `packages/cli/src/applyPolicyPatchCommand.ts`, `packages/cli/src/commands/{adapter,agent,agl,…}/*` and 40+ siblings statically import from packages that aren't in the workspace contract. They are no longer registered in `cli.ts` and so are unreachable from the build, but they remain on disk. They are out of scope for v1.0.1 (covered by §5). A future "Repo Hygiene Pass II" should either move them under `packages/cli/src/_experimental/` or remove them.

### LOW

- **`packages/sdk` exists with `package.json` but is not in workspaces.** It's `@arch-engine/sdk@1.0.0` on disk only. Out of v1.0.1 scope.
- **GitHub Action (`action/`) builds fine** but its tests (if any) were not exercised in this pass; it's not a published npm package.
- **`scratch.{ts,mjs}`, `scratch2.ts`, `scratch3.ts`, `update_refusals.js`, `vitest.out`, 8 RC `.tgz` artifacts** in repo root are noise; they are tracked but never published. Not blocking; deserves a future janitor pass.

### MICRO_DELTA

- **Per-command `--help` falls back to root help** (`arch-engine github --help` shows the global help, not subcommand-specific). This is a `cac` routing artifact in v1.0.0 and is not regressed by this pass; users who hit it see correct help, just not focused.
- **`inspect` rendering on a single-package fixture** prints an empty `Adapters active:` line below the actual adapter name in some terminal widths. Cosmetic; no functional impact.
- **README still claims `1.x releases maintain CLI compatibility guarantees across adapters and governance packs`** — true but vague; a v1.0.1 patch publish doesn't need this tightened.

---

## 12. Release Recommendation

**Stabilization changes: ready to commit, not ready to publish v1.0.1 yet.**

Pre-publish checklist for the human follow-up:

1. **Decide on the surface drift** (HIGH delta in §11). Two paths:
   - *Strict patch:* revert post-v1.0.0 core export additions so the v1.0.0 freeze snapshots pass unchanged. Then version is `1.0.1`.
   - *Additive minor:* intentionally update freeze snapshots, document the new exports in CHANGELOG, version becomes `1.1.0`.

2. **Bump versions** (only after step 1). Suggested commands for a strict `1.0.1` patch (assumes path (a) above):

   ```bash
   # From repo root, with a clean working tree:
   for d in packages/schema packages/core packages/cli \
            packages/adapter-monorepo \
            packages/governance-pack-authority \
            packages/governance-pack-rest-contract \
            packages/governance-pack-journey; do
     (cd "$d" && npm version 1.0.1 --no-git-tag-version --allow-same-version)
   done
   # Update internal cross-deps (cli → core/schema, adapter-monorepo → core, etc.)
   # by running:
   #   sed -i '' 's/"@arch-engine\/\([a-z-]*\)": "\^1\.0\.0"/"@arch-engine\/\1": "^1.0.1"/g' \
   #     packages/*/package.json
   # Then regenerate the lockfile:
   npm install --no-audit --no-fund
   # Confirm:
   npm run build && npm run typecheck && npm test
   npm pack --dry-run
   # Tag and publish (per package, in dependency order):
   #   schema → core → adapter-monorepo → governance-pack-* → cli
   # NOT executed by this pass.
   ```

3. **Update `CHANGELOG.md`** with a `## [1.0.1] — YYYY-MM-DD` section listing:
   - Fix: `analyze` / `check` / `explain` no longer fail with `edges is not iterable` (root cause in `@arch-engine/adapter-monorepo`'s `edgesByAdapter` shape).
   - Fix: CLI `--version` now correctly reports the package version instead of a stale RC tag.
   - Fix: build graph repaired so `npm pack` works again.
   - Fix: `typecheck` script now actually checks each public package.
   - Docs: README quickstart, adapter status, and CLI examples corrected.

4. **Tag and publish.** Not part of this stabilization mission.

Versions intentionally **left at 1.0.0** in this pass.

---

## 13. AGP Emitter Readiness After Stabilization

**Yes** — the repo is now structurally ready for the **Arch-Engine AGP Emitter Contract Specification Pass**.

What this pass cleared:

- `npm run build` succeeds end-to-end → an `@arch-engine/agp-emitter` workspace can be added to the monorepo without inheriting a broken parent build.
- `npm run typecheck` actually checks the public packages → adding a new public package will be checked instead of skipped.
- `npm pack` and locally-tarball-installed CLI all work → the AGP emitter can be smoke-tested through the same pipeline.
- The `TopologyGraph` shape (`graphSurfaceVersion: "1.0.0"`, `graphSurfaceHash`, readonly `nodes`/`edges`) and the `EngineExecutionResult` from `@arch-engine/core` are stable inputs the emitter contract can target.
- The `edges is not iterable` fix means the emitter (which would consume a full reconciled graph) can rely on the runner's contract.

What still needs to happen *after* the contract pass and *before* an emitter implementation:

- Resolve the public-surface drift gate (§12 step 1) so v1.0.1 (or v1.1.0) is mergeable.
- Decide whether the emitter ships as a brand-new workspace `packages/agp-emitter/` (recommended in the predecessor audit's §12) or as a subpath export of `@arch-engine/core`.

The emitter contract pass itself produces only a doc and is not blocked by either the surface-drift gate or the version bump.

---

## 14. Non-Goals

This stabilization pass explicitly **did not**:

- Implement an AGP emitter or any AGP record-emitting code.
- Add `@arch-governance/runtime` or `@arch-governance/architecture-profile` as a dependency to any package.
- Change the AGP `PROFILE_VERSION` string or any AGP semantics.
- Add a new top-level CLI verb.
- Change the v1.0.0 CLI commands (`doctor`/`inspect`/`analyze`/`check`/`explain`) or their flags.
- Change the `cli-output-contract.json` JSON schema.
- Touch the published v1.0.0 dist tarballs on npm.
- Build a SaaS dashboard, registry-network, federation, transparency-ledger, capsule runtime, certification node, or any of the 42 post-v1.0 experimental directories.
- Bump versions or publish.
- Run `git push` or any destructive git operation.
- Delete tests or experimental package source.
- Update freeze snapshots to mask drift.

---

## 15. Appendix A — Commands Run

| # | Command | Result |
| --- | --- | --- |
| 1 | `git status --short` | `?? audits/` initially; after edits, 9 modified + `audits/` untracked |
| 2 | `git branch --show-current` | `main` |
| 3 | `git log --oneline -10` | latest `ff924b5 feat: extract architecture governance protocol into standalone ecosystem surface` |
| 4 | `find packages -maxdepth 2 -name package.json` | 12 packages on disk; 11 in workspaces; `packages/sdk` is the lone holdout |
| 5 | Read `packages/cli/src/cli.ts` (1–100, 2680–end) | 2722 lines, 324 `.command(...)` calls; 5 v1.0.0 + 319 unreached experimental |
| 6 | Read `packages/sdk/package.json` and `src/index.ts` | confirmed `@arch-engine/sdk@1.0.0`, not in workspaces, used only by `commands/pack/{init,validate}.ts` |
| 7 | Edit `packages/cli/src/cli.ts` (Write) | 2722 lines → 88 lines; only the 5 v1.0.0 commands remain registered |
| 8 | Edit `packages/cli/package.json` | removed `@arch-engine/adapter-github` and `@arch-engine/adapter-gitlab` from `dependencies` |
| 9 | `cd packages/cli && npm run build` | `tsup` build success in 14ms |
| 10 | `npm run build` (root) | all workspaces build; action package builds |
| 11 | `node packages/cli/dist/bin.js --help` | 5 commands listed |
| 12 | `node packages/cli/dist/bin.js --version` | `arch-engine/1.0.0 darwin-arm64 node-v25.2.1` (drift fixed) |
| 13 | Repro on `mktemp` fixture: `analyze`, `check`, `explain regression` | initially failed with `edges is not iterable`; stack pointed to `core/dist/index.js:7199` (`reconcileEdges`) |
| 14 | `grep reconcileEdges packages/core/src` | `reconciliation/edge-reconciliation.ts:123` |
| 15 | Read `packages/adapter-monorepo/src/index.ts` | line 151: `edgesByAdapter: { local_fs: internalNodes.size }` (a number, not an array) |
| 16 | Edit `packages/adapter-monorepo/src/index.ts` | emit projected `ReconcilableEdge[]` array |
| 17 | Edit `packages/core/src/reconciliation/edge-reconciliation.ts` | added `Array.isArray(edges)` guard with structured error |
| 18 | `npm run build` | all workspaces build |
| 19 | Re-run `analyze`/`check`/`explain` on fixture | all exit 0 |
| 20 | `npm test` | 21 file failures, 9 test failures (same as predecessor audit) |
| 21 | Inspect failing tests: 14 are conformance factories with no top-level describe | quarantined in `vitest.config.ts` exclude |
| 22 | Edit `vitest.config.ts` | added `exclude: ['**/node_modules/**', '**/dist/**', 'packages/adapters/conformance/tests/**']` |
| 23 | Re-run `npm test` | 7 file failures, 9 test failures (rest are pre-existing surface drift) |
| 24 | `npx tsc -b` (root) | many errors: cli include glob picks up experimental files; `evaluation-trace/index.ts` syntax error |
| 25 | Edit `packages/core/src/evaluation-trace/index.ts` | fixed escaped-backtick template literal |
| 26 | Edit `packages/cli/tsconfig.json` | replaced wide include with explicit allow-list of 13 v1.0.0-reachable files |
| 27 | `npx tsc --noEmit -p packages/{schema,core,cli,adapter-monorepo,governance-pack-*}/tsconfig.json` | all 7 packages typecheck cleanly |
| 28 | Edit `package.json` typecheck script | now invokes `tsc --noEmit -p <each>` chain |
| 29 | `npm run typecheck` | pass (now meaningful) |
| 30 | `npm pack --dry-run` (root) | 76 files, 687.6 KB, `arch-engine-1.0.0.tgz` |
| 31 | `npm pack --dry-run` (per public package) | all 7 pack cleanly |
| 32 | `mktemp` + install local tarballs of 4 packages + run all 5 CLI commands | all exit 0; `--version` reports `1.0.0` |
| 33 | Cleanup of build pollution under non-workspace `packages/*/src/` | removed 557 stray `.js`/`.d.ts`/`.map` files emitted by the earlier `tsc -b` probe |
| 34 | Edit `README.md` | removed stale badge; fixed quickstart; reframed adapter section; removed bad pipe example; added AGP note |
| 35 | `grep -RE "@agp/(runtime|architecture-profile)"` | 0 matches in active dirs |
| 36 | `grep -RE "@arch-governance/(runtime|architecture-profile)"` | 0 matches in active dirs |
| 37 | Final `git status --short` | 9 modified files + `audits/` untracked |

---

## 16. Appendix B — Public CLI Surface Snapshot (post-stabilization)

```
$ node packages/cli/dist/bin.js --version
arch-engine/1.0.0 darwin-arm64 node-v25.2.1

$ node packages/cli/dist/bin.js --help
arch-engine/1.0.0

Usage:
  $ arch-engine <command> [options]

Commands:
  doctor            Diagnose environment readiness and existing adapter usage
  inspect           Output canonical topology summary without executing violations
  analyze           Emit stability score, conflict ratios, and blast radius summary
  check             Execute architecture pipeline and evaluate boundaries
  explain <target>  Explain WHY a violation occurred or HOW confidence propagated

For more info, run any command with the `--help` flag:
  $ arch-engine doctor --help
  $ arch-engine inspect --help
  $ arch-engine analyze --help
  $ arch-engine check --help
  $ arch-engine explain --help

Options:
  --json         Output results as JSON
  --no-color     Disable colorized output (default: true)
  -h, --help     Display this message
  -v, --version  Display version number
```

CLI tarball contents (`@arch-engine/cli@1.0.0`):

```
LICENSE                       1.1 kB
README.md                     0.46 kB
dist/bin.js                   2.4 kB
dist/doctor-O5UOCJD5.js       4.6 kB
dist/inspect-ZQJ6QVVA.js      3.4 kB
dist/analyze-HQG7QZI7.js      5.2 kB
dist/check-MLENSP3V.js        7.3 kB
dist/explain-BSCIIRNY.js      9.6 kB
dist/chunk-FUHK6UYS.js        2.1 kB
dist/chunk-M2C4BMSK.js        4.5 kB
dist/chunk-MZDI3CHY.js        0.65 kB
dist/chunk-QRN6WVFK.js        1.8 kB
dist/chunk-T4SJZMUH.js        2.3 kB
package.json                  1.3 kB
                              -------
total (14 files)              ~46.7 kB unpacked, ~11.8 kB packed
```

---

*End of stabilization audit.*
