# Arch-Engine v1.3.1 Adapter Trust Polish Audit

| Field | Value |
| --- | --- |
| Audit version | 1.0 |
| Author | Claude Opus 4.7 (1M context) |
| Date | 2026-05-13 |
| Mission | v1.3.1 Adapter Trust Polish Patch implementation pass |
| Predecessor | [`audits/ARCH_ENGINE_V1_3_0_REAL_REPO_ADAPTER_TRIAL.md`](./ARCH_ENGINE_V1_3_0_REAL_REPO_ADAPTER_TRIAL.md) |
| Scope | Implementation only — no publish, no tag, no version bump |

---

## 1. Executive Verdict

**`V1_3_1_ADAPTER_TRUST_POLISH_READY_FOR_RELEASE_PREP`**

The three polish items surfaced by the v1.3.0 real-repo adapter
trial are implemented in source. All affected surfaces continue
to satisfy the v1.3.0 contracts:

- JSON v1 byte-shape unchanged.
- JSON v2 envelope shape unchanged. The only delta inside the
  envelope is that `data.adapter.metadata.pnpm.packageManagerVersion`
  is now deterministically present (string or `null`) and is
  always the bare version (`"9.0.0"`) rather than the raw hint
  (`"pnpm@9.0.0"`).
- Adapter selection wiring untouched.
- `graphSurfaceHash` for every fixture is byte-identical to v1.3.0.
- `monorepoArchitectureAdapter` cache-hint protocol untouched.
- No new CLI flags, commands, or error codes introduced.
- No new dependencies (no AGP, no Yarn PnP adapter).
- No package version was bumped. No `npm publish` was run. No git
  tag was created.

Validation: full repo build, typecheck, and `npm test` (670 test
files, 2300 tests) all pass. All 162 freeze test files (357
tests) pass. The eight adapter test files (108 tests, including
the newly added v1.3.1 coverage) all pass.

The next mission can be a **v1.3.1 Patch Release Preparation Pass**.

---

## 2. Scope

P3 polish only. The three items from the v1.3.0 real-repo trial:

- **P3-1** — doctor output had two distinct "confidence" labels
  with overlapping wording (one about adapter-selection
  confidence, one about topology coverage signal).
- **P3-2** — the `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE` `defaultFix`
  text did not call out the `pnpm-lock.yaml`-without-
  `pnpm-workspace.yaml` edge case, which led real-repo trial
  users to wonder why their pnpm repo wasn't being detected as a
  pnpm workspace.
- **MICRO_DELTA** — `data.adapter.metadata.pnpm.packageManagerVersion`
  was emitted from only two of the four pnpm metadata code paths,
  and where emitted carried the raw `packageManager` hint string
  (`"pnpm@9.0.0"`) rather than a parsed version.

Out of scope (explicitly NOT implemented in this pass):

- Yarn PnP adapter (`@arch-engine/adapter-yarn-pnp`).
- AGP emitter.
- Any new CLI flag, command, or error code.
- JSON v1 changes.
- JSON v2 default flip.
- Adapter selection behavior changes.
- `graphSurfaceHash` changes.
- pnpm topology extraction semantics changes.
- npm publish, git tag, or version bump.

---

## 3. Trial Findings Addressed

| Finding | Source line in trial report | Status |
| --- | --- | --- |
| P3-1: Two overlapping "confidence" labels in doctor human output | `audits/ARCH_ENGINE_V1_3_0_REAL_REPO_ADAPTER_TRIAL.md` §8 P3-1 | **Fixed** — disambiguated to "Adapter selected: … (X adapter confidence)" and "Topology signal: …". |
| P3-2: `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE` `defaultFix` does not document the pnpm-lock-without-pnpm-workspace edge case | `audits/ARCH_ENGINE_V1_3_0_REAL_REPO_ADAPTER_TRIAL.md` §8 P3-2 | **Fixed** — `defaultFix` now explicitly addresses pnpm-workspace.yaml, pnpm-lock.yaml alone, npm/yarn `workspaces` field, and single-package informational case. |
| MICRO_DELTA: `data.adapter.metadata.pnpm.packageManagerVersion` not always serialised, sometimes raw hint string | `audits/ARCH_ENGINE_V1_3_0_REAL_REPO_ADAPTER_TRIAL.md` §8 MICRO_DELTA | **Fixed** — all four pnpm `metadata.pnpm` code paths now emit the field. The value is the bare version string when the root `package.json#packageManager` identifies pnpm (e.g. `"9.0.0"`), otherwise `null`. |

