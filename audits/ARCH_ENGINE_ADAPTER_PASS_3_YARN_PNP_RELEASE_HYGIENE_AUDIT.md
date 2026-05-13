# Arch-Engine Adapter Pass 3 Yarn PnP Release Hygiene Audit

| Field | Value |
| --- | --- |
| Audit version | 1.0 |
| Author | Claude Opus 4.7 (1M context) |
| Date | 2026-05-13 |
| Mission | Adapter Pass 3 — Yarn PnP Release Hygiene Pass |
| Predecessor (trial) | [`audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md`](./ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md) |
| Predecessor (implementation) | [`audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_IMPLEMENTATION_AUDIT.md`](./ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_IMPLEMENTATION_AUDIT.md) |

---

## 1. Executive Verdict

**`YARN_PNP_RELEASE_HYGIENE_READY_FOR_V1_4_0_PREP`**

The two trial-surfaced hygiene items — P3 `nodeLinker` metadata
ambiguity and the MICRO fixture-artifact dirtying — are both
addressed in source without changing any release-relevant surface:

- JSON v1 byte-shape unchanged.
- JSON v2 envelope shape unchanged at top level. The only delta
  is one new additive field, `data.adapter.metadata.yarnPnp.nodeLinkerSource`,
  always present, always one of three enum values. The
  pre-existing `nodeLinker` field now reports `"pnp"` (rather
  than `null`) on repos where Yarn Berry's documented default is
  PnP — matching real-world expectations validated on
  `yarnpkg/berry` in the trial.
- Adapter selection, `graphSurfaceHash`, registry precedence,
  cache-hint protocols — all byte-identical.
- No package version bumps. No `ARCH_ENGINE_*` code additions.
  No new CLI commands or flags. No AGP dependency.
- Test count grew from **2373 → 2385** (+12 new), zero failures.
- The new `.gitignore` rule prevents test runs from dirtying the
  working tree with regenerated CLI runtime artifacts inside
  yarn-pnp / pnpm fixture directories.

The patch is ready to be folded into v1.4.0 release preparation
without any follow-up correction.

---

## 2. Scope

Small hygiene pass only. Two items addressed, two items
explicitly deferred:

**Addressed in this pass:**
- P3-1 — `nodeLinker` metadata clarity on implicit-PnP repos.
- MICRO — fixture `.arch-engine/` runtime artifacts dirtying the
  repo after test runs.

**Deferred (out of scope per mission):**
- Unnamed-package semantic alignment (shared with adapter-pnpm
  v0.1.x; fold into a future hardening pass that updates both
  adapters together).
- Auto-init cache placement / opt-out for external-repo trials
  (CLI-wide v1.0.1+ behavior; cross-cutting refactor that does
  not belong in a yarn-pnp hygiene pass).
- v1.4.0 release prep.
- AGP emitter.
- New adapter features.

---

## 3. Trial Findings Addressed

| Finding | Source line in trial report | Status |
| --- | --- | --- |
| **P3-1**: `nodeLinker: null` despite Yarn implicit `pnp` default on a repo with `.pnp.cjs` and no explicit `.yarnrc.yml#nodeLinker` | `audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md` §9 P3-1 | **Fixed** — `nodeLinker: "pnp"` is now surfaced when a PnP file is present and `.yarnrc.yml` does not declare the value. New `nodeLinkerSource` provenance enum disambiguates the three cases. |
| **MICRO**: test runs regenerate `.arch-engine/session.json` and `.arch-engine/stability-score.json` inside fixture directories, dirtying the working tree | `audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md` §11 (and prior session reports going back to v1.3.0) | **Fixed** — new `.gitignore` rule `packages/cli/tests/fixtures/**/.arch-engine/` suppresses generated artifacts without affecting the pre-existing tracked fixtures under `pnpm-basic/.arch-engine/`. |

---

## 4. nodeLinker Metadata Decision

### Surfaced contract (v0.1.1)

`data.adapter.metadata.yarnPnp.nodeLinker` plus the new
`data.adapter.metadata.yarnPnp.nodeLinkerSource` enum form a
deterministic `(value, provenance)` pair:

