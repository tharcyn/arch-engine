# Arch-Engine v1.0.2 Patch Release Preflight

**Audit date:** 2026-05-07
**Auditor:** Claude Opus 4.7 (1M context), release-prep pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**HEAD prior to release-prep commit:** `c4d2b61 feat(cli): improve first-run experience and help output`
**Predecessor preflight:** [audits/release/ARCH_ENGINE_V1_0_1_PATCH_RELEASE_PREFLIGHT.md](./ARCH_ENGINE_V1_0_1_PATCH_RELEASE_PREFLIGHT.md)
**Predecessor implementation audits:**
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_A_IMPLEMENTATION_AUDIT.md](../ARCH_ENGINE_CLI_EXPERIENCE_PHASE_A_IMPLEMENTATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md](../ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_C_DEMO_OUTPUT_CALIBRATION_AUDIT.md](../ARCH_ENGINE_CLI_EXPERIENCE_PHASE_C_DEMO_OUTPUT_CALIBRATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_EXIT_CODE_REPAIR_AUDIT.md](../ARCH_ENGINE_CLI_EXPERIENCE_EXIT_CODE_REPAIR_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_V1_0_2_PRE_RELEASE_DOC_CLEANUP_AUDIT.md](../ARCH_ENGINE_CLI_V1_0_2_PRE_RELEASE_DOC_CLEANUP_AUDIT.md)

---

## 1. Executive Verdict

**`V1_0_2_RELEASE_READY_WITH_HUMAN_NPM_PREFLIGHT`**

All seven public packages are bumped to `1.0.2`. Internal cross-deps
align to `^1.0.2`. The full validation matrix is green: build,
typecheck, **1948 / 1948 tests** pass (652 / 652 files), freeze tests
**357 / 357** pass without snapshot updates, and `npm pack --dry-run`
succeeds for the root and each of the seven public packages. A local
public-style install smoke — pack tarballs into a tempdir, install into
fresh consumer projects, run all five v1.0.x CLI verbs — completes
cleanly: `--version` reports `arch-engine/1.0.2`, the no-policy
sample-monorepo exits 0 for all five commands, and demo-drift
**`check` exits 1** with the canonical `Blocked: 1 architecture
violation.` output (Phase D-Lite migration verified end-to-end). No
public API was widened. No `@arch-governance/*` dependency was added.
No npm publish was performed. The remaining preflight step is
human-side: `npm login` and the seven `npm publish --access public`
invocations in dependency order documented in §11.

---

## 2. Scope

Strict patch release. **CLI experience polish only.**

- No new public exports, no new commands, no new flags.
- No JSON envelope redesign.
- Two backward-compatible additive JSON fields from Phase A
  (`policyConfigured`, `headlineKind`) carry over unchanged. One new
  additive field on the `arch-engine explain --json` *unknown-target*
  branch (`supportedSpecialTargets[]`).
- One **behavior change** that may require CI script updates:
  blocking architecture violations now exit `1` (was `5` for
  enforce-mode policy violations and `2` for BLOCKER authority-tier
  crossings).
- No `@arch-governance/runtime` or `@arch-governance/architecture-profile`
  dependency.
- No version higher than 1.0.2.
- No experimental package promotion.
- No tests loosened or freeze snapshots updated.

This pass touches only `package.json` files (7 public packages),
`package-lock.json`, `CHANGELOG.md`, and this preflight document. The
behavioral changes themselves were committed in `c4d2b61` (Phase A+B)
and the unstaged Phase C / D-Lite / doc-cleanup diff also included in
the release-prep commit.

---

## 3. Packages Included