---

## 4. Doctor Confidence Label Fix

### Before (v1.3.0)

```
✔ Workspace type resolved as: yarn-npm (highest confidence)
✔ Adapter: @arch-engine/adapter-monorepo (HIGH confidence)
✔ Packages detected: 13 / 13 expected
…
✔ Confidence: HIGH (Structured yarn-npm workspace extraction)
```

Real-repo trial finding: in single-package fallback cases, the
two lines read as a contradiction —
`⚠ Adapter: @arch-engine/adapter-monorepo (LOW confidence)`
followed by
`✔ Confidence: HIGH (Structured single workspace extraction)`.
Both lines are technically correct (one is about *adapter
selection* confidence; the other is about *topology coverage*
signal), but the shared word "Confidence" makes them look like
they disagree.

### After (v1.3.1)

```
✔ Workspace type resolved as: yarn-npm (highest confidence)
✔ Adapter selected: @arch-engine/adapter-monorepo (HIGH adapter confidence)
✔ Packages detected: 13 / 13 expected
…
✔ Topology signal: HIGH (Structured yarn-npm workspace extraction)
```

For pnpm fixtures:

```
✔ Adapter selected: @arch-engine/adapter-pnpm (HIGH adapter confidence)
✔ Topology signal: HIGH (Structured pnpm workspace extraction)
```

### File touched

- [`packages/cli/src/commands/doctor.ts`](../packages/cli/src/commands/doctor.ts):
  human render block. Two label edits. Icon, ordering, and
  --quiet semantics preserved.

### What is **not** changed

- JSON v1 output (`results` object) — same shape, same keys.
- JSON v2 envelope — same shape, same keys. The disambiguation
  is purely in the human render path.
- The `topologyConfidenceLabel` enum (`HIGH`/`MODERATE`/`LOW`/
  `VERY_LOW`) and the `confidence` enum (`HIGH`/`MEDIUM`/`LOW`/
  `NONE`) are untouched — the labels just point at clearer prose.
- `markdown` render path (`renderCliMarkdown`) — untouched.
- Color icons (`pc.green('✔')` / `pc.yellow('⚠')`) — preserved
  on both labels, including the LOW-confidence warning icon on
  the adapter line.

---

## 5. LOW_CONFIDENCE Fix Text

### Before (v1.3.0)

```text
No adapter reported HIGH or MEDIUM confidence. If the right
adapter package is available, install it (e.g. `npm install
--save-dev @arch-engine/adapter-pnpm`).
```

### After (v1.3.1)

```text
No adapter reported HIGH or MEDIUM confidence. For pnpm
workspaces, ensure `pnpm-workspace.yaml` exists at the
repository root — a `pnpm-lock.yaml` alone does not define a
pnpm workspace. For npm or yarn workspaces, ensure the root
`package.json` declares a `workspaces` field. For single-package
repositories, this warning is informational. If a more specific
adapter package is available, install it (e.g. `npm install
--save-dev @arch-engine/adapter-pnpm`).
```

### File touched

- [`packages/cli/src/error-codes.ts`](../packages/cli/src/error-codes.ts):
  `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE.defaultFix` only.

### What is **not** changed

