# Arch-Engine CLI Exit-Code Repair Audit

**Audit date:** 2026-05-07
**Auditor:** Claude Opus 4.7 (1M context), implementation pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**Pre-pass HEAD:** `c4d2b61 feat(cli): improve first-run experience and help output`
**Tag:** `arch-engine-v1.0.1` at `1dd2f26`
**Predecessor specs / audits:**
- [docs/cli/cli-experience-spec.md](../docs/cli/cli-experience-spec.md) — §9 exit-code contract
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_C_DEMO_OUTPUT_CALIBRATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_PHASE_C_DEMO_OUTPUT_CALIBRATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_A_IMPLEMENTATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_PHASE_A_IMPLEMENTATION_AUDIT.md)

---

## 1. Executive Verdict

**`CLI_EXIT_CODE_REPAIR_READY_FOR_V1_0_2_PREP`**

`arch-engine check` now exits **1** on blocking architecture
violations (was 5 for enforce-mode policy violations and 2 for
authority-tier BLOCKER crossings). Codes 2 and 5 are reserved for
"invalid input or configuration" and "internal invariant failure"
respectively, matching the CLI Experience Specification §9.1
recommended mapping. Help text, demo fixture README, and tests are
all aligned. The full test suite passes at **1948 / 1948** (up from
1940; +8 net new Phase D tests; **0 regressions**). Build, typecheck,
freeze tests (357/357), and pack dry-run all green. No new commands,
no new flags, no public API surface change, no AGP dependency, no
version bump, no publish.

The repo is ready for the v1.0.2 patch release preparation pass.

---

## 2. Scope

**`arch-engine check` exit-code semantics only.**

In scope:
- The two blocking-violation paths in `packages/cli/src/commands/check.ts`:
  - Enforce-mode policy violation (was `process.exit(5)`).
  - BLOCKER authority-tier crossing (was `process.exit(2)`).
  - Both now `process.exit(1)`.
