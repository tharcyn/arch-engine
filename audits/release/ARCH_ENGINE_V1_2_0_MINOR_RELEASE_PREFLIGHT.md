# Arch-Engine v1.2.0 Minor Release Preflight

**Audit date:** 2026-05-11
**Auditor:** Claude Opus 4.7 (1M context), release-prep pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**HEAD prior to release-prep commit:** `7ce44c7 docs(cli): add baseline comparison specification`
**Predecessor preflight:** [`audits/release/ARCH_ENGINE_V1_1_0_MINOR_RELEASE_PREFLIGHT.md`](./ARCH_ENGINE_V1_1_0_MINOR_RELEASE_PREFLIGHT.md)

**Predecessor implementation audits:**
- [`audits/ARCH_ENGINE_BASELINE_COMPARISON_IMPLEMENTATION_AUDIT.md`](../ARCH_ENGINE_BASELINE_COMPARISON_IMPLEMENTATION_AUDIT.md)
- [`audits/ARCH_ENGINE_BASELINE_COMPARISON_SPECIFICATION_AUDIT.md`](../ARCH_ENGINE_BASELINE_COMPARISON_SPECIFICATION_AUDIT.md)
- [`audits/ARCH_ENGINE_GITHUB_ACTIONS_PR_DEMO_AUDIT.md`](../ARCH_ENGINE_GITHUB_ACTIONS_PR_DEMO_AUDIT.md)
- [`audits/ARCH_ENGINE_JSON_V2_CI_FLAGS_IMPLEMENTATION_AUDIT.md`](../ARCH_ENGINE_JSON_V2_CI_FLAGS_IMPLEMENTATION_AUDIT.md)

---

## 1. Executive Verdict

**`V1_2_0_RELEASE_READY_WITH_HUMAN_NPM_PREFLIGHT`**

All seven public packages are bumped to `1.2.0`. Internal cross-deps
align to `^1.2.0`. The full validation matrix is green: build,
typecheck, **2168 / 2168 tests** pass (662 / 662 files), freeze tests
**357 / 357** pass without snapshot updates, and `npm pack --dry-run`
succeeds for each of the seven public packages. A local public-style
install smoke — pack tarballs into a tempdir, install into fresh
consumer projects, run the v1.2.0 baseline-comparison surface
end-to-end — completes cleanly: `--version` reports
`arch-engine/1.2.0`; `--help` advertises the new `--baseline <path>`
flag; JSON v1 remains the default and byte-identical to v1.1.0; JSON
v2 emits `data.topology.canonical` unconditionally on inspect/
analyze/check; baseline comparison via `--baseline arch-engine-baseline.json`
correctly populates `data.drift`, `summary.drift`, markdown
`## Architecture Drift` sections, and human drift blocks; invalid
baselines exit 2 with structured `ARCH_ENGINE_BASELINE_*` diagnostics;
demo-drift `check` exits 1 across every output mode. No public API
was widened. No `@arch-governance/*` dependency was added. No npm
publish was performed. The remaining preflight step is human-side:
the seven `npm publish --access public` invocations in dependency
order documented in §13.

---

## 2. Scope

Strict v1.2.0 minor release. **Baseline comparison surface only.**

- One new public flag: `--baseline <path>`.
- Canonical topology emitted unconditionally in `inspect`,
  `analyze`, `check` JSON v2 outputs (additive).
- `data.drift` and `summary.drift` emitted conditionally on
  `check`/`analyze` v2 when `--baseline` is set.
- `## Architecture Drift` markdown section and human drift block.
- Five new error codes (additive vocabulary growth).
- 82 new Phase G tests.
- No new commands.
- No breaking changes.
- No JSON v1 changes (default output byte-identical to v1.1.0).
- No `@arch-governance/runtime` or
  `@arch-governance/architecture-profile` dependency.
- No GitHub Actions baseline workflow templates (deferred to a
  separate demo pass per spec §15).
- No `--fail-on-drift`, `--drift-mode`, `--baseline-label`,
  `--current-label` (all deferred per spec §7.4).
- No version higher than `1.2.0`.
- No tests loosened beyond the one Phase E "11-code prefix
  preserved" loosen documented in the implementation audit.

This pass touches `package.json` files (7 public packages),
`package-lock.json`, `CHANGELOG.md`, this preflight, and the
v1.2.0 source / test files described in the implementation audit.

---

## 3. Packages Included

