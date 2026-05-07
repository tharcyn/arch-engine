# Arch-Engine JSON / Error-Language Specification Audit

**Audit date:** 2026-05-07
**Auditor:** Claude Opus 4.7 (1M context), spec-only design pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**HEAD:** `ea44dc9 chore(release): prepare arch-engine v1.0.2`
**v1.0.2 tag:** not yet created (release-prep commit at HEAD; tag is post-publish per the v1.0.2 preflight)

**Predecessor specs:**
- [docs/cli/cli-experience-spec.md](../docs/cli/cli-experience-spec.md) — §7 (JSON envelope), §8 (error language), §9 (exit codes)
- [docs/contracts/cli-surface-contract.md](../docs/contracts/cli-surface-contract.md)
- [docs/contracts/agp-emitter-contract.md](../docs/contracts/agp-emitter-contract.md)

**Predecessor audits:**
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_SPECIFICATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_SPECIFICATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_A_IMPLEMENTATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_PHASE_A_IMPLEMENTATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_C_DEMO_OUTPUT_CALIBRATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_PHASE_C_DEMO_OUTPUT_CALIBRATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_EXIT_CODE_REPAIR_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_EXIT_CODE_REPAIR_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_V1_0_2_PRE_RELEASE_DOC_CLEANUP_AUDIT.md](./ARCH_ENGINE_CLI_V1_0_2_PRE_RELEASE_DOC_CLEANUP_AUDIT.md)
- [audits/release/ARCH_ENGINE_V1_0_2_PATCH_RELEASE_PREFLIGHT.md](./release/ARCH_ENGINE_V1_0_2_PATCH_RELEASE_PREFLIGHT.md)

---

## 1. Executive Verdict

**`JSON_ERROR_SPEC_READY_FOR_IMPLEMENTATION`**

The specification at `docs/cli/json-error-language-spec.md` locks the
v1.0.3 implementation scope to a strict patch-safe additive: 11
`ARCH_ENGINE_*` error codes used internally; consistent
Title / Problem / Fix / Exit / Docs human rendering for failures;
additive `diagnostics: []` array on every command's `--json` output;
additive `violations: []` array on `check --json`; additive
`artifactRelativePath` on `check --json`; stack traces hidden by
default with `DEBUG=arch-engine:*` opt-in (already true in v1.0.x —
documented). The v2 envelope is fully designed but deferred to v1.1.0
behind an opt-in `--json-schema=v2` flag. No source code, no
`package.json`, no dependency, no public API surface change in this
pass. The implementation pass has 15 numbered acceptance criteria and
9 process-level test requirements.

The spec is ready for an implementation pass.

---

## 2. Scope

**Specification only.** No implementation.

- No source code modified.
- No `package.json` modified.
- No `package-lock.json` modified.
- No `@arch-governance/runtime` or `@arch-governance/architecture-profile`
  added as a dependency.
- No public CLI flag, command, or export change in this pass.
- No tests added or weakened in this pass.
- No npm publish.
- No git tag.
- No git commit (per mission instructions).

The single deliverable is `docs/cli/json-error-language-spec.md`,
plus this audit.

---

## 3. Current Behavior Reviewed

CLI built from current source (`npm run build` clean) and exercised
against `examples/sample-monorepo` (no policy) and
`examples/demo-drift` (enforce-mode policy) tempdir copies. Captured:

### 3.1 Human output (post-Phase A/B/C/D-Lite)

- All five commands have a clean Phase A/B output: no command echo, no
  hardcoded version strings, calibrated headlines, exactly one
  `Next:` / `Fix:` / `Exit N:` final line.
- `check` on demo-drift produces the canonical
  `Blocked: 1 architecture violation.` output with rule + severity +
  `(blocks CI)` + `Fix:` + `Exit 1:`.
- `explain` on unknown target lists supported special targets.

### 3.2 JSON output (post-Phase A/B/C/D-Lite)