- `code` name (still `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE`).
- `severity` (still `WARNING`).
- `exitCode` (still `0`).
- `ciBlocking` (still `false`).
- `docsHint` (still `adapters`).
- `title` (still `Workspace adapter selection used low-
  confidence fallback.`).
- No unrelated error codes were touched.
- The `ARCH_ENGINE_ERROR_CODES` array order is unchanged.
- All existing Phase E error-code metadata tests continue to
  pass.

---

## 6. packageManagerVersion Metadata

### Design

**Allowed source.** Root `package.json#packageManager` field
(already captured into `state.packageManagerHint` by the existing
`readPackageManagerHint(cwd)` function). No new I/O.

**Disallowed (unchanged invariants).** No pnpm execution. No
network. No `node_modules/` read. No `.pnpm-store/` read. No new
side effects.

**Serialisation policy.** A new pure helper
`derivePackageManagerVersion(hint: string | null): string | null`
in [`packages/adapter-pnpm/src/index.ts`](../packages/adapter-pnpm/src/index.ts):

- Returns `null` when the hint is missing or does not start with
  `pnpm@`.
- Strips the `pnpm@` prefix.
- Strips an optional Corepack `+<sha>` integrity fingerprint
  suffix (per the corepack `packageManager` spec).
- Returns the remaining version string (e.g. `"9.0.0"`), or
  `null` if the version slot is empty.

**Surface uniformity.** The field is now serialised at **all four**
locations that emit `metadata.pnpm`:

| Code path | Before | After |
| --- | --- | --- |
| `PnpmArchitectureAdapter.extractTopology()` — happy path | raw hint string (`"pnpm@9.0.0"`) | parsed version (`"9.0.0"`) |
| `PnpmArchitectureAdapter.extractTopology()` — `emptyTopology()` | raw hint string | parsed version |
| `runPnpmExtraction()` — empty-globs branch | **field absent** | parsed version or `null` |
| `runPnpmExtraction()` — happy path | **field absent** | parsed version or `null` |

The `PnpmExtractionResult` TypeScript shape was updated to declare
`packageManagerVersion: string | null` so the legacy-shape
consumer (`runner-bridge.ts`) sees the field as type-safe.

### File touched

- [`packages/adapter-pnpm/src/index.ts`](../packages/adapter-pnpm/src/index.ts):
  one new pure helper, four call-site edits, one TypeScript
  interface field declaration.

### What is **not** changed

- pnpm detection logic, confidence assignment, or workspace-kind
  classification.
- Glob expansion semantics.
- `graphSurfaceHash` for any fixture (verified — see §8).
- The `reasons[]` array contents — `pnpm-workspace.yaml present`,
  `pnpm-lock.yaml present`, `package.json#packageManager starts
  with pnpm@` continue to surface unchanged.
- The CLI bridge's `BridgeAdapterSummary.metadata.pnpm` shape —
  it inherits the new field transparently because it
  passes-through `result.adapterInfo.metadata.pnpm`.
- The monorepo adapter's `metadata` shape (it has no
  `metadata.pnpm` block).

---

## 7. Tests Added/Updated

### Updated

1. [`packages/cli/tests/adapters/adapter-pass-2b-surfaces.test.ts`](../packages/cli/tests/adapters/adapter-pass-2b-surfaces.test.ts):
   - Three existing regex assertions updated to expect the new
     `Adapter selected: … (X adapter confidence)` wording.
   - One existing assertion updated to expect `Adapter selected:`
     as the anchor between Workspace type and Packages detected.
   - One existing `--quiet` assertion updated to the new label.
   - **New test:** `confidence labels are disambiguated (adapter
     confidence vs Topology signal)` — asserts that both
     disambiguated labels appear in the doctor human output and
     that the old bare `Confidence:` label no longer appears at
     the start of a line.
   - **New test:** `pnpm fixture also surfaces disambiguated
     labels` — runs the same assertions against the
     `pnpm-basic` fixture so the pnpm path is verified.

