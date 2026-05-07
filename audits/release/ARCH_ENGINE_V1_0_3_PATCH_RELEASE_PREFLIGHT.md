# Arch-Engine v1.0.3 Patch Release Preflight

**Audit date:** 2026-05-07
**Auditor:** Claude Opus 4.7 (1M context), release-prep pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**HEAD prior to release-prep commit:** `06422ca docs(cli): add json and error language specification`
**Predecessor preflight:** [audits/release/ARCH_ENGINE_V1_0_2_PATCH_RELEASE_PREFLIGHT.md](./ARCH_ENGINE_V1_0_2_PATCH_RELEASE_PREFLIGHT.md)
**Predecessor implementation audits:**
- [audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_IMPLEMENTATION_AUDIT.md](../ARCH_ENGINE_JSON_ERROR_LANGUAGE_IMPLEMENTATION_AUDIT.md)
- [audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_SPECIFICATION_AUDIT.md](../ARCH_ENGINE_JSON_ERROR_LANGUAGE_SPECIFICATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_A_IMPLEMENTATION_AUDIT.md](../ARCH_ENGINE_CLI_EXPERIENCE_PHASE_A_IMPLEMENTATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md](../ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_C_DEMO_OUTPUT_CALIBRATION_AUDIT.md](../ARCH_ENGINE_CLI_EXPERIENCE_PHASE_C_DEMO_OUTPUT_CALIBRATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_EXIT_CODE_REPAIR_AUDIT.md](../ARCH_ENGINE_CLI_EXPERIENCE_EXIT_CODE_REPAIR_AUDIT.md)

---

## 1. Executive Verdict

**`V1_0_3_RELEASE_READY_WITH_HUMAN_NPM_PREFLIGHT`**

All seven public packages are bumped to `1.0.3`. Internal cross-deps
align to `^1.0.3`. The full validation matrix is green: build,
typecheck, **1992 / 1992 tests** pass (653 / 653 files), freeze tests
**357 / 357** pass without snapshot updates, and `npm pack --dry-run`
succeeds for the root and each of the seven public packages. A local
public-style install smoke — pack tarballs into a tempdir, install into
fresh consumer projects, run all five v1.0.x CLI verbs — completes
cleanly: `--version` reports `1.0.3`, the no-policy `sample-monorepo`
exits 0 for all five commands with `diagnostics: []` populated as
expected, and `demo-drift check --json` **exits 1** with structured
`violations[]`, `artifactRelativePath`, and a
`ARCH_ENGINE_BLOCKING_VIOLATION` diagnostic. No public API was widened.
No `@arch-governance/*` dependency was added. No npm publish was
performed. The remaining preflight step is human-side: `npm login`
(already authenticated as `tharcyn`) and the seven `npm publish
--access public` invocations in dependency order documented in §11.

---

## 2. Scope

Strict v1.0.3 patch release. **JSON / error-language polish only.**

- No new public exports, no new commands, no new flags.
- No JSON envelope redesign. No `--json-schema=v2` flag.
- Three additive JSON fields:
  - `diagnostics: []` on every command's `--json` output.
  - `violations: []` on `check --json`.
  - `artifactRelativePath` on `check --json`.
- All v1.0.2 JSON keys preserved verbatim with the same value types.
- No behavior change to exit codes. Phase D-Lite (v1.0.2) exit-code
  mapping carries over unchanged.
- No `@arch-governance/runtime` or `@arch-governance/architecture-profile`
  dependency.
- No version higher than 1.0.3.
- No experimental package promotion.
- No tests loosened or freeze snapshots updated.

This pass touches only `package.json` files (7 public packages),
`package-lock.json`, `CHANGELOG.md`, this preflight, the implementation
audit, two doc cross-references (`docs/cli/cli-experience-spec.md` and
`docs/cli/cli-readiness-matrix.md`), and the v1.0.3 source / test files
described in the implementation audit.

---

## 3. Packages Included