| Command | Top-level JSON keys |
| --- | --- |
| `doctor --json` | `environment`, `extractionMode`, `topologyConfidence`, `topologyConfidenceLabel`, `confidenceDescription`, `detectedNodes`, `expectedNodes`, `connectedNodes`, `coverage`, `connectivity`, `crossings`, `domainDistribution`, `domainIntegrity`, `warnings`, `autoInitialized`, `hasPolicyFile` |
| `inspect --json` | `nodes`, `edges`, `crossings`, `confidence`, `topologyConfidenceLabel`, `confidenceDescription`, `coverage`, `connectivity`, `extractionMode`, `workspaceType`, `domainDistribution`, `warnings`, `adaptersActive` |
| `analyze --json` | `score`, `classification`, `stabilityTier`, `topologyConfidenceLabel`, `coverage`, `connectivity`, `topologyConfidence`, `extractionMode`, `workspaceType`, `authorityCrossings`, `domainDistribution`, `blast_radius`, `components`, `warnings`, `executionMetrics`, `policyConfigured`, `headlineKind` |
| `check --json` | `score`, `classification`, `stabilityTier`, `topologyConfidenceLabel`, `coverage`, `connectivity`, `extractionMode`, `topologyConfidence`, `authorityCrossings`, `blockerCrossings`, `warnings`, `executionMetrics`, `artifactPath`, `policyConfigured`, `headlineKind` |
| `explain regression --json` | `regressionSeverity` (null), `regressionConfidence` (null), `regressionConfidenceSource` (null), `regression` (null), `regressionDelta` (null), `trendIndicators` (null), `comparisonBaseline` (null), `stabilityTier`, `topologyConfidenceLabel`, `coverage`, `connectivity`, `stabilityScore` |
| `explain unknown --json` | `matches`, `suggestions`, `supportedSpecialTargets` |

### 3.3 Error output

- `Fatal: <message>` prefix; no error code; no severity; no `Fix:` line on raw failures.
- Stack traces gated behind `DEBUG=arch-engine:*` (correct policy already; just undocumented).

---

## 4. Main Problems Found

### P1. No top-level JSON envelope

Each command emits a different flat-object shape. CI tooling that
scrapes `--json` output across commands has to maintain five different
parsers. There is no `command`, `version`, `status`, `exitCode`,
`diagnostics`, or `nextActions` consistency. **HIGH** — addressed by
v2 envelope design (deferred to v1.1.0 per the spec).

### P2. `check --json` on a real blocking violation OMITS the violation

The human output shows `Blocked: 1 architecture violation.` with the
offending edge, rule id, and severity. The JSON output has none of it
— `violations` is not a key. CI consumers that want to know *which*
edge violated the policy must fall back to parsing the human stdout
or reading the `.arch-engine/stability-score.json` artifact. **HIGH**
— addressed by v1.0.3 additive `violations: []` field.

### P3. `artifactPath` is absolute

Already noted in the Phase A audit. Still leaks tempdir paths in CI
output. **MEDIUM** — addressed by v1.0.3 additive `artifactRelativePath`
field; absolute path retained for backward compatibility.

### P4. No structured error codes

When something fails, the CLI prints `Fatal: <message>` with no
`ARCH_ENGINE_*` code, no severity tag, no `Fix:` line. CI consumers
can't distinguish "user error" from "internal bug" from "policy
violation" without parsing the human prose. **HIGH** — addressed by
v1.0.3's 11-code taxonomy + structured renderer.

### P5. `Fix:` line consistency

Phase A introduced the `Next:` / `Fix:` / `Exit N:` final-line policy.
Real failures in v1.0.x consistently use `Fix:` + `Exit N:`. But the
generic `Fatal:` paths (e.g. `Fatal: ENOENT: no such file or directory,
mkdir '/.arch-engine'`) do NOT use the `Fix:` / `Exit N:` shape — they
just print and exit 1 from `cli.ts`'s catch block. **MEDIUM** —
addressed by v1.0.3's structured renderer.

### P6. Stack traces undocumented