2. [`packages/cli/tests/adapters/adapter-json-v2-metadata.test.ts`](../packages/cli/tests/adapters/adapter-json-v2-metadata.test.ts):
   - **New test:** `packageManagerVersion is null on a fixture
     without packageManager field` — asserts the key is present
     and the value is `null` on the basic fixture.
   - **New describe block:** `JSON v2 data.adapter — pnpm fixture
     with packageManager hint`:
     - `packageManagerVersion is the bare version string
       ("9.0.0")` — asserts the parsed form.
     - `packageManagerVersion remains stable across doctor /
       inspect / analyze / check` — pins cross-command
       consistency at the JSON envelope level.
     - `emitted JSON contains no absolute paths under
       data.adapter.metadata.pnpm` — defensive guard against
       absolute-path leakage.

3. [`packages/cli/tests/cli-experience-phase-e.test.ts`](../packages/cli/tests/cli-experience-phase-e.test.ts):
   - **New test:** `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE.defaultFix
     mentions pnpm-workspace.yaml edge case` — pins severity,
     exit-code, ciBlocking, and the four key wordings (pnpm-
     workspace.yaml, pnpm-lock.yaml, single-package/informational,
     workspaces field).

4. [`packages/adapter-pnpm/tests/pnpm-adapter.test.ts`](../packages/adapter-pnpm/tests/pnpm-adapter.test.ts):
   - **New describe block:** `packageManagerVersion serialisation
     (v1.3.1 micro-delta)` — six tests covering:
     - `runPnpmExtraction` emits `null` on a fixture without
       `packageManager`.
     - `runPnpmExtraction` emits `"9.0.0"` on the protocol fixture.
     - `extractTopology()` emits the parsed version under
       `adapterMetadata.pnpm`.
     - `extractTopology()` emits `null` when packageManager is
       absent.
     - The degraded `empty-globs` fixture path still serialises
       the field consistently.
     - Repeated extractions on the same fixture yield byte-
       identical `adapterMetadata`.

### Not weakened

All previously-passing tests continue to pass. No test was
relaxed, deleted, or `skip`-ed.

---

## 8. Validation Results

### Build

```
npm install   → up to date in ~0.5s
npm run build → all 17 workspace packages build cleanly
```

### Typecheck

```
npm run typecheck → exit 0 (all 8 tsconfig projects)
```

### Test suite

```
npm test → 670 test files passed, 2300 tests passed, 0 failed
```

Focused adapter run:

```
npx vitest run packages/cli/tests/adapters packages/adapter-pnpm/tests
→ 8 test files passed, 108 tests passed
```

Includes:
- 6 new v1.3.1 pnpm metadata tests.
- 2 new v1.3.1 doctor disambiguation tests.
- 3 updated existing doctor adapter-line tests.
- 4 new v1.3.1 JSON v2 metadata tests.
- 1 new v1.3.1 error-code metadata test.

Freeze suite:

```
npx vitest run packages/core/tests/freeze → 162 test files, 357 tests passed
```

### Pack dry-run

```
npm pack --dry-run                        → arch-engine-1.0.0.tgz, 87 files, 589.9 kB
npm pack --dry-run --workspaces           → all workspace packages pack cleanly
npm pack --dry-run -w packages/cli
  → @arch-engine/cli@1.3.0,           36.4 kB, 18 files  (version unchanged)
npm pack --dry-run -w packages/adapter-pnpm
  → @arch-engine/adapter-pnpm@0.1.0,  12.2 kB,  8 files  (version unchanged)
```

### Smoke verification

`node packages/cli/dist/bin.js doctor` from the repo root:

```
✔ Workspace type resolved as: yarn-npm (highest confidence)
✔ Adapter selected: @arch-engine/adapter-monorepo (HIGH adapter confidence)
✔ Packages detected: 13 / 13 expected
✔ Connected nodes: 13
✔ Coverage: 100%
✔ Connectivity: 100%
✔ Topology signal: HIGH (Structured yarn-npm workspace extraction)
✔ Authority crossings observed: 0
…
```