| Condition | `nodeLinker` | `nodeLinkerSource` |
| --- | --- | --- |
| `.yarnrc.yml` declares `nodeLinker: pnp` / `node-modules` / `pnpm` | the literal value | `"yarnrc"` |
| `.yarnrc.yml` declares an unrecognised value | `"unknown"` | `"yarnrc"` |
| `.yarnrc.yml` is absent OR present but does not declare `nodeLinker:`, AND a `.pnp.cjs` or `.pnp.loader.mjs` is present at repo root | `"pnp"` (Yarn Berry's documented default) | `"inferred_from_pnp_file"` |
| Neither explicit value nor PnP file signal | `null` | `"absent"` |

### Why this design

- **Real-repo-evidence driven.** The v1.3.0 trial on `yarnpkg/berry`
  showed `nodeLinker: null` even though Berry's own repo is the
  canonical PnP repo. The new behavior matches user expectation
  while still being literally accurate (the `"inferred"`
  provenance tag prevents downstream consumers from being misled
  into thinking the file declared `pnp` explicitly).
- **No literal-vs-derived ambiguity.** Some adapters could be
  tempted to silently fill in defaults; the explicit provenance
  enum makes the decision auditable.
- **JSON v2 additive only.** Pre-existing consumers reading
  `nodeLinker` see a more useful value on inferred-PnP repos; the
  new `nodeLinkerSource` field is always present so consumers can
  start using it immediately without version-gating.
- **graphSurfaceHash unchanged.** Metadata never feeds the hash
  input.
- **Adapter selection unchanged.** The detect / extract code
  paths do not read `nodeLinkerSource`.

### File touched

- [`packages/adapter-yarn-pnp/src/yarn-workspaces.ts`](../packages/adapter-yarn-pnp/src/yarn-workspaces.ts):
  added `YarnPnpNodeLinkerSource` type + pure `resolveNodeLinker()` helper.
- [`packages/adapter-yarn-pnp/src/index.ts`](../packages/adapter-yarn-pnp/src/index.ts):
  added `nodeLinkerSource` to `InternalYarnPnpState`, wired into
  all four `metadata.yarnPnp` emission sites
  (`extractTopology` happy + empty paths, `runYarnPnpExtraction`
  happy + empty paths). Updated `YarnPnpExtractionResult.adapterInfo.metadata.yarnPnp`
  type. Re-exported `resolveNodeLinker` and the new type.

---

## 5. Fixture Artifact Hygiene

### Problem

Subprocess-driven tests under
`packages/cli/tests/adapters/adapter-yarn-pnp-*.test.ts` run the
CLI binary inside fixture cwds (`yarn-pnp-basic/`,
`yarn-pnp-workspace-protocol/`, `yarn-pnp-object-workspaces/`,
etc.). The CLI's `autoInitializeArchitectureContext(cwd)` step
(present since v1.0.1) writes a `.arch-engine/session.json` and
later a `.arch-engine/stability-score.json` into the fixture
directory. These regenerate on every test run and dirty
`git status`, complicating every subsequent hygiene check.

### Fix

Added a single new `.gitignore` rule, with an explanatory
comment, near the bottom of the file:

```gitignore
# Generated CLI runtime artifacts that the CLI auto-init step
# writes into adapter test fixtures whenever a command runs there
# (e.g. `arch-engine check` invoked from a fixture cwd by the
# subprocess-driven tests under `packages/cli/tests/adapters/`).
# These files are NOT fixture source — they are runtime side-effects
# and must never be committed. Intentional `session.json` /
# `stability-score.json` fixtures that pre-existed under
# `packages/cli/tests/fixtures/adapters/pnpm-basic/.arch-engine/`
# are already tracked and remain visible to git because tracked
# paths win over this ignore rule.
packages/cli/tests/fixtures/**/.arch-engine/
```

### Verified

After running the full focused test suite + `npm test`,
`git status` shows **zero** new `.arch-engine/` directories from:

- `yarn-pnp-basic`
- `yarn-pnp-workspace-protocol`
- `yarn-pnp-object-workspaces`
- `pnpm-workspace-protocol`

These four `.arch-engine/` directories existed on disk after the
test run but did NOT appear in `git status` — exactly the desired
behavior.

The pre-existing **tracked** files
(`pnpm-basic/.arch-engine/session.json`,
`pnpm-basic/.arch-engine/stability-score.json`) continued to show
as "M" (tracked paths always win over `.gitignore`), so the rule
did not accidentally hide intentional fixture content.

### What is **not** ignored

- Root-level `.arch-engine/stability-score.json` — separate
  concern (the engine's own repo). Out of scope.
- Any non-fixture path containing `.arch-engine/`.
- The 2 tracked fixture files under `pnpm-basic/.arch-engine/`.
- `.pnp.cjs`, `.pnp.loader.mjs`, `.yarnrc.yml`, `package.json`,
  `pnpm-workspace.yaml`, `.gitkeep` — all preserved.

---

## 6. Tests Added/Updated

### Updated (1)

- [`packages/adapter-yarn-pnp/tests/yarn-pnp-adapter.test.ts`](../packages/adapter-yarn-pnp/tests/yarn-pnp-adapter.test.ts)
  — extended the existing
  `adapterMetadata.yarnPnp shape > packageManagerVersion is the bare version`
  assertion to also pin `nodeLinkerSource === "yarnrc"` on the
  basic fixture.
- [`packages/cli/tests/adapters/adapter-yarn-pnp-json-v2-metadata.test.ts`](../packages/cli/tests/adapters/adapter-yarn-pnp-json-v2-metadata.test.ts)
  — extended the existing `inspect carries yarn-pnp-specific metadata block`
  assertion with `expect(md.nodeLinkerSource).toBe('yarnrc')`.

### Added (12)

- **Adapter package** (10 new tests):
  - `nodeLinkerSource provenance` describe block (7 tests):
    - "yarnrc" provenance with explicit `nodeLinker: pnp`.
    - "inferred_from_pnp_file" — no `.yarnrc.yml` but `.pnp.cjs`
      present.
    - "inferred_from_pnp_file" — `.pnp.loader.mjs`-only case.
    - "inferred_from_pnp_file" — object-form workspaces fixture.
    - "absent" — exterior cwd with neither signal.
    - `graphSurfaceHash` unchanged by the metadata addition (pins
      determinism + 64-char hex shape).
    - `runYarnPnpExtraction` legacy-shape helper also surfaces
      `nodeLinkerSource`.
  - `resolveNodeLinker() — pure unit tests` describe block (3
    tests): yarnrc-wins, inferred-pnp, absent.
- **CLI JSON v2 metadata** (2 new tests):
  - `nodeLinkerSource is "inferred_from_pnp_file" when .yarnrc.yml
    is absent (v0.1.1)` — verifies the fix end-to-end through the
    built CLI binary on the protocol fixture.
  - `nodeLinkerSource is always present in JSON v2 yarnPnp
    metadata` — cross-fixture invariant (basic, protocol,
    object-form).

### Not weakened

No existing test was relaxed, deleted, or skipped. The full
suite grew from **2373 → 2385 tests** (+12).

---

## 7. Validation Results

| Check | Command | Result |
| --- | --- | --- |
| Install | `npm install` | up to date |
| Build | `npm run build` | all 18 workspace packages built |
| Typecheck | `npm run typecheck` | exit 0 across 9 tsconfig projects |
| Focused yarn-pnp tests | `npx vitest run packages/adapter-yarn-pnp/tests packages/cli/tests/adapters/adapter-yarn-pnp-*.test.ts` | **4 files, 85 tests passed** (was 73 in v0.1.0) |
| Full tests | `npm test` | **674 files, 2385 tests passed, 0 failed** |
| Freeze tests | `npx vitest run packages/core/tests/freeze` | **162 files, 357 tests passed** |
| Root pack | `npm pack --dry-run` | clean (94 files) |
| Adapter pack | `npm --workspace @arch-engine/adapter-yarn-pnp pack --dry-run` | `arch-engine-adapter-yarn-pnp-0.1.0.tgz` (15.2 kB, 8 files — version unchanged) |
| CLI pack | `npm --workspace @arch-engine/cli pack --dry-run` | `arch-engine-cli-1.3.1.tgz` (36.4 kB, 18 files — unchanged) |
| Gitignore verification | `git status --short \| grep "\.arch-engine"` after full test run | **only the 2 tracked files** showed up (as expected); the 4 newly-generated fixture `.arch-engine/` directories did NOT appear |

End-to-end smoke (against built CLI on the workspace-protocol
fixture):

```jsonc
// data.adapter.metadata.yarnPnp slice
{
  "excludedGlobs": [],
  "matchedGlobs": ["apps/api", "packages/lib"],
  "nodeLinker": "pnp",              // ← was null in v0.1.0
  "nodeLinkerSource": "inferred_from_pnp_file",  // ← new in v0.1.1
  "packageManagerVersion": "4.1.0",
  "pnpFilePresent": true,
  "pnpLoaderPresent": false,
  "rawGlobs": ["apps/*", "packages/*"],
  "workspacesObjectForm": false,
  "workspacesPresent": true,
  "yarnrcPresent": false
}
```

The exact P3 finding from the real-repo trial is gone.

---

## 8. Compatibility Statement

| Surface | Before hygiene pass | After hygiene pass | Compatibility |
| --- | --- | --- | --- |
| JSON v1 default `--json` envelope | flat object | flat object, identical keys | **unchanged** |
| JSON v2 envelope top-level keys | as documented | same | **unchanged** |
| `data.adapter` block shape (name, version, packageManager, workspaceKind, confidence, reasons, warnings, alsoDetected, metadata) | as documented | same | **unchanged** |
| `data.adapter.metadata.yarnPnp` keys | 10 keys | 11 keys (added `nodeLinkerSource`) | **additive only** |
| `data.adapter.metadata.yarnPnp.nodeLinker` value on implicit-PnP repos | `null` | `"pnp"` | **consumer-safe correction** (matches real-world expectation; provenance disambiguated by new sibling field) |
| Adapter selection (precedence, cache-hint declines, status enum) | as documented | byte-identical | **unchanged** |
| `graphSurfaceHash` per fixture / repo | byte-stable | byte-stable, identical to v0.1.0 | **unchanged** |
| Exit codes | as documented | same | **unchanged** |
| `ARCH_ENGINE_*` vocabulary | 22 codes | 22 codes (no new codes) | **unchanged** |
| CLI flags / commands | as in v1.3.1 | same | **unchanged** |
| Node engines | `>=18.0.0` | `>=18.0.0` | **unchanged** |
| AGP dependency | absent | absent | **unchanged** |
| `@arch-engine/adapter-yarn-pnp` package.json `version` | `0.1.0` | `0.1.0` (unchanged) | **no bump in this pass** |
| `@arch-engine/cli` package.json `version` | `1.3.1` | `1.3.1` (unchanged) | **no bump in this pass** |
| Other packages | unchanged | unchanged | **unchanged** |
| npm publish | (n/a in this pass) | not performed | **no publish** |
| Git tag | (n/a in this pass) | not performed | **no tag** |

The hygiene pass is consumer-safe: any v0.1.0 consumer reading
`metadata.yarnPnp.nodeLinker` and expecting `null` on
yarnpkg/berry would have observed a behavior that the real-repo
trial classified as a P3 polish issue. The new behavior aligns
with Yarn Berry's own documented defaults and is signalled
explicitly via `nodeLinkerSource: "inferred_from_pnp_file"`.

The version bump will happen in the v1.4.0 release-prep pass
(see §10) where `@arch-engine/adapter-yarn-pnp` ships as
`0.1.0` for the first public release. This hygiene pass keeps
the package at `0.1.0` because v1.4.0 prep will absorb the
version assignment in one place.

---

## 9. Remaining Deltas

### MICRO_DELTA (deferred — fold into a future hardening pass)

- **Unnamed-package silent drop.** The yarn-pnp adapter and
  adapter-pnpm v0.1.x both silently drop workspace packages that
  lack a `name` field, rather than emitting
  `ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED` (ERROR). The real-repo
  trial observed this on `yarnpkg/berry` (47 matched globs, 45
  named nodes). The behavior is **consistent across both
  adapters**, so the fix must update both at once to avoid
  asymmetry. Deferred per mission scope.

- **Auto-init cache creation in target repos.** The CLI's
  `autoInitializeArchitectureContext(cwd)` (pre-existing v1.0.1+
  behavior) creates `.arch-engine/` directories in target repos
  on first run. The `.gitignore` rule added here covers the
  fixture-test side-effects in *this* repo; the broader CLI
  question of when/where to write the cache for external repos
  is cross-cutting and out of scope for a yarn-pnp hygiene
  pass.

### P3 (none)

The single P3-1 from the trial is fixed.

### P2 / P1 / P0 (none)

---

## 10. Recommended Next Mission

**`ARCH_ENGINE_V1_4_0_MINOR_RELEASE_PREPARATION_PASS`**

Justification:

- The two trial-surfaced hygiene items are addressed in source.
- All adapter contracts (selection, hash, JSON v1/v2 envelope
  shape) preserved.
- Test count grew (2373 → 2385) with zero regressions.
- The two deferred MICRO_DELTAs are non-blocking and can be
  absorbed by a v1.4.x patch or a Yarn PnP Adapter Hardening
  Pass later.
- The yarn-pnp adapter's real-repo trial verdict was already
  STRONG_SIGNAL; this hygiene pass strengthens the metadata
  surface without changing any release-relevant invariant.

The v1.4.0 release-prep pass should:

1. Bump `@arch-engine/cli` 1.3.1 → 1.4.0 (additive optional peer
   `@arch-engine/adapter-yarn-pnp: ^0.1.0` + new dispatch
   branch + the hygiene improvements landed here are all already
   compatible).
2. Bump `@arch-engine/adapter-monorepo` 1.3.0 → 1.3.1 (yarn-pnp
   cache-hint decline already landed in the implementation pass;
   this is the version-publish bump only).
3. First-publish `@arch-engine/adapter-yarn-pnp@0.1.0`.
4. Leave `@arch-engine/adapter-pnpm@0.1.1`, `@arch-engine/core@1.3.0`,
   `@arch-engine/schema@1.3.0`, and the three governance packs
   at `1.3.0` (unchanged).
5. Update CHANGELOG with the v1.4.0 entry covering the new
   adapter, the cache-hint protocol additions to monorepo, and
   the v0.1.1-trust-polish improvements applied to adapter-yarn-pnp.

If real-repo evidence beyond `yarnpkg/berry` becomes available
later (e.g. a private trial corpus), a follow-up
`YARN_PNP_ADAPTER_HARDENING_PASS` can address the unnamed-package
issue and any additional findings.

---

## 11. Commands Run

```bash
# Phase 1 — preflight
git status --short
git log --oneline --decorate -n 8

# Phase 3 — source changes
$EDITOR packages/adapter-yarn-pnp/src/yarn-workspaces.ts
$EDITOR packages/adapter-yarn-pnp/src/index.ts

# Phase 4 — .gitignore
$EDITOR .gitignore

# Phase 5 — tests
$EDITOR packages/adapter-yarn-pnp/tests/yarn-pnp-adapter.test.ts
$EDITOR packages/cli/tests/adapters/adapter-yarn-pnp-json-v2-metadata.test.ts

# Phase 6 — validation
npm install
npm run build
npm run typecheck
npx vitest run packages/adapter-yarn-pnp/tests packages/cli/tests/adapters/adapter-yarn-pnp-selection.test.ts packages/cli/tests/adapters/adapter-yarn-pnp-json-v2-metadata.test.ts packages/cli/tests/adapters/adapter-yarn-pnp-cli-smoke.test.ts
npm test
npx vitest run packages/core/tests/freeze
npm pack --dry-run
npm --workspace @arch-engine/adapter-yarn-pnp pack --dry-run
npm --workspace @arch-engine/cli pack --dry-run

# Phase 6 — gitignore verification
git status --short | grep "\.arch-engine"
git restore .arch-engine/stability-score.json packages/cli/tests/fixtures/adapters/pnpm-basic/.arch-engine/stability-score.json

# Phase 6 — smoke
(cd packages/cli/tests/fixtures/adapters/yarn-pnp-workspace-protocol \
 && node …/bin.js inspect --json --json-schema=v2 | jq '.data.adapter.metadata.yarnPnp')
```

No `npm publish` was run. No git tag was created. No package
version was bumped.

---

*End of Yarn PnP Release Hygiene Audit.*