`DEBUG=arch-engine:*` enables stack trace emission but is undocumented
in the CLI Experience Spec or in any user-facing help. **LOW** —
addressed by v1.0.3 documentation.

### P7. `explain regression --json` "mostly null" shape

When no baseline exists, the JSON returns 7 `null` keys. v1.0.3
additive: emit a structured `ARCH_ENGINE_NO_BASELINE` (INFO) diagnostic
in the `diagnostics[]` array. The mostly-null shape is preserved for
backward compatibility. **LOW** — addressed by v1.0.3 additive.

### P8. CLI internal vocabulary leaks in error messages

Errors like `Fatal: edges is not iterable` (v1.0.0 era; fixed in
v1.0.1) used internal class names. The pattern was repaired but no
spec governs it. **LOW** — addressed by v1.0.3 §11.4 (INTERNAL severity
keeps stack hidden by default; `Problem:` paragraph is the only place
internal vocabulary may surface, and only when the user is told to
file a bug).

---

## 5. Spec Created

**File:** [`docs/cli/json-error-language-spec.md`](../docs/cli/json-error-language-spec.md)

**Size:** ~1320 lines.

**Sections (16 total, matching the mission template):**

1. **Status** — draft v0.1, target v1.0.3 (additive) and v1.1.0 (envelope flag), spec only.
2. **Purpose** — closes the machine-readability gap that v1.0.2's CLI experience polish left open.
3. **v1.0.3 Scope** — eight in-scope items, six out-of-scope items, Path A/B/C decision (recommends Path A: additive fields in v1.0.3 + envelope deferred).
4. **Non-Goals** — explicit anti-list (no AGP, no new commands, no new flags, no public exports widening, no breaking JSON, etc.).
5. **Exit Code Contract** — frozen by v1.0.2; documented for completeness with v1.0.3 migration notes per code.
6. **Error Code Taxonomy** — 11 `ARCH_ENGINE_*` codes locked; severity vocabulary (`INFO`/`WARNING`/`BLOCKING`/`ERROR`/`INTERNAL`); per-code table with severity / exit / title / CI-blocking / stack-trace policy.
7. **Human Error Language** — Title/Problem/Fix/Exit/Docs render template; eight normative rendering examples (one per code, plus the existing Phase A/B/C examples re-anchored).
8. **Current JSON v1 Compatibility** — verbatim documentation of every v1.0.2 `--json` output shape (six sub-sections, one per command + per-mode); patch-safety rules; `CliDiagnostic` shape definition.
9. **Future JSON v2 Envelope** — full envelope structure for v1.1.0 implementation behind `--json-schema=v2`; migration mechanics across v1.0.x → v1.1.x → v2.0.x.
10. **Command-Specific Rules** — per-command exit codes and which `ARCH_ENGINE_*` codes may appear in each command's `diagnostics[]`. Includes the `violations[]` shape for `check --json`.
11. **Stack Trace Policy** — default off; `DEBUG=arch-engine:*` opt-in; `--verbose` / `--quiet` deferred to v1.1; INTERNAL severity exception.
12. **Path / Privacy Policy** — repo-relative paths, POSIX separators, no leaked secrets, stable JSON serialization.
13. **CI Consumption Model** — bash + GitHub Actions patterns; what's in v1.0.3 vs deferred to v1.1.
14. **Migration Plan** — three-table view of v1.0.2 → v1.0.3 → v1.1.0 → v2.0.0.
15. **Test Plan** — unit + process-level tests required by the implementation pass; no tests added in this spec pass.
16. **Acceptance Criteria for Implementation Pass** — 15 numbered v1.0.3 gates + 5 v1.1.0 gates + out-of-scope list.

---

## 6. Patch-Safety Decision

The CLI Experience Specification §14.1 catalogued three rollout paths
for the JSON envelope. This spec **recommends Path A** for v1.0.3:

| Path | v1.0.3 | v1.1.0 | Breaking? | Recommendation |
| --- | --- | --- | --- | --- |
| A | Additive fields (`diagnostics[]`, `violations[]`, `artifactRelativePath`) on existing v1 shape. No new flags. | `--json-schema=v2` flag introduces full envelope; `v1` stays default. | No | **Selected** |
| B | Document only; ship no JSON change in v1.0.3. | Same as A. | No | Rejected — leaves the `check --json`-omits-violations gap unfixed for the v1.0.3 patch cycle. |
| C | Add `--json-schema=v2` flag in v1.0.3 itself; flip default in v2.0.0. | Default still v1; no change. | No | Rejected — adding a flag to v1.0.3 widens the patch surface. v1.0.3 should be additive-only. |

### 6.1 What v1.0.3 ships

1. `ARCH_ENGINE_*` codes, internally.
2. Structured Title / Problem / Fix / Exit / Docs rendering for failures.
3. Stack-trace policy locked (already correct in v1.0.x; documented).
4. Additive `diagnostics: []` array on every command's `--json` output.
5. Additive `violations: []` array on `check --json`.
6. Additive `artifactRelativePath` on `check --json`.

### 6.2 What v1.1.0 ships (separately)

1. `--json-schema=v2` flag.
2. Full v2 envelope structure (`schemaVersion`, `command`,
   `archEngineVersion`, `emittedAt`, `status`, `exitCode`, `summary`,
   `data`, `artifacts`, `diagnostics`, `nextActions`).
3. `--verbose`, `--quiet`, `--ci`, `--format`, `--output`, `--baseline`
   flags (all v1.1 candidates).
4. `arch-engine init` scaffold command.
5. Exit-code migrations from CLI Experience Spec §9.3.
6. (Independent of envelope) `@arch-engine/agp-emitter@0.1.0` package
   per `docs/contracts/agp-emitter-contract.md`.

### 6.3 Why Path A is patch-safe

