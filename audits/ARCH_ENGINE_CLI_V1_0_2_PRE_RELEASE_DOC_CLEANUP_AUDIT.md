# Arch-Engine CLI v1.0.2 Pre-Release Documentation Cleanup Audit

**Audit date:** 2026-05-07
**Auditor:** Claude Opus 4.7 (1M context), doc cleanup pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**HEAD:** `c4d2b61 feat(cli): improve first-run experience and help output`
**Tag:** `arch-engine-v1.0.1` at `1dd2f26`
**Predecessor audits:**
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_A_IMPLEMENTATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_PHASE_A_IMPLEMENTATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_C_DEMO_OUTPUT_CALIBRATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_PHASE_C_DEMO_OUTPUT_CALIBRATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_EXIT_CODE_REPAIR_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_EXIT_CODE_REPAIR_AUDIT.md)

---

## 1. Executive Verdict

**`DOC_CLEANUP_READY_FOR_V1_0_2_PREP`**

One stale documentation row was found and corrected:
`docs/cli/cli-readiness-matrix.md:58` listed the `check` command's
exit codes as `0, 2, 3, 5` per the v1.0.1 (pre-Phase-D-Lite)
mapping. It now reads `0, 1, 2, 3, 5` matching the canonical
mapping documented in `arch-engine check --help` and the CLI
Experience Specification §9.1. All other active documentation is
already consistent with the post-Phase-D-Lite state. Build,
typecheck, tests (**1948 / 1948**), and `npm pack --dry-run` all
remain green. No source code changed, no behavior changed, no
package version bumped, no `npm publish` performed, no AGP
dependency added.

The repo is ready for the **Arch-Engine v1.0.2 Patch Release
Preparation Pass**.

---

## 2. Scope

**Documentation consistency only.**

In scope:
- One file edited: `docs/cli/cli-readiness-matrix.md` line 58.
- One audit produced: this file.

Out of scope:
- No source code touched (`packages/`, `src/` untouched).
- No `package.json` / lockfile change.
- No CLI behavior change.
- No JSON schema change.
- No test added or weakened (test suite untouched in this pass).
- No README rewrite — README.md is already correct.
- No edits to historical audit files (Phase A / B / C / Phase
  D-Lite Exit-Code Repair audits) — they correctly capture
  the historical state at the time each was written. The Phase
  D-Lite audit explicitly contrasts the before/after and is the
  canonical record of the migration.

---

## 3. Stale References Found

`grep -RnE "Exit codes: 0, 2, 3, 5|Exit 5: blocking|blocking policy
violations|blocking authority-tier violations|exit 5" README.md
docs examples packages audits` returned 22 hits across the repo.
After classification:

| Category | Count | Disposition |
| --- | --- | --- |
| **Active stale doc** | **1** | **Fixed** (see §4) |
| Test files asserting old text is *gone* (negative assertions) | 5 | Kept — these are deliberate regression-detectors |
| Phase B / Phase C audit references showing the historical mapping | 6 | Kept — clearly labeled by phase, audit-evidence integrity |
| Phase D-Lite Exit-Code Repair audit before/after table | 9 | Kept — that audit's whole purpose is to document the migration |
| `packages/cli/dist/` (build artifact) | 0 (excluded) | n/a |

The only active stale reference was line 58 of
`docs/cli/cli-readiness-matrix.md`. Lines 36, 47, 67, 76 of the
same file describe other commands (`doctor`, `inspect`, `analyze`,
`explain`) with `0 (healthy/complete), 1 (fatal error)` — those
remain correct; Phase A through Phase D-Lite did not change those
commands' exit-code behavior.

`README.md:86` ("All commands support `--json` for machine-readable
CI integration. Exit codes reflect diagnostic status.") is general
prose; no specific code numbers; correct.

`docs/cli/cli-experience-spec.md:1029` ("Exit codes are the
contract. The text changes; the codes don't.") is a meta-statement
about exit-code stability policy; correct.

---

## 4. Changes Made

**One edit, one file:**

```diff
--- a/docs/cli/cli-readiness-matrix.md
+++ b/docs/cli/cli-readiness-matrix.md
@@ -55,7 +55,7 @@ Full architecture pipeline execution:
 - Regression detection (vs baseline artifact)
 - Stability artifact generation

-**Exit codes:** 0 (pass), 2 (blocker violations), 3 (coverage threshold), 5 (policy violations in enforce mode)
+**Exit codes:** 0 (no blocking architecture violations), 1 (blocking architecture violations found), 2 (invalid input or configuration), 3 (adapter/workspace failure), 5 (internal invariant failure)
```

Rationale:
- The new mapping matches the spec §9.1 canonical contract.
- The new prose matches `arch-engine check --help`'s
  authoritative wording.
- The compact form (`0, 1, 2, 3, 5`) was avoided in favor of the
  longer descriptive form because the rest of the file uses
  parenthesised descriptions for each code; consistency wins.

No other files were touched.

---

## 5. Validation Results

| Step | Result |
| --- | --- |
| `npm run build` | **pass** (all workspaces + GitHub Action) |
| `npm run typecheck` | **pass** (7 contract packages) |
| `npm test` | **1948 / 1948 pass; 652 / 652 files pass** (unchanged from pre-pass baseline) |
| `npm pack --dry-run` | **pass** (77 files, 687.6 kB; same as Phase D-Lite) |
| Post-edit stale grep | **clean** — no active stale references remain |

The test suite was not modified in this pass; the green run is
proof that the doc edit had no behavioural side effects.

---

## 6. Remaining Deltas

### BLOCKER

*(none)*

### HIGH

*(none)*

### MEDIUM

*(none)*

### LOW

*(none)*

### MICRO_DELTA

- The Phase B implementation audit at
  `audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md`
  lines 262–264 documents the v1.0.1 + Phase B `check --help`
  exit-code block, which read:
  ```
  2  blocking authority-tier violations
  5  blocking policy violations (ENFORCE mode)
  ```
  This is **historical audit evidence**, not a user-facing release
  doc. The Phase D-Lite Exit-Code Repair audit explicitly
  contrasts before/after and is the canonical post-Phase-D record.
  Per the mission's "do not rewrite past audit evidence unless it
  is actively misleading release documentation" guidance, the
  Phase B audit is left intact.
- Same for the Phase C audit's `Exit 5: blocking policy
  violations.` blocks (lines 100, 187, 200) — those captured the
  Phase C state and are correctly historical.

---

## 7. Recommended Next Mission

**Arch-Engine v1.0.2 Patch Release Preparation Pass.**

That pass would:

1. Bump the seven public packages from 1.0.1 → 1.0.2 (cross-deps `^1.0.1` → `^1.0.2`).
2. Add a `## [1.0.2] — 2026-MM-DD` section to `CHANGELOG.md`
   covering the Phase A + B + C + D-Lite + this doc-cleanup deltas
   in chronological order. The exit-code migration is the only
   externally-observable behavior change — it must be called out
   under a "Behavior change (CI scripts may need updating)"
   sub-heading.
3. Run the full validation matrix.
4. Local public-style install smoke against newly-packed tarballs.
5. Write the v1.0.2 release preflight audit.
6. Stop short of `npm publish` (human-driven step).

---

*End of CLI v1.0.2 pre-release documentation cleanup audit.*