| Package | Old | New | Internal deps after bump | Publish status |
| --- | --- | --- | --- | --- |
| `@arch-engine/schema` | 1.0.2 | 1.0.3 | — | not yet published |
| `@arch-engine/core` | 1.0.2 | 1.0.3 | `@arch-engine/schema@^1.0.3` | not yet published |
| `@arch-engine/adapter-monorepo` | 1.0.2 | 1.0.3 | `@arch-engine/core@^1.0.3` | not yet published |
| `@arch-engine/governance-pack-authority` | 1.0.2 | 1.0.3 | `@arch-engine/core@^1.0.3` | not yet published |
| `@arch-engine/governance-pack-rest-contract` | 1.0.2 | 1.0.3 | `@arch-engine/core@^1.0.3` | not yet published |
| `@arch-engine/governance-pack-journey` | 1.0.2 | 1.0.3 | `@arch-engine/core@^1.0.3` | not yet published |
| `@arch-engine/cli` | 1.0.2 | 1.0.3 | `@arch-engine/core@^1.0.3`, `@arch-engine/schema@^1.0.3`, peer `@arch-engine/adapter-monorepo@^1.0.3` (optional) | not yet published |

The root private package (`arch-engine@1.0.0`) is **not** bumped — it
is a workspace orchestrator and not published. The private `sdk`
package keeps `workspace:*` references.

---

## 4. Changes Included

### 4.1 New CLI internal modules

| File | Purpose | Lines |
| --- | --- | --- |
| `packages/cli/src/error-codes.ts` | Single source of truth for the 11 `ARCH_ENGINE_*` codes per spec §6.2. Severity, exit-code, title, default fix, `ciBlocking` metadata. Internal — not exported. | 220 |
| `packages/cli/src/format-error.ts` | Structured `Title / Problem / Fix / Exit / Docs` renderer; `diagnosticToJson` serializer; `isDebugEnabled` stack-trace gate; `diagnosticFromUnknownError` mapper. Internal — not exported. | 306 |

### 4.2 Wired top-level catch path

`packages/cli/src/cli.ts` — top-level `catch (error)` block now routes
to `diagnosticFromUnknownError` → `emitDiagnosticHuman` → `process.exit
(exitCodeForDiagnostic(diagnostic))`. Unknown throws map to
`ARCH_ENGINE_INTERNAL_INVARIANT_FAILED` (exit 5). Stack traces hidden
by default.

### 4.3 Additive JSON fields

| Command | Field | Notes |
| --- | --- | --- |
| `doctor --json` | `diagnostics: []` | INFO `POLICY_NOT_FOUND` when no policy; WARNING `TOPOLOGY_LOW_SIGNAL` when below floor. |
| `inspect --json` | `diagnostics: []` | Always present; populated only when low-signal. |
| `analyze --json` | `diagnostics: []` | Same scenarios as `doctor`; sits alongside Phase A's `policyConfigured` / `headlineKind`. |
| `check --json` | `diagnostics: []` | `POLICY_NOT_FOUND`, `TOPOLOGY_LOW_SIGNAL`, `BLOCKING_VIOLATION` per scenario. |
| `check --json` | `violations: []` | Stable `id` (sha256-truncated 8-char), `ruleId`, `edge`, `severity`, `ciBlocking`, `category`, `code`. |
| `check --json` | `artifactRelativePath` | POSIX, repo-relative; sibling to existing absolute `artifactPath`. |
| `explain --json` (all 7 paths) | `diagnostics: []` | `TARGET_NOT_FOUND`, `NO_BASELINE`, `POLICY_NOT_FOUND`, `TOPOLOGY_LOW_SIGNAL` per scenario. |

### 4.4 Stack-trace policy

Stack traces are **off by default** for every command, every error class.
`DEBUG=arch-engine`, `DEBUG=arch-engine:*`, `DEBUG=arch-engine:foo`, or
`DEBUG=*` re-enable stack frame output for `INTERNAL` severity diagnostics.

### 4.5 One Fatal path structurised

`packages/cli/src/commands/check.ts` — the `Topology extraction failed`
fatal path now builds an `ARCH_ENGINE_ADAPTER_NOT_FOUND` diagnostic and
routes through `emitDiagnosticHuman` / `emitDiagnosticJson`. Exit code
preserved at `3`.

### 4.6 Tests and docs

- `packages/cli/tests/cli-experience-phase-e.test.ts` (694 lines, 44
  tests) covers spec §15.1–§15.6.