The v1.0.1 → v1.0.2 release already established additive JSON fields
as patch-safe (see Phase A audit's `policyConfigured` /
`headlineKind`, Phase B audit's `supportedSpecialTargets[]`). v1.0.3's
three new additive fields (`diagnostics[]`, `violations[]`,
`artifactRelativePath`) follow the same precedent. No existing v1
consumer breaks.

---

## 7. Open Questions

The following are recorded as open questions for human-review-and-decide
before the v1.0.3 implementation pass:

| # | Question | Spec default | Material? |
| --- | --- | --- | --- |
| **Q1** | Is the additive `diagnostics: []` field worth shipping in a patch, or should it wait for v1.1.0's full envelope flag? | Path A: ship in v1.0.3 (recommended). | Yes — affects v1.0.3 scope. |
| **Q2** | Does `check --json` `violations[]` include the FULL violation list (no cap), or mirror the human output's 5-item cap? | Full list in JSON, 5-item cap in human only. | Small — affects test fixture sizes. |
| **Q3** | Should the violation `id` use SHA-256 truncated to 8 chars (per spec §7.5), or a longer prefix to avoid collisions? | 8 chars (spec default; matches Phase A precedent). | Small. |
| **Q4** | Should the existing absolute `artifactPath` be deprecated and removed in v2.0, or kept for backward compatibility? | Keep through v1.x; v2.0+ deprecation deferred. | Small. |
| **Q5** | Should `--verbose` ship in v1.0.3 (additive flag) or strictly v1.1? | Strictly v1.1. v1.0.3 is additive-only at the flag level. | Small. |
| **Q6** | Where do AGP emitter records fit in the v2 envelope's `data.records[]`? | Out of v1.0.3 scope. AGP integration follows the AGP emitter contract; the v2 envelope's `data` is a passthrough. | None for v1.0.3. |
| **Q7** | Does the implementation pass need to add `error-codes.ts` to the CLI tsconfig include allow-list? | Yes (matches Phase A's `policy-presence.ts` precedent). | Small — implementation detail. |
| **Q8** | Should `cli-output-contract.json` (the published JSON schema) be updated? | Not in v1.0.3 — that schema covers the *user-visible JSON output*, and v1.0.3's additive fields are forward-compat. The schema update lands with v2 envelope in v1.1.0. | Small. |

Q1 is the only material question; everything else is implementation
discretion under the spec defaults.

---

## 8. Recommended Implementation Order

Phased so each phase is independently testable. Each phase ends with a
runnable test suite.

| Phase | Title | Output |
| --- | --- | --- |
| **A** | Land `error-codes.ts` and `format-error.ts`. Add unit tests pinning the §6.2 table. | new internal helpers; no output change yet |
| **B** | Wire `format-error.ts` into the `cli.ts` catch block + the `Fatal:` paths in each command. Hide stack traces under DEBUG. | structured human errors; `--json` unchanged |
| **C** | Add `diagnostics: []` (always present) to every command's `--json` output. | additive JSON change; no breakage |
| **D** | Add `violations: []` and `artifactRelativePath` to `check --json`. | additive JSON change; no breakage |
| **E** | Add per-command tests from §15.2 and snapshot-diff tests from §15.3. | full v1.0.3 acceptance gate |
| **F** | Update `docs/cli/cli-experience-spec.md` references to JSON v1 keys (clarify v1.0.3 additive vs v1.1 envelope). Update `cli-readiness-matrix.md` if needed. | docs only |
| **G** | Run validation matrix and pack dry-run. | release-prep ready |
| **H** | Separate mission: prepare v1.0.3 patch release (bump 1.0.2 → 1.0.3 across the seven public packages, update CHANGELOG, write release preflight). | v1.0.3 ready for human npm preflight |

Phases A–G can land as one implementation pass; Phase H is the
v1.0.3 release-prep mission (matches the v1.0.2 prep pattern).

---

## 9. Commands Run

| # | Command | Purpose |
| --- | --- | --- |
| 1 | `git status --short`, `git log --oneline -n 8`, `git tag --list "arch-engine-v1.0.2"`, `git ls-remote --tags origin "arch-engine-v1.0.2"` | confirm clean baseline + v1.0.2 release-prep at HEAD; v1.0.2 tag not yet created |
| 2 | `npm run build` | rebuild current CLI for human + JSON probes |
| 3 | `mktemp -d` + `cp -R examples/sample-monorepo` + run `doctor`, `check` | capture no-policy baseline outputs (human + JSON) |
| 4 | `mktemp -d` + `cp -R examples/demo-drift` + run `check`, `check --json` | capture blocked-output v1.0.2 baseline (human shows violation; JSON omits it) |
| 5 | `mktemp -d` + run `explain not-a-real-target`, `explain not-a-real-target --json` | capture unknown-target JSON shape |
| 6 | Read `packages/cli/src/cli.ts`, `commands/{doctor,inspect,analyze,check,explain}.ts`, `renderers.ts`, `help-text.ts` | inspect rendering paths and `Fatal:` patterns |
| 7 | Read `packages/cli/tests/cli-experience-phase-{a,b,c,d}.test.ts` | confirm Phase A/B/C/D test invariants are still active |
| 8 | Read existing CLI experience spec §7 (envelope), §8 (error language), §9 (exit codes) | confirm what is already designed vs new in v1.0.3 |
| 9 | Read `audits/release/ARCH_ENGINE_V1_0_2_PATCH_RELEASE_PREFLIGHT.md` | confirm the recommended-next-mission path |
| 10 | Write `docs/cli/json-error-language-spec.md` | create deliverable |
| 11 | Write `audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_SPECIFICATION_AUDIT.md` | create this audit |
| 12 | `git status --short`, `git diff --stat` (post-pass) | confirm only docs added |
| 13 | `grep -R "@arch-governance/" package.json packages/*/package.json` | confirm no AGP dep added |

Working tree post-pass: two new untracked files (the spec + this
audit). No source code change. No `package.json` change. No lockfile
change. No freeze snapshot update. No commits per mission instructions.

---

*End of JSON / Error Language specification audit.*