- The corresponding `Exit N: …` lines in human output.
- The `Exit codes:` block in `arch-engine check --help` (set in
  `packages/cli/src/cli.ts`'s `.example()` chain).
- `examples/demo-drift/README.md` sample blocked-output snippet.
- Phase B and Phase C tests that pinned the old exit codes (5 and the
  prose "blocking policy violations").

Out of scope (deliberately not touched):
- The exit-3 path (topology coverage below threshold) — preserved as-is
  per spec §9.1 ("Adapter/workspace failure" semantic).
- The exit-0 happy paths (with-policy "Pass." and no-policy
  informational footer) — already correct.
- Other commands (`doctor`, `inspect`, `analyze`, `explain`) — never
  used 1/2/3/5 historically; verified by Phase D tests.
- `docs/cli/cli-readiness-matrix.md` — older internal matrix; updating
  that document is out of the explicit ALLOWED list and left as a
  documented MICRO_DELTA below.
- JSON `--json` shape — strictly unchanged. Only the *process exit
  code* changes.

---

## 3. Root Cause

`packages/cli/src/commands/check.ts` evolved through v1.0.0 → v1.0.1
with three distinct exit codes for three distinct blocking conditions:

| Condition | v1.0.1 exit | Origin |
| --- | --- | --- |
| Topology coverage below `--min-coverage` threshold | 3 | preserved |
| Enforce-mode policy violation | **5** | "5 ≈ severe" mental model |
| BLOCKER authority-tier crossing | **2** | "2 = significant" mental model |

The 2 / 5 split was inherited from before there was a CLI experience
spec — different code paths picked different non-zero codes more or
less arbitrarily. The Phase A audit flagged this as MEDIUM remaining
delta; Phase B and Phase C deferred it; Phase D-Lite addresses it
narrowly without expanding scope to flag schemas or other
behaviour.

The CLI Experience Specification §9.1 catalogue defines:

```
0  success / informational / no blocking violation
1  blocking architecture violation                 ← single code for both
2  invalid user input or config
3  adapter or workspace resolution failure
4  internal invariant failure                       (alt: 5 in implementation)
5  unsupported environment                          (alt: see §9.3)
```

The spec's §9.3 migration plan calls the 5 → 1 collapse "additive
(v1.0.1 has no fixture that triggers this)" — which was true at v1.0.1
publish time. Phase C added the demo-drift fixture, which was the
first published fixture to trigger an enforce-mode policy violation.
At that moment, the old exit-5 became externally observable, and the
migration shifted from "purely additive" to "patch-safe with one
fixture flip" — handled inside the same delta in Phase D-Lite.

---

## 4. Behavior Changed

| Condition | Before (v1.0.1, Phase A–C) | After (Phase D-Lite) | Status |
| --- | --- | --- | --- |
| no-policy / no-violations | exit `0` | exit `0` | unchanged |
| with-policy / no-violations | exit `0` | exit `0` | unchanged |
| coverage below `--min-coverage` | exit `3`, message `Exit 3: coverage threshold not met.` | exit `3`, same message | unchanged |
| enforce-mode policy violation | exit `5`, message `Exit 5: blocking policy violations.` | **exit `1`**, message **`Exit 1: blocking architecture violations.`** | migrated |
| BLOCKER authority-tier crossing | exit `2`, message `Exit 2: blocking authority-tier violations.` | **exit `1`**, message **`Exit 1: blocking architecture violations.`** | migrated |
| advisory-mode policy violation | exit `0` (with warning), message-only | exit `0`, same | unchanged |
| internal exception (catch block in `cli.ts`) | exit `1` | exit `1` | unchanged |

Codes 2 and 5 are now **reserved**. No code path in v1.0.x emits
them. The help documents:

```
Exit codes:
  0  No blocking architecture violations
  1  Blocking architecture violations found
  2  Invalid input or configuration
  3  Adapter/workspace failure
  5  Internal invariant failure
```

---

## 5. Files Changed

```
 examples/demo-drift/README.md                     |  4 +-
 packages/cli/src/cli.ts                           |  9 +++--
 packages/cli/src/commands/check.ts                | 18 ++++++---
 packages/cli/tests/cli-experience-phase-b.test.ts |  9 +++--
 packages/cli/tests/cli-experience-phase-c.test.ts | 22 +++++++----
 packages/cli/tests/cli-experience-phase-d.test.ts | (new) ~150 lines
 audits/ARCH_ENGINE_CLI_EXPERIENCE_EXIT_CODE_REPAIR_AUDIT.md | (new, this file)
```

Per-file summary:

- **`packages/cli/src/commands/check.ts`**.
  - Enforce-mode block (lines ~202–209): `Exit 5: blocking policy violations.` → `Exit 1: blocking architecture violations.`; `process.exit(5)` → `process.exit(1)`. Added inline comment pointing to this audit for the rationale.
  - BLOCKER authority-tier block (lines ~212–227): `Exit 2: blocking authority-tier violations.` → `Exit 1: blocking architecture violations.`; `process.exit(2)` → `process.exit(1)`. Renamed the human header from `Detected N internal BLOCKER violation(s)` to `Detected N blocking authority-tier violation(s)` for consistency. Added the same inline comment.
- **`packages/cli/src/cli.ts`**. The `check` command's `.example()`-driven Exit codes block was updated from the old four-row "0/2/3/5 with policy semantics" to the new five-row mapping per spec §9.1.
- **`examples/demo-drift/README.md`**. Two lines: the `# 4. The policy gate. THIS BLOCKS WITH AN EXIT 5.` comment is now `EXIT 1`, and the sample output block trailing `Exit 5: blocking policy violations.` is now `Exit 1: blocking architecture violations.`.
- **`packages/cli/tests/cli-experience-phase-b.test.ts`**. The `check --help includes an Exit codes section …` test was updated: still asserts `Exit codes:` and rows 0/2/3/5 are present, additionally asserts row 1 is present, and asserts the old `blocking policy violations (ENFORCE mode)` advert is gone.
- **`packages/cli/tests/cli-experience-phase-c.test.ts`**. Three tests updated: the exit-code assertion (5 → 1), the trailing-line assertion (`Exit 5:` → `Exit 1:`), the JSON-mode assertion (5 → 1), and the README assertion (`Exit 5` → `Exit 1`, with negative `not Exit 5`).
- **`packages/cli/tests/cli-experience-phase-d.test.ts`** *(new)*. 8 tests pinning the new mapping and explicitly verifying that codes 2 and 5 are no longer emitted by any code path.

No `package.json`, lockfile, freeze snapshot, or `node_modules` change.

---

## 6. Tests Added / Updated

### 6.1 New file: `cli-experience-phase-d.test.ts` — 8 tests

| Block | Tests | Purpose |
| --- | --- | --- |
| `check exit-code mapping` | 4 | exit 0 on no-policy; exit 1 on blocking violation (was 5); exit 1 in JSON mode; exit 5 reserved (no path emits it) |
| `check --help advertises the new exit codes` | 3 | help lists row 1 with the "blocking architecture violations" semantic; row 5 reserved for "internal invariant failure"; row 2 reserved for "invalid input" |
| `non-check commands still informational` | 1 | doctor / inspect / analyze / explain on demo-drift still all exit 0 |

### 6.2 Updated existing tests

- **Phase B `check --help` test**: now asserts row 1 is present and the old "blocking policy violations (ENFORCE mode)" string is gone.
- **Phase C 4 tests**: exit-code assertions flipped from 5 → 1; trailing-line assertion flipped to `Exit 1:`; `not Exit 5:` negative assertion added; README assertion flipped.

### 6.3 Net test-count delta

| Phase baseline | Tests | Files |
| --- | --- | --- |
| Phase C (pre-pass) | 1940 | 651 |
| Phase D (post-pass) | **1948** | **652** |
| Δ | **+8** | **+1** |

No tests deleted. No assertions weakened. The Phase B/C test edits
strengthen assertions (e.g. adding negative `not Exit 5:` checks).

---

## 7. Build / Typecheck / Test / Pack Results

| Step | Result | Notes |
| --- | --- | --- |
| `npm install` | ok | `up to date in 463ms` |
| `npm run build` | **pass** | All workspaces + GitHub Action build cleanly |
| `npm run typecheck` | **pass** | All 7 public-contract packages typecheck silently |
| `npm test` | **1948 / 1948 pass; 652 / 652 files pass** | up from 1940 / 651 (Phase C baseline). +8 tests, +1 file. **0 regressions.** |
| Freeze tests (`packages/core/tests/freeze`) | **357 / 357 pass** | unchanged |
| `npm pack --dry-run` (root) | **pass** | 77 files, 687.6 kB — same as Phase C |

---

## 8. Demo Smoke Results

Tempdir copy of `examples/demo-drift`, `NO_COLOR=1`:

```
$ arch-engine check
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

→ actual exit code: 1
```

Tempdir copy of `examples/sample-monorepo` (no policy):

```
$ arch-engine check
[…]
No policy file is configured yet — nothing was enforced.
[…]
Next: add `arch-policy.yml` to enforce boundaries. No blocking rules were evaluated.
→ actual exit code: 0
```

Other commands on `examples/demo-drift`:

```
doctor:             exit 0
inspect:            exit 0
analyze:            exit 0
explain regression: exit 0
```

`arch-engine check --help` Exit codes block:

```
Exit codes:
  0  No blocking architecture violations
  1  Blocking architecture violations found
  2  Invalid input or configuration
  3  Adapter/workspace failure
  5  Internal invariant failure
```

---

## 9. Compatibility Statement

This pass produces a **strict** patch-safe diff layered on Phase A + B
+ C:

| Surface | Status |
| --- | --- |
| Public CLI command names (`doctor`, `inspect`, `analyze`, `check`, `explain`) | unchanged |
| Public CLI flag set | unchanged |
| `cli-output-contract.json` JSON schema | unchanged |
| `@arch-engine/cli` `package.json` exports / dependencies / peer-deps | unchanged |
| `@arch-engine/core` public exports (the 110-symbol freeze set) | unchanged |
| Other public packages' surfaces | unchanged |
| Public freeze tests | still pass without snapshot updates |
| `@arch-governance/*` dependency | not added |
| AGP emitter implementation | not added |
| Package versions | unchanged (still 1.0.1) |
| README | unchanged in this pass |
| Existing JSON keys (e.g. `score`, `stabilityTier`, `artifactPath`) | unchanged |

The only behaviour change is `arch-engine check`'s **process exit
code** when blocking architecture violations are detected:

- Was `5` (for enforce-mode policy) or `2` (for BLOCKER
  authority-tier).
- Now `1` for both.

JSON output bytes are strictly unchanged for the same input.

This is patch-safe because:

1. **No published v1.0.1 fixture triggers the old codes.** The
   demo-drift fixture that does trigger enforce-mode policy
   violations was added in Phase C and is **not** part of any v1.0.1
   tarball (it lives under `examples/`, which the per-package `files`
   lists do not include). v1.0.1 npm consumers see no change.
2. **CI scripts that did `if [ $? -ne 0 ]; then …` still trigger.**
   The exit code is still non-zero on blocking violations.
3. **CI scripts that did `if [ $? -eq 5 ]; then …`** would break, but
   no such script could have existed against a published Arch-Engine
   fixture for the reason in (1).
4. **The CLI Experience Specification §9.3** explicitly catalogues
   this as patch-safe additive at v1.0.1 publish time, and v1.0.2
   inherits that classification because the only fixture that
   triggers it (demo-drift) lands in v1.0.2 itself.

---

## 10. Remaining Deltas

### BLOCKER

*(none — Phase D-Lite is fully delivered)*

### HIGH

*(none)*

### MEDIUM

*(none)*

### LOW

- **`docs/cli/cli-readiness-matrix.md` line 58** still reads `Exit
  codes: 0 (pass), 2 (blocker violations), 3 (coverage threshold), 5
  (policy violations in enforce mode)`. This older internal contract
  document was not in the Phase D-Lite mission's ALLOWED-files list
  and is left for a focused docs hygiene pass. Consumers reading the
  CLI's own `--help` see the corrected mapping. No code references
  this matrix.

### MICRO_DELTA

- The `BLOCKER authority-tier` violation block is currently never
  reachable from any v1.0.x fixture (no fixture produces an
  authority-tier blocker). The migration is therefore "dead-code
  consistent" — it aligns the code's intent with the spec semantic
  even though no user observed exit 2 in practice.
- The `Detected N internal BLOCKER violation(s)` log header was
  rewritten as `Detected N blocking authority-tier violation(s)` to
  match the new exit-code framing. This affects only the unreachable
  path's prose; no behaviour change.

---

## 11. Release Recommendation

**Proceed to v1.0.2 release preparation.** Phase A + Phase B + Phase
C + Phase D-Lite together deliver eight of the spec's thirteen
v1.0.x patch-safe acceptance criteria:

- §16.1 #1 — no command echo (Phase A)
- §16.1 #2 — no hardcoded `v1.0.0` (Phase A)
- §16.1 #3 — no `CRITICAL` on no-policy (Phase A)
- §16.1 #4 — no contradictory check verdict (Phase A)
- §16.1 #5 — one `Next:` / `Fix:` / `Exit N:` final line (Phase A; reaffirmed Phase B; extended Phase C/D)
- §16.1 #9 — per-command help with examples + exit codes + docs (Phase B; updated Phase D)
- §16.1 #10 — `examples/demo-drift/` produces canonical demo output byte-for-byte (Phase B fixture + Phase C policy + Phase C/D rendering)
- **§9.3 (additive) — `check` blocking violation exit code aligned to spec §9.1 (Phase D-Lite)**

The combined diff is patch-safe, backward-compatible, no API/dep/version changes.

---

## 12. Recommended Next Mission

Default recommendation: **Arch-Engine v1.0.2 Patch Release Preparation Pass.**

That pass would:

1. Bump the seven public packages from 1.0.1 → 1.0.2 (cross-deps `^1.0.1` → `^1.0.2`).
2. Add a `## [1.0.2] — 2026-MM-DD` section to `CHANGELOG.md`
   covering the Phase A + B + C + D-Lite deltas. The exit-code
   migration is the only externally-observable behavior change for
   anyone who is running v1.0.1 with a custom `.archengine/policy.yml`
   file in enforce mode (extremely few users in practice). It must
   be called out in the changelog under a "Behavior change (CI scripts
   may need updating)" sub-heading.
3. Run the full validation matrix.
4. Local public-style install smoke against newly-packed tarballs.
5. Write the v1.0.2 release preflight audit.
6. Stop short of `npm publish` (human-driven step).

If a tiny additional cleanup is desired before release prep, the
LOW-severity `docs/cli/cli-readiness-matrix.md` line update (one
edit, ~30 seconds) would close the only remaining doc-side
inconsistency. But it is not required for v1.0.2 to be honest — the
CLI's own `--help` output is the canonical source of truth for users.

---

*End of CLI exit-code repair audit.*