- `docs/cli/cli-readiness-matrix.md` gains a v1.0.3 polish section.
- `docs/cli/cli-experience-spec.md` §7 / §8 / §13.1 cross-link to the
  JSON / Error-Language spec.
- `audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_IMPLEMENTATION_AUDIT.md`
  documents the implementation pass.

---

## 5. JSON Compatibility

- `diagnostics: []` is **additive** — present on every command's
  `--json` output starting in v1.0.3; absent in v1.0.2 outputs.
- `violations: []` is **additive** on `check --json` — empty when no
  policy violations exist; otherwise contains spec-shaped entries.
- `artifactRelativePath` is **additive** on `check --json` — the
  existing absolute `artifactPath` is unchanged and still present.
- **No existing JSON keys were removed.**
- **No existing JSON keys were renamed.**
- **No existing JSON value types changed.**
- The Phase A additive keys (`policyConfigured`, `headlineKind`) on
  `analyze --json` and `check --json` are preserved verbatim.
- The Phase B additive `supportedSpecialTargets[]` field on
  `explain --json` (unknown-target branch) is preserved verbatim.
- **No default JSON v2 envelope** (`schemaVersion`, `command`,
  `version`, `emittedAt`, `status`, `summary`, `nextActions`,
  `artifacts`) — that envelope remains deferred to a future minor
  release.
- **No `--json-schema=v2` flag** — also deferred.