| Package | Old | New | Publish status | Internal deps (after bump) |
| --- | --- | --- | --- | --- |
| `@arch-engine/schema` | 1.0.1 | **1.0.2** | published 1.0.0/1.0.1; 1.0.2 not yet | (none) |
| `@arch-engine/core` | 1.0.1 | **1.0.2** | published 1.0.0/1.0.1; 1.0.2 not yet | `@arch-engine/schema: ^1.0.2`, `yaml: ^2.8.3` |
| `@arch-engine/adapter-monorepo` | 1.0.1 | **1.0.2** | published 1.0.0/1.0.1; 1.0.2 not yet | `@arch-engine/core: ^1.0.2` |
| `@arch-engine/governance-pack-authority` | 1.0.1 | **1.0.2** | published 1.0.0/1.0.1; 1.0.2 not yet | `@arch-engine/core: ^1.0.2` |
| `@arch-engine/governance-pack-rest-contract` | 1.0.1 | **1.0.2** | published 1.0.0/1.0.1; 1.0.2 not yet | `@arch-engine/core: ^1.0.2` |
| `@arch-engine/governance-pack-journey` | 1.0.1 | **1.0.2** | published 1.0.0/1.0.1; 1.0.2 not yet | `@arch-engine/core: ^1.0.2` |
| `@arch-engine/cli` | 1.0.1 | **1.0.2** | published 1.0.0/1.0.1; 1.0.2 not yet | `@arch-engine/core: ^1.0.2`, `@arch-engine/schema: ^1.0.2`, `cac`, `cli-table3`, `picocolors`, `yaml`; peer-optional `@arch-engine/adapter-monorepo: ^1.0.2` |

Root `arch-engine` stays at 1.0.0 (`private: true`, never published).

The four private adapter workspaces (`@arch-engine/adapter-shared`,
`@arch-engine/adapter-conformance`, `@arch-engine/adapter-github`,
`@arch-engine/adapter-gitlab`) are **not** in the v1.0.2 release scope
and were not bumped.

---

## 4. Changes Included

The v1.0.2 patch ships the cumulative output of four CLI experience
phases plus a final pre-release doc cleanup:

### Phase A — Output grammar cleanup (already in c4d2b61)
- Removed command echoes from `doctor`, `inspect`, `check`, `explain`.
- Removed hardcoded `Arch Engine CLI v1.0.0` / `Schema runtime v1.0.0`
  diagnostic strings from `doctor`.
- Calibrated `analyze` and `check` so a healthy no-policy fixture is
  not labelled `Stability Score: CRITICAL`.
- Removed the `CRITICAL` + `No blocking violations` contradiction in
  `check`.
- Every command's human output ends with exactly one
  `Next:` / `Fix:` / `Exit N:` final line.

### Phase B — Help, vocabulary, demo fixture (already in c4d2b61)
- Root `arch-engine --help` now leads with the product promise *"Catch
  architecture drift before merge."*, plain-English command
  descriptions, and a `First-run path:` section.
- Per-command help has Examples + Docs URL. `check --help` documents
  the exit-code mapping. `explain --help` documents the supported
  target vocabulary.
- New `examples/demo-drift/` fixture (4-node, 3-edge topology).
- New `packages/cli/src/help-text.ts` and `policy-presence.ts` helpers
  (CLI-internal; not public exports).

### Phase C — Demo output calibration (this commit)
- `examples/demo-drift/.archengine/policy.yml` ships an enforce-mode
  policy producing a real `frontend → payments` violation.
- `arch-engine check` rendering polish: `Blocked: N architecture
  violation(s).` headline, `(blocks CI)` annotation, `Rule:`+`Severity:`
  per violation. Removed duplicated `Stability Score:` line.

### Phase D-Lite — Exit-code semantics repair (this commit)
- Blocking architecture violations migrated from exit `5` (enforce-mode
  policy) and exit `2` (BLOCKER authority-tier) to a unified exit `1`.
- `check --help` exit-code block updated to the canonical 0/1/2/3/5
  mapping.

### Pre-release doc cleanup (this commit)
- `docs/cli/cli-readiness-matrix.md` line 58 updated to the new
  exit-code documentation.

Combined test count: **+58 net new tests** since v1.0.1 (1890 → 1948).

---

## 5. Behavior Change

> **`arch-engine check` now exits `1` for blocking architecture
> violations.**

Previously (v1.0.1):

| Condition | v1.0.1 exit |
| --- | --- |
| enforce-mode policy violation (custom `.archengine/policy.yml`) | **5** |
| BLOCKER authority-tier crossing (internal heuristic) | **2** |

After v1.0.2:

| Condition | v1.0.2 exit |
| --- | --- |
| enforce-mode policy violation | **1** |
| BLOCKER authority-tier crossing | **1** |

Codes 2 and 5 are now reserved for "Invalid input or configuration"
and "Internal invariant failure" respectively, matching the CLI
Experience Specification §9.1.

**CI scripts may need updating.**