| Package | Old | New | Internal deps after bump | Publish status |
| --- | --- | --- | --- | --- |
| `@arch-engine/schema` | 1.1.0 | 1.2.0 | — | not yet published |
| `@arch-engine/core` | 1.1.0 | 1.2.0 | `@arch-engine/schema@^1.2.0` | not yet published |
| `@arch-engine/adapter-monorepo` | 1.1.0 | 1.2.0 | `@arch-engine/core@^1.2.0` | not yet published |
| `@arch-engine/governance-pack-authority` | 1.1.0 | 1.2.0 | `@arch-engine/core@^1.2.0` | not yet published |
| `@arch-engine/governance-pack-rest-contract` | 1.1.0 | 1.2.0 | `@arch-engine/core@^1.2.0` | not yet published |
| `@arch-engine/governance-pack-journey` | 1.1.0 | 1.2.0 | `@arch-engine/core@^1.2.0` | not yet published |
| `@arch-engine/cli` | 1.1.0 | 1.2.0 | `@arch-engine/core@^1.2.0`, `@arch-engine/schema@^1.2.0`, peer `@arch-engine/adapter-monorepo@^1.2.0` (optional) | not yet published |

The root private package (`arch-engine@1.0.0`) is **not** bumped —
it is a workspace orchestrator and not published. The private `sdk`
package keeps `workspace:*` references.

---

## 4. Changes Included

### 4.1 New public CLI flag

| Flag | Type | Default | Behavior |
| --- | --- | --- | --- |
| `--baseline <path>` | string | unset | Compare current run against a prior JSON v2 envelope file. Valid only on `check` and `analyze`. Invalid path / wrong schema / wrong command → exit 2 with structured `ARCH_ENGINE_BASELINE_*` diagnostic. |

### 4.2 New internal CLI modules

| File | Lines | Purpose |
| --- | --- | --- |
| `packages/cli/src/canonical-topology.ts` | 219 | Deterministic canonical topology builder. Sorted nodes/edges with stable `e_<8-hex>` ids; sha256 graphSurfaceHash. |
| `packages/cli/src/baseline-reader.ts` | 365 | Strict 7-step JSON v2 baseline validator. Returns typed result or throws `BaselineReadError` carrying a structured diagnostic. |
| `packages/cli/src/drift.ts` | 411 | Pure `(baseline, current) → DriftResult` engine across three axes (topology / policy / signal). |

None are part of `@arch-engine/cli`'s public exports.

### 4.3 Modified files

`packages/cli/src/error-codes.ts`, `cli-options.ts`, `cli.ts`,
`commands/{doctor,inspect,analyze,check,explain}.ts`,
`render-v2.ts`, `render-markdown.ts`, `tsconfig.json`. See
implementation audit §3.2.

### 4.4 New JSON v2 fields

- `data.topology.canonical` — always emitted by inspect/analyze/
  check v2 outputs (additive).
- `data.drift` — emitted only when `--baseline` is set on
  check/analyze v2 outputs.
- `summary.drift` — top-line counter mirror; same condition.
- `summary.headline` — gains `(drift: ...)` parenthetical when drift
  is non-zero.

### 4.5 New error codes

Five additions to the `ARCH_ENGINE_*` vocabulary (now 16 total):
`ARCH_ENGINE_BASELINE_NOT_FOUND`, `…_INVALID`,
`…_UNSUPPORTED_SCHEMA`, `…_COMMAND_MISMATCH`,
`ARCH_ENGINE_DRIFT_DETECTED`. v1.0.3 11-code floor preserved in
order.

### 4.6 Tests

82 new Phase G tests across four files
(`cli-experience-phase-g-{baseline-reader, drift,
json-v2-baseline, drift-output}.test.ts`). All Phase A–F suites
preserved unchanged modulo one documented Phase E loosen.

### 4.7 Docs / audits

- `docs/cli/baseline-comparison-spec.md` (committed at
  `7ce44c7`).
- `audits/ARCH_ENGINE_BASELINE_COMPARISON_SPECIFICATION_AUDIT.md`
  (committed at `7ce44c7`).
- `audits/ARCH_ENGINE_BASELINE_COMPARISON_IMPLEMENTATION_AUDIT.md`
  (this pass).
- `audits/release/ARCH_ENGINE_V1_2_0_MINOR_RELEASE_PREFLIGHT.md`
  (this file).
- `CHANGELOG.md` v1.2.0 entry.

---

## 5. Minor Release Justification

This release is `1.2.0`, not `1.1.x`, because:

1. **New public flag.** `--baseline <path>` joins the global option
   surface. Adding public flags is a feature addition.
2. **New JSON v2 data surface.** `data.topology.canonical` becomes
   part of the public v2 envelope unconditionally;
   `data.drift` / `summary.drift` become available conditionally.
3. **New baseline-comparison contract.** Cross-run drift detection
   is a new product surface that consumers can rely on going
   forward.
4. **New drift-reporting behavior.** Markdown and human outputs
   gain new sections.
5. **No breaking change.** Every default identical to v1.1.0
   byte-for-byte when `--baseline` is not used. JSON v1 default
   unchanged. The 11 v1.0.3 error codes preserved in order.

Patch-release-safe additions (per spec §13.1 of
`cli-experience-spec.md`) explicitly exclude new flags. Minor bump
required.

---

## 6. JSON Compatibility

- ✅ JSON v1 default output unchanged. Verified by Phase A/E/F
  backward-compat tests plus an explicit Phase G regression:
  `check --json` has no `data` envelope and no `canonical` key.
- ✅ JSON v2 remains opt-in via `--json-schema=v2`.
- ✅ `data.topology.canonical` lives in v2 only; never in v1.
- ✅ `data.drift` lives in v2 only; never in v1.
- ✅ No v1 keys removed or renamed; all v1.1.0 v2 keys preserved
  verbatim with the same value types.
- ✅ `schemaVersion` remains exactly `"arch-engine.cli.v2"`.
- ✅ Status enum unchanged (drift never alters status mapping).
- ✅ Path-leakage policy preserved: baseline `path` and other
  `data.*` paths use basename / repo-relative POSIX by default;
  absolute paths only with `--verbose`.

---

## 7. Exit Behavior

Strict extension of v1.0.3 / v1.1.0; drift never alters exit code:

| Condition | Exit | Status |
| --- | --- | --- |
| Baseline file invalid (any §8 reason) | 2 | `error` |
| `--baseline` on unsupported command | 2 | `error` (`ARCH_ENGINE_INVALID_CONFIG`) |
| Adapter / extraction failure | 3 | `error` |
| Internal invariant failure | 5 | `internal_error` |
| Current run has blocking violations (regardless of drift) | 1 | `blocked` |
| Current pass + drift only | 0 | `passed` or `not_enforced` |
| No policy + baseline | 0 | `not_enforced` |
| `analyze --baseline` | 0 | (analyze never blocks) |

`ARCH_ENGINE_DRIFT_DETECTED` is INFO-severity / exit 0 — surfaces
drift in `diagnostics[]` without blocking. Verified by Phase G
subprocess tests.

---

## 8. Public API / Command Surface Compatibility

- ✅ **Same five commands.** `doctor`, `inspect`, `analyze`,
  `check`, `explain <target>`. No additions, no removals, no
  renames.
- ✅ **One new flag added.** `--baseline <path>` (per §4.1).
- ✅ **No public export widening.**
  `packages/cli/package.json#exports` is exactly
  `{ ".": "./dist/bin.js" }`. The three new internal modules ship
  inside the ESM bundle but are not importable.
- ✅ **Freeze tests pass** at **357 / 357** with no snapshot
  updates.
- ✅ **No AGP dependencies.** `grep "@arch-governance/runtime\|@arch-governance/architecture-profile"`
  on every published `package.json` returns nothing.

---

## 9. Validation Results

| Command | Result |
| --- | --- |
| `npm install` | ✅ clean (lockfile updated; all 7 published packages at `1.2.0`) |
| `npm run build` | ✅ all packages build |
| `npm run typecheck` | ✅ all 7 tsconfigs clean |
| `npm test` | ✅ **2168 / 2168 tests** across **662 / 662 files** |
| Freeze tests | ✅ **357 / 357** in `packages/core/tests/freeze` (no snapshot updates) |
| `npm pack --dry-run --workspace @arch-engine/cli` (post-bump) | ✅ — filled in §10 |

---

## 10. Package Pack Dry-Run Results

(Each public package packed individually with `npm --workspace …
pack --dry-run` after the version bump.)