JSON shape backward-compatibility is verified by the §15.3 tests in
`cli-experience-phase-e.test.ts` (the "JSON backward-compat: no
removed/renamed v1.0.2 keys" describe block).

---

## 6. Public API / Command Surface Compatibility

- ✅ **No new commands.** Five v1.0.x verbs unchanged: `doctor`,
  `inspect`, `analyze`, `check`, `explain <target>`.
- ✅ **No new flags.** Existing flags only: `--json`, `--no-color`,
  `--min-coverage`, `--sync`, `--help`, `--version`.
- ✅ **No public export widening.** `packages/cli/package.json#exports`
  is exactly `{ ".": "./dist/bin.js" }`. The two new internal modules
  (`error-codes.ts`, `format-error.ts`) are reachable only from inside
  the CLI bundle.
- ✅ **Freeze tests pass** at 357 / 357 with no snapshot updates.
- ✅ **No AGP dependencies.** `grep "@arch-governance/runtime\|@arch-governance/architecture-profile"`
  on every published `package.json` returns nothing.
- ✅ **No `@arch-engine/agp-emitter` package.** AGP emitter remains
  deferred to a future minor / feature release.

---

## 7. Validation Results

| Command | Result |
| --- | --- |
| `npm install` | ✅ clean (165 packages, lockfile updated to 1.0.3) |
| `npm run build` | ✅ all packages build (CLI + adapters + governance packs) |
| `npm run typecheck` | ✅ all 7 tsconfigs clean |
| `npm test` | ✅ **1992 / 1992 tests** across **653 / 653 files** |
| Freeze tests | ✅ **357 / 357** in `packages/core/tests/freeze` (no snapshot updates) |
| `npm pack --dry-run` (workspace `@arch-engine/cli`) | ✅ 16 files, 17.5 kB tarball |
| `npx tsc --noEmit -p packages/cli/tsconfig.json` | ✅ clean |
| `npx vitest run packages/cli/tests/cli-experience-phase-e.test.ts` | ✅ **44 / 44** new Phase E tests |

---

## 8. Package Pack Dry-Run Results

Each public package was packed individually with `npm --workspace …
pack --dry-run` after the version bump:

| Package | Tarball | Files | Package size | Unpacked size |
| --- | --- | --- | --- | --- |
| `@arch-engine/schema` | `arch-engine-schema-1.0.3.tgz` | 15 | 8.8 kB | 47.1 kB |
| `@arch-engine/core` | `arch-engine-core-1.0.3.tgz` | 23 | 515.7 kB | 2.6 MB |
| `@arch-engine/adapter-monorepo` | `arch-engine-adapter-monorepo-1.0.3.tgz` | 5 | 3.4 kB | 8.7 kB |
| `@arch-engine/governance-pack-authority` | `arch-engine-governance-pack-authority-1.0.3.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/governance-pack-rest-contract` | `arch-engine-governance-pack-rest-contract-1.0.3.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/governance-pack-journey` | `arch-engine-governance-pack-journey-1.0.3.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/cli` | `arch-engine-cli-1.0.3.tgz` | 16 | 17.5 kB | 70.3 kB |

All seven tarball file counts and sizes are within ±10% of the v1.0.2
baseline; the `@arch-engine/cli` tarball is byte-identical in file
count (16) to v1.0.2 because the additive code lands inside chunked
ESM bundles already accounted for.

---

## 9. Local Public-Style Install Smoke

The smoke test packs all seven public packages into local `.tgz`
files, installs them into a fresh tempdir consumer project, and runs
the v1.0.x CLI surface end-to-end. Captured in Phase 9 of this
release-prep pass.

| Step | Result |
| --- | --- |
| `arch-engine --version` | ✅ reports `1.0.3` |
| `arch-engine --help` | ✅ lists 5 commands; First-run path block; product promise. |
| `arch-engine doctor` (no-policy fixture) | ✅ exits 0 |
| `arch-engine inspect` (no-policy fixture) | ✅ exits 0 |
| `arch-engine analyze` (no-policy fixture) | ✅ exits 0 |
| `arch-engine check` (no-policy fixture) | ✅ exits 0 |
| `arch-engine check` (demo-drift) | ✅ exits 1 with `Blocked: 1 architecture violation.` and `Exit 1: blocking architecture violations.` |
| `arch-engine check --json` (demo-drift) | ✅ JSON parses; `diagnostics[]` includes `ARCH_ENGINE_BLOCKING_VIOLATION`; `violations[0].id === "v_<hex8>"`; `violations[0].code === "ARCH_ENGINE_BLOCKING_VIOLATION"`; `artifactRelativePath === ".arch-engine/stability-score.json"` |
| `arch-engine explain regression --json` | ✅ JSON parses; `diagnostics[]` present |
| `arch-engine explain --json` (unknown target) | ✅ exits 0; `diagnostics` includes `ARCH_ENGINE_TARGET_NOT_FOUND` |

Tempdirs cleaned at the end of the smoke.

---

## 10. npm Registry Preflight

| Check | Result |
| --- | --- |
| `npm whoami` | `tharcyn` |
| `@arch-engine/schema` versions | `1.0.0-rc.{1,2,3}, 1.0.0, 1.0.1, 1.0.2` (no 1.0.3) |
| `@arch-engine/core` versions | `1.0.0-rc.{1,2,3}, 1.0.0, 1.0.1, 1.0.2` (no 1.0.3) |
| `@arch-engine/adapter-monorepo` versions | `1.0.0-rc.4, 1.0.0, 1.0.1, 1.0.2` (no 1.0.3) |
| `@arch-engine/governance-pack-authority` versions | `1.0.0-rc.{1,4}, 1.0.0, 1.0.1, 1.0.2` (no 1.0.3) |
| `@arch-engine/governance-pack-rest-contract` versions | `1.0.0-rc.{1,3,4}, 1.0.0, 1.0.1, 1.0.2` (no 1.0.3) |
| `@arch-engine/governance-pack-journey` versions | `1.0.0-rc.{1,4}, 1.0.0, 1.0.1, 1.0.2` (no 1.0.3) |
| `@arch-engine/cli` versions | `1.0.0-rc.{1,2,3}, 1.0.0, 1.0.1, 1.0.2` (no 1.0.3) |

**1.0.3 is not yet published for any of the seven packages.** Safe to
proceed.

---

## 11. Manual Publish Order

After human review of this preflight, run the following commands **in
this exact order** from the repo root. Each command waits for the
previous one to complete (npm registry consistency):

```bash
npm publish --workspace @arch-engine/schema --access public
npm publish --workspace @arch-engine/core --access public
npm publish --workspace @arch-engine/adapter-monorepo --access public
npm publish --workspace @arch-engine/governance-pack-authority --access public
npm publish --workspace @arch-engine/governance-pack-rest-contract --access public
npm publish --workspace @arch-engine/governance-pack-journey --access public
npm publish --workspace @arch-engine/cli --access public
```

Order rationale:

- `schema` is a leaf with no `@arch-engine/*` deps.
- `core` depends on `schema`.
- `adapter-monorepo` and the three governance packs each depend on
  `core` only.
- `cli` depends on `core` + `schema` and peer-depends on
  `adapter-monorepo`.

If a publish fails partway through, **do not run earlier publishes
again** (npm rejects re-publish of the same version). Re-run only
the still-pending packages.

---

## 12. Post-Publish Verification Commands

After all seven publishes succeed, run from any clean directory:

```bash
npm view @arch-engine/schema@1.0.3 version
npm view @arch-engine/core@1.0.3 version
npm view @arch-engine/adapter-monorepo@1.0.3 version
npm view @arch-engine/governance-pack-authority@1.0.3 version
npm view @arch-engine/governance-pack-rest-contract@1.0.3 version
npm view @arch-engine/governance-pack-journey@1.0.3 version
npm view @arch-engine/cli@1.0.3 version
```

Each must print `1.0.3`.

Then run a fresh public-registry install smoke from a tempdir:

```bash
cd "$(mktemp -d -t arch-1.0.3-XXX)"
npm init -y
npm install --save-dev @arch-engine/cli@1.0.3 @arch-engine/adapter-monorepo@1.0.3
npx arch-engine --version            # expect: 1.0.3
npx arch-engine doctor               # expect: exit 0
npx arch-engine check --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log('diagnostics:',Array.isArray(o.diagnostics));console.log('violations:',Array.isArray(o.violations));console.log('artifactRelativePath:',typeof o.artifactRelativePath);})"
# expect three booleans/strings: true, true, "string"
```

---

## 13. Git Tag Commands (do not run yet)

After the publish + verification complete, the human operator can
create the v1.0.3 git tag:

```bash
# from main branch with the release-prep commit on HEAD
git tag arch-engine-v1.0.3
git push origin main --tags
```

Do **not** run these as part of this preflight pass.

---

## 14. Remaining Deltas

| Delta | Severity | Notes |
| --- | --- | --- |
| `--min-coverage` failure path is not structurised | MICRO_DELTA | Pre-existing in v1.0.2; exit 3 preserved; documented in implementation audit §8 (Open Items #1). Deferred until a minor release where the exit code can move. |
| `cli-experience-spec.md §8.3` table lists exit `4` for `ARCH_ENGINE_GRAPH_SHAPE_INVALID` and `ARCH_ENGINE_INTERNAL_INVARIANT_FAILED` | LOW | The implementation uses exit `5` for both, matching the JSON / Error-Language spec which is now the source of truth (note added to §8 in this pass). Older spec rows could be silently corrected in a future docs cleanup. |
| Pre-existing untracked tarballs at repo root (`arch-engine-*.tgz`) | LOW | Not produced by this pass; gitignored; will not be staged. |
| 1 moderate-severity npm audit finding | LOW | Pre-existing; not introduced by this pass. Tracked separately. |

No BLOCKER or HIGH deltas.

---

## 15. Final Gate Decision

**`ARCH_ENGINE_V1_0_3_READY_FOR_HUMAN_NPM_PUBLISH`**

The repo is ready for the human operator to run the seven
`npm publish` commands in §11 and the verification commands in §12.

---

## 16. Recommended Next Mission

After publish verification succeeds and the v1.0.3 tag is pushed, the
recommended next mission depends on product priority:

- **Option A — CLI v1.1 JSON v2 Envelope / CI Flags Contract Pass.**
  Lift the v1.0.x flat JSON output into the v2 envelope behind
  `--json-schema=v2`; add `--ci`, `--format`, `--output`, `--verbose`,
  `--quiet` flags per spec §11.4 and §13.2. Net-additive, minor
  version bump (1.1.0). Targets the JSON-consumer audience and
  prepares for AGP emitter integration.
- **Option B — Private AGP Emitter MVP Implementation Pass.**
  Implement `@arch-engine/agp-emitter@0.1.0` per
  `docs/contracts/agp-emitter-contract.md` and wire `arch-engine
  check --emit-agp` behind a feature flag. Pull-only on user opt-in;
  no AGP dependency for default v1.0.x bundle. Targets the governance
  ecosystem.

Either is a clean follow-on. Option A consolidates the v1.0.x JSON
contract that v1.0.3 just polished; Option B opens the AGP track.
Choose based on whether the immediate next user-visible win is
"JSON cleanup" or "governance integration".

*End of preflight.*