`node packages/cli/dist/bin.js doctor` from `packages/cli/tests/fixtures/adapters/pnpm-basic`:

```
✔ Workspace type resolved as: pnpm (highest confidence)
✔ Adapter selected: @arch-engine/adapter-pnpm (HIGH adapter confidence)
✔ Packages detected: 3 / 3 expected
…
✔ Topology signal: HIGH (Structured pnpm workspace extraction)
```

`node packages/cli/dist/bin.js inspect --json --json-schema=v2`
on the `pnpm-workspace-protocol` fixture, slicing
`data.adapter.metadata.pnpm`:

```json
{
  "catalogsDetected": false,
  "excludedGlobs": [],
  "lockfilePresent": true,
  "matchedGlobs": ["apps/api", "packages/lib"],
  "packageManagerVersion": "9.0.0",
  "workspaceFile": "pnpm-workspace.yaml"
}
```

Same command on the `pnpm-basic` fixture (no `packageManager`):

```json
{
  "catalogsDetected": false,
  "excludedGlobs": [],
  "lockfilePresent": false,
  "matchedGlobs": ["apps/api", "apps/web", "packages/shared"],
  "packageManagerVersion": null,
  "workspaceFile": "pnpm-workspace.yaml"
}
```

JSON v2 envelope keys remain alphabetised, deterministic, and
the `data.adapter.metadata.pnpm` shape is identical across
`doctor`, `inspect`, `analyze`, and `check` (verified by the new
cross-command consistency test).

All smoke invocations exited 0.

---

## 9. Compatibility Statement

| Surface | v1.3.0 | v1.3.1 patch | Compatibility |
| --- | --- | --- | --- |
| JSON v1 default `--json` envelope | flat object | flat object, same keys | **unchanged (byte-identical)** |
| JSON v2 envelope top-level keys | `archEngineVersion, artifacts, command, data, diagnostics, emittedAt, exitCode, nextActions, schemaVersion, status, summary` | same | **unchanged** |
| `data.adapter` block shape | `name, version, packageManager, workspaceKind, confidence, reasons, warnings, alsoDetected, metadata` | same | **unchanged** |
| `data.adapter.metadata.pnpm` keys | `workspaceFile, lockfilePresent, catalogsDetected, excludedGlobs, matchedGlobs[, packageManagerVersion]` (sometimes absent or raw hint) | `workspaceFile, packageManagerVersion, lockfilePresent, catalogsDetected, excludedGlobs, matchedGlobs` (always present; parsed version or `null`) | **deterministic value & always-present** (the only delta) |
| Adapter selection wiring | precedence 2 → pnpm, 4 → monorepo, cache-hint protocol | same | **unchanged** |
| `graphSurfaceHash` per fixture | byte-stable | byte-stable, identical to v1.3.0 | **unchanged** |
| Exit codes | 0/1/2/3/5 per spec §5 | same | **unchanged** |
| `ARCH_ENGINE_*` code vocabulary | 22 codes | 22 codes (no new codes) | **unchanged** |
| `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE` `defaultFix` text | short | expanded with edge-case guidance | **patch-safe wording change** (severity/exitCode/ciBlocking unchanged) |
| Doctor human render labels | "Adapter: …" / "Confidence: …" | "Adapter selected: …" / "Topology signal: …" | **human-render polish** (no programmatic shape change) |
| CLI flags / commands | as in v1.3.0 | same | **unchanged** (no new flags/commands) |
| AGP dependency | not present | not present | **unchanged** |
| Package versions | `@arch-engine/cli@1.3.0`, `@arch-engine/adapter-pnpm@0.1.0`, others at v1.3.0 | unchanged | **no bump** |
| Published artifacts | published v1.3.0 to npm | unchanged | **no publish performed in this pass** |
| Git tags | `arch-engine-v1.3.0`, `adapter-pnpm-v0.1.0` | unchanged | **no tag created in this pass** |