| Package | Tarball | Files | Package size | Unpacked size |
| --- | --- | --- | --- | --- |
| `@arch-engine/schema` | `arch-engine-schema-1.2.0.tgz` | 15 | 8.8 kB | 47.1 kB |
| `@arch-engine/core` | `arch-engine-core-1.2.0.tgz` | 23 | 515.7 kB | 2.6 MB |
| `@arch-engine/adapter-monorepo` | `arch-engine-adapter-monorepo-1.2.0.tgz` | 5 | 3.4 kB | 8.7 kB |
| `@arch-engine/governance-pack-authority` | `arch-engine-governance-pack-authority-1.2.0.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/governance-pack-rest-contract` | `arch-engine-governance-pack-rest-contract-1.2.0.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/governance-pack-journey` | `arch-engine-governance-pack-journey-1.2.0.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/cli` | `arch-engine-cli-1.2.0.tgz` | **19** | **33.0 kB** | **154.1 kB** |

The `@arch-engine/cli` tarball grows by +7.5 kB / +2 files from
v1.1.0 (17 → 19 files, 25.5 kB → 33.0 kB packed; 112.5 kB →
154.1 kB unpacked) because the three new internal modules
(`canonical-topology.ts`, `baseline-reader.ts`, `drift.ts`)
contribute chunked ESM. All other tarballs are byte-identical in
file count and size to their v1.1.0 baselines (the v1.2.0 source
change is entirely in the CLI workspace).

---

## 11. Local Public-Style Install Smoke

The smoke packs all seven public packages into local `.tgz` files,
installs them into a fresh tempdir consumer project, and exercises
the v1.2.0 baseline-comparison surface end-to-end. Captured in
Phase 9.

| Step | Result |
| --- | --- |
| `arch-engine --version` | ✅ `arch-engine/1.2.0 darwin-arm64 node-v25.2.1` |
| `arch-engine --help` | ✅ lists `--baseline <path>` |
| `check --json --json-schema=v2` | ✅ `data.topology.canonical` present (nodes / edges / graphSurfaceHash) |
| `analyze --json --json-schema=v2` | ✅ canonical present |
| `inspect --json --json-schema=v2` | ✅ canonical present |
| Generate baseline + `check --baseline baseline.json` | ✅ human drift block present; exit 0 |
| `check --baseline baseline.json --json --json-schema=v2` | ✅ `data.drift` present; `summary.drift` mirror; same-source → all counters zero |
| `analyze --baseline baseline.json --json --json-schema=v2` | ✅ `data.drift` present; `command: analyze`; exit 0 |
| `check --baseline baseline.json --format markdown` | ✅ `## Architecture Drift` section; `_No architectural drift detected._` for same-source |
| Invalid baseline (non-existent path) | ✅ exit 2 with `ARCH_ENGINE_BASELINE_NOT_FOUND` |
| Cross-fixture compare (sample → demo-drift) | ✅ exit 1 (current blocking violation); `data.drift.summary` shows `newViolations: 1`, `addedEdges: 3`, `removedEdges: 2`, `graphSurfaceHashChanged: true` |
| `check` (demo-drift, no baseline) | ✅ exit 1 (v1.1.0 contract preserved) |

JSON v1 backward-compat smoke: `check --json` produces flat shape
with no `data` envelope and no `canonical` key. Verified.

Tempdirs cleaned at end of smoke.

---

## 12. npm Registry Preflight

| Check | Result |
| --- | --- |
| `npm whoami` | `tharcyn` |
| `@arch-engine/schema` versions | `…, 1.0.3, 1.1.0` (no 1.2.0) |
| `@arch-engine/core` versions | `…, 1.0.3, 1.1.0` (no 1.2.0) |
| `@arch-engine/adapter-monorepo` versions | `…, 1.0.3, 1.1.0` (no 1.2.0) |
| `@arch-engine/governance-pack-authority` versions | `…, 1.0.3, 1.1.0` (no 1.2.0) |
| `@arch-engine/governance-pack-rest-contract` versions | `…, 1.0.3, 1.1.0` (no 1.2.0) |
| `@arch-engine/governance-pack-journey` versions | `…, 1.0.3, 1.1.0` (no 1.2.0) |
| `@arch-engine/cli` versions | `…, 1.0.3, 1.1.0` (no 1.2.0) |

**1.2.0 is not yet published for any of the seven packages.** Safe
to proceed.

---

## 13. Manual Publish Order

After human review of this preflight, run the following commands
**in this exact order** from the repo root. Each command waits for
the previous one to complete (npm registry consistency):

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

## 14. Post-Publish Verification Commands

After all seven publishes succeed, run from any clean directory:

```bash
npm view @arch-engine/schema@1.2.0 version
npm view @arch-engine/core@1.2.0 version
npm view @arch-engine/adapter-monorepo@1.2.0 version
npm view @arch-engine/governance-pack-authority@1.2.0 version
npm view @arch-engine/governance-pack-rest-contract@1.2.0 version
npm view @arch-engine/governance-pack-journey@1.2.0 version
npm view @arch-engine/cli@1.2.0 version
```

Each must print `1.2.0`.

Then a fresh public-registry install smoke from a tempdir:

```bash
cd "$(mktemp -d -t arch-1.2.0-XXX)"
npm init -y
npm install --save-dev @arch-engine/cli@1.2.0 @arch-engine/adapter-monorepo@1.2.0
npx arch-engine --version              # expect: arch-engine/1.2.0 ...
npx arch-engine --help | grep baseline # expect: --baseline <path> line

# Round-trip baseline + drift smoke:
npx arch-engine check --json --json-schema=v2 --output baseline.json
npx arch-engine check --baseline baseline.json --json --json-schema=v2 | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log('schemaVersion:',o.schemaVersion);console.log('data.topology.canonical present:',!!o.data.topology.canonical);console.log('data.drift present:',!!o.data.drift);})"
# expect: arch-engine.cli.v2, true, true
```

---

## 15. Git Tag Commands (do not run yet)

After publish + verification both succeed, the human operator can
create the v1.2.0 git tag:

```bash
# from main branch with the release-prep commit on HEAD
git tag arch-engine-v1.2.0
git push origin main --tags
```

Do **not** run these as part of this preflight pass.

---

## 16. Remaining Deltas

| Delta | Severity | Notes |
| --- | --- | --- |
| Baseline reader's strict `archEngineVersion >= 1.2.0` floor was relaxed to "canonical topology present" | MICRO_DELTA | Implementation pass §6 documented this. Once v1.2.0 publishes, baselines generated by v1.2.0 will carry `archEngineVersion: "1.2.0"` and the spec floor effectively snaps into place. The real product gate (canonical topology presence) is unchanged. |
| `--ci` does not strip wall-clock timing footer from human output | LOW | Pre-existing from v1.1.0; carried forward. CI consumers parse exit codes. |
| Markdown size cap (250 KB), violation cap (50), diagnostics cap (25), drift table cap (25) are hardcoded | MICRO_DELTA | Carried over from v1.1.0; configurability deferred. |
| GitHub Actions baseline workflow templates not shipped this pass | MICRO_DELTA | Out of v1.2.0 scope per spec §15; framed as the natural next demo pass (§18 below). |
| Pre-existing untracked tarballs at repo root | LOW | Carried over from prior passes; gitignored; will not be staged. |
| 1 moderate-severity `npm audit` finding | LOW | Pre-existing; not introduced by this pass. |

No BLOCKER or HIGH deltas.

---

## 17. Final Gate Decision

**`ARCH_ENGINE_V1_2_0_READY_FOR_HUMAN_NPM_PUBLISH`**

The repo is ready for the human operator to:
1. Run the seven `npm publish` commands in §13 in order.
2. Run the verification commands in §14.
3. Create and push the v1.2.0 tag per §15.

---

## 18. Recommended Next Mission

**GitHub Actions Baseline Workflow Demo Pass.**

Rationale: v1.2.0 just shipped the file-based baseline contract. The
highest-leverage demonstration is a deterministic pair of GitHub
Actions workflow templates under
`examples/github-actions/`:

- `arch-engine-pr-baseline-report.yml` — downloads the `main`
  baseline artifact (or caches it), runs `check --ci --baseline ...
  --format markdown --output report.md`, uploads the drift-aware
  report.
- `arch-engine-pr-baseline-comment.yml` — same plus sticky PR
  comment.

This naturally extends the existing v1.1.0 PR-report/PR-comment
templates and turns "what changed in this PR" into a visible
comment-level surface. Mirrors the spec §15 framing exactly.

**Alternatives** (if priorities shift):

- **Private AGP Emitter MVP Implementation Pass** — opens the AGP
  track. Better choice if a near-term AGP adopter is waiting.
- **CLI v1.2.x Baseline Hardening Pass** — tightens the version
  floor when baselines are produced by v1.2.0+, plus the deferred
  `--fail-on-drift`, `--baseline-label`, `--current-label`,
  `--drift-mode` flags. Smaller scope; defer unless real user
  demand surfaces.

Default to the **GitHub Actions Baseline Workflow Demo Pass** as
the immediate follow-on — it completes the "baseline → PR comment"
product loop that the v1.2.0 implementation pass set up.

*End of preflight.*