- Scripts that did `if [ $? -ne 0 ]` continue to work unchanged.
- Scripts that did `if [ $? -eq 5 ]; then BLOCK; fi` need to switch
  to `if [ $? -eq 1 ]` or simply `if [ $? -ne 0 ]`.
- Scripts that did `if [ $? -eq 2 ]; then BLOCK; fi` need the same.
- Scripts that did `if [ $? -eq 0 ]; then GREEN; fi` continue to work.

**No published v1.0.1 fixture triggers the old codes.** Only consumers
running their own `.archengine/policy.yml` in `mode: enforce` (or
hitting the rare BLOCKER authority-tier path) observe the change. The
demo-drift fixture that *does* trigger an enforce-mode violation
ships in v1.0.2, so v1.0.1 consumers had no published reproducer
before.

This change is documented under "Behavior change (CI scripts may need
updating)" in `CHANGELOG.md` v1.0.2 section.

---

## 6. Public API / Command Surface Compatibility

| Surface | Status |
| --- | --- |
| Public CLI commands (`doctor`, `inspect`, `analyze`, `check`, `explain <target>`) | unchanged |
| Public CLI flag set (`--json`, `--no-color`, `--help`, `--version`, `check --min-coverage`, `check --sync`) | unchanged |
| `cli-output-contract.json` JSON schema | unchanged |
| `@arch-engine/cli` `package.json` exports / dependencies / peer-deps | unchanged in shape (versions bumped) |
| `@arch-engine/core` public exports (the 110-symbol freeze set) | **byte-identical** — freeze tests pass without snapshot updates |
| Other public packages' surfaces | unchanged |
| Public freeze tests | **357 / 357 still pass** |
| `@arch-governance/*` dependency | not added |
| AGP emitter implementation | not added |
| Existing `--json` keys | preserved verbatim |
| New `--json` keys (additive) | `policyConfigured`, `headlineKind` (Phase A); `supportedSpecialTargets[]` on explain unknown-target (Phase B) |

---

## 7. Validation Results

| Step | Result | Notes |
| --- | --- | --- |
| `npm install` | ok | `up to date in 478ms` after bump |
| `npm run build` | **pass** | All workspaces + GitHub Action build cleanly |
| `npm run typecheck` | **pass** | All 7 public-contract packages typecheck silently |
| `npm test` | **1948 / 1948 pass; 652 / 652 files pass** | up from 1890 / 648 at v1.0.1 — net +58 new tests across Phases A/B/C/D-Lite |
| Freeze tests (`packages/core/tests/freeze`) | **357 / 357 pass** | unchanged |
| `npm pack --dry-run` (root) | **pass** | 77 files, 687.6 kB tarball |

---

## 8. Pack Dry-Run Results (per public package)

All seven public packages produce 1.0.2 tarballs cleanly:

| Package | Filename | Files | Packed | Unpacked |
| --- | --- | --- | --- | --- |
| `@arch-engine/schema` | `arch-engine-schema-1.0.2.tgz` | 15 | 8.8 kB | 47.1 kB |
| `@arch-engine/core` | `arch-engine-core-1.0.2.tgz` | 23 | 515.7 kB | 2.6 MB |
| `@arch-engine/adapter-monorepo` | `arch-engine-adapter-monorepo-1.0.2.tgz` | 5 | 3.4 kB | 8.7 kB |
| `@arch-engine/governance-pack-authority` | `arch-engine-governance-pack-authority-1.0.2.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/governance-pack-rest-contract` | `arch-engine-governance-pack-rest-contract-1.0.2.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/governance-pack-journey` | `arch-engine-governance-pack-journey-1.0.2.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/cli` | `arch-engine-cli-1.0.2.tgz` | 15 | 14.0 kB | 54.9 kB |

The CLI tarball grew slightly (was 14 files / 11.8 kB at 1.0.1) — the
help-text and policy-presence helpers added new bundled chunks via
tsup. No new top-level files; only new code chunks in `dist/`.

---

## 9. Local Public-Style Install Smoke

**Procedure:** pack all seven public packages into a `mktemp` tarball
directory; install into a fresh consumer project seeded with each of
the two repository fixtures; run all five v1.0.x CLI verbs; cleanup.

### Smoke 1 — `examples/sample-monorepo` (no policy)