The patch is consumer-safe: any consumer reading
`data.adapter.metadata.pnpm.packageManagerVersion` and expecting
the raw `pnpm@x.y.z` form would have observed undefined behavior
in v1.3.0 (sometimes raw, sometimes absent), so no consumer has
a well-defined dependency on the old behavior. The new contract
(always present; parsed version or `null`) is the deterministic
shape implied by the spec but not previously enforced.

---

## 10. Remaining Deltas

None. The three v1.3.0 trial findings (P3-1, P3-2, MICRO_DELTA)
are all addressed and tested. No new deltas surfaced during this
pass.

The trial's recommended-next-mission candidates remain unchanged:

- `ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_MVP` — Yarn PnP adapter
  (explicitly NOT implemented in this pass per mission scope).
- pnpm Adapter Hardening Pass — `catalog:` resolution and deeper
  `pnpm-lock.yaml` parsing (deferred).
- Monorepo Adapter Hardening Pass — root-inclusion asymmetry
  (deferred; already pinned by parity test).

---

## 11. Recommended Next Mission

**`ARCH_ENGINE_V1_3_1_PATCH_RELEASE_PREPARATION_PASS`**

Justification:

- The three trial findings are addressed in source and verified
  by tests.
- All compatibility constraints listed in §9 are honored, so the
  patch is safe to publish under the v1.3.1 patch-release
  contract.
- A separate release-preparation pass is appropriate because
  this mission was explicitly scoped to implementation only:
  no version bump, no tag, no publish. The release-prep pass
  should:
  - bump `@arch-engine/cli` to `1.3.1`,
  - bump `@arch-engine/core`, `@arch-engine/schema`,
    `@arch-engine/adapter-monorepo` to `1.3.1` if their
    package version is part of the CLI's release set,
  - leave `@arch-engine/adapter-pnpm` at `0.1.0` (no public
    surface change; metadata determinism is additive — only
    runtime consumers reading the legacy adapter shape would
    notice, and only positively),
  - update changelog / release notes referencing the three trial
    findings,
  - re-run preflight checks (build, typecheck, test, pack),
  - tag `arch-engine-v1.3.1`,
  - and publish.

If the team prefers to defer publishing and accumulate more
items, the alternative is to leave this patch on `main` and pair
it with the next mission (e.g. `Yarn PnP MVP`) before cutting
v1.4.0.

---

## 12. Commands Run

```bash
git status --short
git restore .arch-engine/stability-score.json
git restore packages/cli/tests/fixtures/adapters/pnpm-basic/.arch-engine/stability-score.json
git add audits/ARCH_ENGINE_V1_3_0_REAL_REPO_ADAPTER_TRIAL.md
git commit -m "docs(audit): add v1.3.0 real repo adapter trial"

npm install
npm run build
npm run typecheck
npm test
npx vitest run packages/cli/tests/adapters packages/adapter-pnpm/tests --reporter=verbose
npx vitest run packages/core/tests/freeze --reporter=default
npm pack --dry-run
npm pack --dry-run --workspaces
npm pack --dry-run -w packages/cli -w packages/adapter-pnpm

node packages/cli/dist/bin.js doctor
node packages/cli/dist/bin.js doctor --json --json-schema=v2
node packages/cli/dist/bin.js inspect --json --json-schema=v2
node packages/cli/dist/bin.js check --json --json-schema=v2
(cd packages/cli/tests/fixtures/adapters/pnpm-basic            && node …/bin.js doctor)
(cd packages/cli/tests/fixtures/adapters/pnpm-workspace-protocol && node …/bin.js doctor)
```

No `npm publish` was run. No `git tag` was created. No package
version was bumped.

---

*End of v1.3.1 Adapter Trust Polish Audit.*