```
$ npm install <7 tarballs>
→ added 20 packages in 4s

$ npx arch-engine --version
arch-engine/1.0.2 darwin-arm64 node-v25.2.1

$ npx arch-engine --help | head -3
arch-engine/1.0.2

Catch architecture drift before merge.

doctor:             exit 0
inspect:            exit 0
analyze:            exit 0
check:              exit 0
explain regression: exit 0
```

### Smoke 2 — `examples/demo-drift` (enforce-mode policy)

```
$ npm install <4 tarballs: schema, core, adapter-monorepo, cli>
→ added 17 packages in 308ms

$ npx arch-engine check
Executing policy pipeline...

No arch-engine.yml found. Using workspace autodetection mode (yarn).
  Workspace:            yarn-npm (structured)
  Confidence:           HIGH (Structured yarn-npm workspace extraction)
  Stability:            CRITICAL (0.47 / 1.00)
  Coverage:             100%
  Connectivity:         100%
  Authority cross.:     0 observed
  Policy Evaluation:    1 violations (enforce mode)

Blocked: 1 architecture violation.

  ✗ @demo-drift/frontend → @demo-drift/payments   (blocks CI)
    Rule:     frontend-must-not-touch-payment-gateway
    Severity: error

Fix: remove or re-route the offending edge(s) above, or update your policy to allow them.
Exit 1: blocking architecture violations.

→ check exit code: 1
```

The demo-drift smoke confirms the Phase D-Lite migration end-to-end:
`check` exits **1** (was 5 in v1.0.1), output ends with `Exit 1:
blocking architecture violations.`, the canonical demo screenshot
target from CLI Experience Specification §12 is reproducible
byte-for-byte.

All tempdirs cleaned up after the smoke.

---

## 10. npm Registry Preflight

```
$ npm whoami
→ E401 Unauthorized
```

The local `npm` is **not currently logged in**. Expected for prep
work. The human will need to run `npm login` (or `npm adduser`)
before the §11 publish commands.

Currently published versions (snapshot at audit time):

```
@arch-engine/schema                          1.0.0-rc.1, 1.0.0-rc.2, 1.0.0-rc.3, 1.0.0, 1.0.1
@arch-engine/core                            1.0.0-rc.1, 1.0.0-rc.2, 1.0.0-rc.3, 1.0.0, 1.0.1
@arch-engine/adapter-monorepo                                          1.0.0-rc.4, 1.0.0, 1.0.1
@arch-engine/governance-pack-authority       1.0.0-rc.1,             1.0.0-rc.4, 1.0.0, 1.0.1
@arch-engine/governance-pack-rest-contract   1.0.0-rc.1,             1.0.0-rc.3, 1.0.0-rc.4, 1.0.0, 1.0.1
@arch-engine/governance-pack-journey         1.0.0-rc.1,             1.0.0-rc.4, 1.0.0, 1.0.1
@arch-engine/cli                             1.0.0-rc.1, 1.0.0-rc.2, 1.0.0-rc.3, 1.0.0, 1.0.1
```

`1.0.2` is **not yet present** for any of the seven packages. No risk
of overwriting an existing publish.

Registry: `https://registry.npmjs.org/`. License: `MIT`. Maintainer
(per existing 1.0.1 metadata): `tharcyn <thaasyn@gmail.com>`.

---

## 11. Manual Publish Commands

Publish in dependency order (`schema → core → {adapter-monorepo,
governance-pack-*} → cli`) so each downstream resolves the just-published
upstream at install time. Run sequentially, not in parallel:

```bash
npm publish --workspace @arch-engine/schema --access public
npm publish --workspace @arch-engine/core --access public
npm publish --workspace @arch-engine/adapter-monorepo --access public
npm publish --workspace @arch-engine/governance-pack-authority --access public
npm publish --workspace @arch-engine/governance-pack-rest-contract --access public
npm publish --workspace @arch-engine/governance-pack-journey --access public
npm publish --workspace @arch-engine/cli --access public
```

Run from the repo root, on `main`, **after** `npm login`.

`--access public` is required on first publish of a scoped package and
is harmless on subsequent ones. The `prepack` script (`npm run build`)
runs automatically per workspace and produces a deterministic tarball.

If a publish fails midway, do **not** retry with `--force` — diagnose
the failure (auth, lockfile, network, registry rate-limits) and re-run
the failed package's command only.

---

## 12. Post-Publish Verification

After all seven publishes complete:

```bash
npm view @arch-engine/schema@1.0.2
npm view @arch-engine/core@1.0.2
npm view @arch-engine/adapter-monorepo@1.0.2
npm view @arch-engine/governance-pack-authority@1.0.2
npm view @arch-engine/governance-pack-rest-contract@1.0.2
npm view @arch-engine/governance-pack-journey@1.0.2
npm view @arch-engine/cli@1.0.2
```

Each `npm view` should report `version: 1.0.2`, the correct
`dist-tags.latest`, and dependency lines that match this preflight.

Then a fresh public-registry tempdir smoke (uses the now-published
1.0.2 from the registry, not local tarballs):

```bash
TMPDIR=$(mktemp -d -t arch-engine-v102-public-smoke.XXXXXX)
cd "$TMPDIR"
npm init -y >/dev/null
npm install --no-audit --no-fund \
  @arch-engine/cli@1.0.2 \
  @arch-engine/adapter-monorepo@1.0.2
npx arch-engine --version    # expect: arch-engine/1.0.2 ...
npx arch-engine --help       # expect: 5 commands, "Catch architecture drift before merge."
npx arch-engine doctor       # expect: exit 0
cd / && rm -rf "$TMPDIR"
```

Optional: blocked-output verification using the demo-drift fixture from
the v1.0.2 GitHub release tag.

---

## 13. Git Tag Commands

After successful publish + post-publish verification:

```bash
git tag arch-engine-v1.0.2
git push origin main --tags
```

Run **only after** all seven `npm publish` commands succeeded and
`npm view ...@1.0.2` confirms each is on the registry.

---

## 14. Remaining Deltas

### BLOCKER

*(none)*

### HIGH

*(none)*

### MEDIUM

*(none)*

### LOW

- **`npm whoami` returns 401.** Local environment is not currently
  authenticated against the registry. Human follow-up: `npm login`
  before §11. Not a code-side blocker.

### MICRO_DELTA

- The historical Phase B audit at
  `audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md`
  documents the v1.0.1-era `check --help` exit-code block (which
  said "5 blocking policy violations (ENFORCE mode)"). This is
  audit-evidence preserved per the Phase D-Lite Exit-Code Repair
  audit's "do not rewrite past audit evidence" rule. The Phase
  D-Lite Exit-Code Repair audit is the canonical post-migration
  record.

---

## 15. Final Gate Decision

**`ARCH_ENGINE_V1_0_2_READY_FOR_HUMAN_NPM_PUBLISH`**

The seven-package v1.0.2 patch release is code-side ready. The only
unresolved preflight item is `npm login` on the human's side (§14
LOW). All validation gates have passed:

- Build: green.
- Typecheck: green.
- Tests: **1948 / 1948** pass; **652 / 652** files pass.
- Freeze tests: **357 / 357** pass.
- Pack dry-run: green for root and each of the seven public packages.
- Public-style install smoke: all five v1.0.x commands exit 0 on
  no-policy fixture; demo-drift `check` exits **1** with the canonical
  blocked output.
- No public API expansion. No `@arch-governance/*` dependency. No AGP
  emitter code.
- The one externally-observable behavior change (`check` exit 5 → 1)
  is documented in `CHANGELOG.md` under "Behavior change (CI scripts
  may need updating)".

---

## 16. Recommended Next Mission

After successful publish + post-publish verification + the git tag
described in §13:

Either:

**A. Arch-Engine CLI v1.0.3 JSON / Error-Language Polish Pass.**
Continues the patch-safe CLI experience improvements. Target:
- structured `ARCH_ENGINE_*` error codes per spec §8
- richer `--json` envelope behind `--json-schema=v2` per spec §7.1
- documented exit codes in spec/docs across all commands
Targets v1.0.3 or v1.1.0-eligible additive flags depending on scope.

Or:

**B. Arch-Engine AGP Emitter MVP Implementation Pass.**
Per `docs/contracts/agp-emitter-contract.md`. Creates a brand-new
`@arch-engine/agp-emitter@0.1.0` package depending only on
`@arch-governance/architecture-profile`. No public-CLI surface
change in v1.0.x; the emitter is a programmatic API + opt-in CLI
flag in a future minor release.

Default recommendation depends on product priority. If first-impression
CLI quality and CI ergonomics matter most, pick A. If activating the
AGP ecosystem bridge matters most, pick B.

---

*End of v1.0.2 patch release preflight.*
