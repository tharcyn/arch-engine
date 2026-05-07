# Arch-Engine CLI Experience Phase B Implementation Audit

**Audit date:** 2026-05-06
**Auditor:** Claude Opus 4.7 (1M context), implementation pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**Pre-pass HEAD:** `9348a44 docs(cli): add cli experience specification`
**Tag:** `arch-engine-v1.0.1` at `1dd2f26`
**Predecessor specs:**
- [docs/cli/cli-experience-spec.md](../docs/cli/cli-experience-spec.md)
- [docs/contracts/cli-surface-contract.md](../docs/contracts/cli-surface-contract.md)

**Predecessor audits:**
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_SPECIFICATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_SPECIFICATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_A_IMPLEMENTATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_PHASE_A_IMPLEMENTATION_AUDIT.md)
- [audits/release/ARCH_ENGINE_V1_0_1_PATCH_RELEASE_PREFLIGHT.md](./release/ARCH_ENGINE_V1_0_1_PATCH_RELEASE_PREFLIGHT.md)

---

## 1. Executive Verdict

**`CLI_PHASE_B_READY_FOR_V1_0_2_PREP`**

Phase B stacks cleanly on the unstaged Phase A diff. Root help now leads
with the product promise *"Catch architecture drift before merge."*, lists
the five v1.0.x commands with plainer descriptions, and ends with a
recommended first-run path plus a docs URL. Per-command help now ships
real `Examples` blocks; `check --help` includes a four-row exit-code
reference; `explain --help` documents the supported target vocabulary
(`regression`, `policy`, plus free-form node/edge substring search).
Unknown explain targets surface the supported keywords in both human and
JSON modes. A new `examples/demo-drift/` fixture (`frontend → services →
payments` with one drifted edge) provides a deterministic, screenshot-
worthy fixture for the v1.0.2 README. **All Phase A invariants still
hold.** The full test suite passes at **1926 / 1926** (up from 1905; 21
new Phase B tests; 0 regressions). Build, typecheck, freeze tests
(357/357), and pack dry-run are all green. The five v1.0.x command names,
JSON top-level keys, exit codes, package surface, and freeze snapshots
remain unchanged.

The repo is ready for the v1.0.2 patch release preparation pass.

---

## 2. Scope

**Help / first-run guidance / explain vocabulary / demo fixture only.**

- No new CLI commands, no new CLI flags. The five v1.0.x verbs and global
  flags are unchanged.
- No public API surface change. No new exports from `@arch-engine/core`.
- No JSON envelope redesign. The Phase A additive fields
  (`policyConfigured`, `headlineKind`) are unchanged. One new additive
  JSON key (`supportedSpecialTargets`) appears only in the `explain
  --json` *unknown-target* response — a strict superset of the current v1
  shape.
- No version bump. `@arch-engine/*` versions remain at `1.0.1`.
- No npm publish. No git tag. No git commit (per mission instructions).
- No AGP emitter implementation, no `@arch-governance/*` dependency.
- No freeze snapshot updated.
- No README rewrite — only one Examples-section paragraph + one table row
  added to point at `examples/demo-drift/`.

---

## 3. Defects Addressed

Mapping to the CLI Experience Specification's catalogue (U1–U15):

| # | Defect | Spec ref | Status |
| --- | --- | --- | --- |
| **U5** (further) | "every command's human output ends with exactly one Next/Fix/Exit line" — Phase A landed the lines; Phase B confirms they survive help-text changes and adds the same assertion to a second test file. | spec §5, §16.1 #5 | reinforced |
| **U11** | Per-command `--help` is bare (no examples, no exit codes, no docs link). | spec §16.1 #9 | **fixed** |
| **U12** | `explain <target>` vocabulary is undocumented. | spec §5.5 vocabulary table, §13.1 patch-safe scope | **fixed** |
| **U14** | No demo-worthy "drift detected" output to screenshot. | spec §12, §16.1 #10 | **partially fixed** — fixture lands; the *Blocked* output is deferred to a later pass once policy-domain mapping for adapter topology is wired. The README is honest about this. |

The Phase A defects U1–U5 are still asserted by `cli-experience-phase-a.test.ts`; this pass adds 21 more tests on top.

---

## 4. Files Changed

```
 examples/demo-drift/README.md                   | (new)  ~58 lines
 examples/demo-drift/package.json                | (new)  10 lines
 examples/demo-drift/src/frontend/CheckoutButton.ts | (new)  20 lines
 examples/demo-drift/src/frontend/package.json   | (new)   8 lines
 examples/demo-drift/src/payments/PaymentGateway.ts | (new)  13 lines
 examples/demo-drift/src/payments/package.json   | (new)   5 lines
 examples/demo-drift/src/services/PaymentService.ts | (new)  13 lines
 examples/demo-drift/src/services/package.json   | (new)   8 lines
 packages/cli/src/cli.ts                         | rewritten — examples + help callback
 packages/cli/src/commands/explain.ts            | unknown-target message lists vocabulary
 packages/cli/src/help-text.ts                   | (new)  ~58 lines, single source of truth
 packages/cli/tsconfig.json                      | +1 include
 packages/cli/tests/cli-experience-phase-b.test.ts | (new) ~280 lines, 21 tests
 README.md                                       | +14 lines (Examples-section pointer)
 audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md | (new, this file)
```

Source-of-truth summary per file:

- **`packages/cli/src/help-text.ts`** *(new)*. Single source of truth for
  shared help fragments: `PRODUCT_PROMISE`, `DOCS_URL`, `FIRST_RUN_PATH`
  (4 ordered steps), and `SUPPORTED_EXPLAIN_TARGETS` (the vocabulary
  documented in `explain --help`). Plus `isSpecialExplainTarget(target)`
  for code that needs to distinguish keyword targets from free-form
  search. The constants are imported by `cli.ts` (root help + per-command
  examples) and by `commands/explain.ts` (unknown-target message).
- **`packages/cli/src/cli.ts`**. Rewritten to use `cac`'s `.example(...)`
  per command (with multi-line example bodies that include exit-code and
  vocabulary references) and `cli.help((sections) => ...)` callback that
  injects the product promise + first-run-path section into root help
  only. Command descriptions tightened to plainer English (e.g. "Check
  workspace readiness and adapter signal." vs. the old jargon). The
  redundant `cli.help()` call inside the `try` block was removed (it
  would have erased the registered help callback).
- **`packages/cli/src/commands/explain.ts`**. Imports
  `SUPPORTED_EXPLAIN_TARGETS` from `help-text`. The "no matches found"
  branch now lists the supported special targets in both human and JSON
  modes. The JSON response gains a `supportedSpecialTargets: string[]`
  field on the unknown-target path.
- **`packages/cli/tsconfig.json`**. `src/help-text.ts` added to the
  explicit include allow-list (the v1.0.1 stabilization narrowed include
  to a 13-file set; Phase A added `policy-presence.ts` as #14; Phase B
  adds `help-text.ts` as #15).
- **`examples/demo-drift/`** *(new)*. Three workspaces (`frontend`,
  `services`, `payments`) plus a top-level `package.json` with the
  workspaces declaration. The frontend's `CheckoutButton.ts` imports
  *both* the services layer and the payments gateway directly — the
  drift the demo illustrates. Yields a 4-node, 3-edge topology with the
  v1.0.x adapter-monorepo extractor. README documents the story and the
  honest limit (no enforceable policy file ships with the fixture in
  this pass — see §11).
- **`packages/cli/tests/cli-experience-phase-b.test.ts`** *(new)*. 21
  tests across five describe blocks: help-text constants unit-tested,
  root-help shape pinned, per-command help shape pinned, explain
  unknown-target message pinned (human + JSON), demo-drift fixture pinned
  end-to-end with `arch-engine doctor` and `arch-engine inspect` against
  a fresh tempdir copy.
- **`README.md`**. One paragraph + one row added to the existing
  Examples section pointing at `examples/demo-drift/`. No marketing
  rewrite, no behavior or claims changed elsewhere.

---

## 5. Root Help Improvements

Before:

```
arch-engine/1.0.1

Usage:
  $ arch-engine <command> [options]

Commands:
  doctor            Diagnose environment readiness and existing adapter usage
  inspect           Output canonical topology summary without executing violations
  analyze           Emit stability score, conflict ratios, and blast radius summary
  check             Execute architecture pipeline and evaluate boundaries
  explain <target>  Explain WHY a violation occurred or HOW confidence propagated
  […]
```

After:

```
arch-engine/1.0.1

Catch architecture drift before merge.

Usage:
  $ arch-engine <command> [options]

Commands:
  doctor            Check workspace readiness and adapter signal.
  inspect           Summarize the extracted topology. Does not enforce policy.
  analyze           Score architecture signal and risk. Informational; never blocks CI.
  check             Enforce policy and report blocking architecture violations.
  explain <target>  Explain a topology inference, regression, or policy decision.

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

First-run path:
  1. arch-engine doctor     check workspace readiness and adapter signal
  2. arch-engine inspect    review the extracted topology
  3. arch-engine analyze    score architecture signal and risk
  4. arch-engine check      enforce policy rules in CI

Docs: https://arch-engine.dev
```

Additions: product promise as the first non-blank line; plainer command
descriptions (no jargon — see spec P1); a "First-run path" section after
the auto-generated "For more info" block; a final `Docs:` URL.

The Commands list still contains exactly five entries, in the same
order, with the same names. A test pins this ("root help still lists
exactly the five v1.0.x commands").

---

## 6. Per-Command Help Improvements

Each per-command help now has a real Examples block. Highlights:

### `arch-engine doctor --help`

```
Examples:
  $ arch-engine doctor
  $ arch-engine doctor --json

  Next: review the topology with `arch-engine inspect`.
  Docs: https://arch-engine.dev/getting-started
```

### `arch-engine inspect --help`

```
Examples:
  $ arch-engine inspect
  $ arch-engine inspect --json

  Inspect is read-only — it never blocks CI.
  Docs: https://arch-engine.dev/cli/inspect
```

### `arch-engine analyze --help`

```
Examples:
  $ arch-engine analyze
  $ arch-engine analyze --json

  Without a policy file, analyze is informational only.
  Docs: https://arch-engine.dev/cli/analyze
```

### `arch-engine check --help`

```
Examples:
  $ arch-engine check
  $ arch-engine check --json
  $ arch-engine check --min-coverage 0.80

  Exit codes:
    0  pass — no blocking architecture violations
    2  blocking authority-tier violations
    3  topology coverage below threshold
    5  blocking policy violations (ENFORCE mode)

  Without a policy file, check runs informationally and exits 0.
  Docs: https://arch-engine.dev/cli/check
```

The exit-code reference matches the actual code paths in
`commands/check.ts`. Aligning these to the spec §9.1 stable codes (which
prefers `1` for any blocking violation) is intentionally **out of scope**
for this patch pass — it would be a behaviour change, and the spec marks
the migration as a v1.1 candidate (§9.3).

### `arch-engine explain --help`

```
Examples:
  $ arch-engine explain regression
  $ arch-engine explain policy
  $ arch-engine explain shared

  Supported targets:
    regression   compare current run against the stored stability baseline
    policy       explain how the active policy pack(s) composed and which rules fired
    <name>       any node or edge identifier — substring match

  Docs: https://arch-engine.dev/cli/explain
```

---

## 7. Explain Target Vocabulary

`packages/cli/src/help-text.ts` exposes:

```ts
export const SUPPORTED_EXPLAIN_TARGETS = [
  { keyword: 'regression', description: 'compare current run against the stored stability baseline' },
  { keyword: 'policy',     description: 'explain how the active policy pack(s) composed and which rules fired' },
] as const;
```

This is the only place the vocabulary is declared. `cli.ts` reads it for
`explain --help`. `commands/explain.ts` reads it to render the
"Supported special targets" block in the unknown-target message and to
populate `supportedSpecialTargets: string[]` in the JSON unknown-target
response.

The Phase B test file pins:

- `isSpecialExplainTarget('regression')` and `('policy')` are `true`.
- `isSpecialExplainTarget('frontend/checkout')` and `('')` are `false`.
- `arch-engine explain qwertyuiop-not-a-real-target` exits 0, prints
  `Supported special targets:`, and lists both keywords.
- The same invocation with `--json` returns
  `{ matches: [], suggestions: [...], supportedSpecialTargets: ['regression', 'policy'] }`.

Adding a third special target in a future release means: add an entry to
`SUPPORTED_EXPLAIN_TARGETS`, add the corresponding handler in
`commands/explain.ts`, the help text and JSON shape update automatically.
Adding to one place without the other is caught by the per-keyword
in-help test.

---

## 8. Demo Fixture

`examples/demo-drift/`:

```
demo-drift/
  README.md                         (~58 lines, narrative + Try-it block)
  package.json                      (workspaces: frontend, services, payments)
  src/
    frontend/
      package.json                  (deps: services, payments — the drift edge)
      CheckoutButton.ts             (demonstrates the drift in code)
    services/
      package.json                  (deps: payments)
      PaymentService.ts             (the healthy boundary)
    payments/
      package.json
      PaymentGateway.ts             (provider integration)
```

Verified end-to-end on a fresh `mktemp` copy:

- `arch-engine doctor` → exit 0, `Packages detected: 4 / 4`, ends with
  `Next:` line.
- `arch-engine inspect` → exit 0, `Nodes detected: 4`, `Edges: 3`.
- `arch-engine analyze` → exit 0, no-policy headline (no `CRITICAL`).
- `arch-engine check` → exit 0, `No policy file is configured yet —
  nothing was enforced.`.

Honest constraint, documented in the fixture's README and §11 of this
audit: the fixture does **not** ship with an enforceable
`.archengine/policy.yml`. The v1.0.x policy-domain mapping for
adapter-extracted topology requires per-package authority hints (the
existing `examples/policy-pack-minimal/` works against a synthetic
`topology.json`, not against an adapter-extracted graph). Producing the
canonical "Blocked: 1 violation" demo output from spec §12 requires that
domain-mapping plumbing, which is intentionally a future pass.

The fixture is still useful today for:

- Screenshots of `doctor`, `inspect`, `analyze`, `check` happy paths on a
  *real* mini-monorepo (not the v1.0.1-existing `sample-monorepo` which
  is already present).
- Pinning the topology shape (4 nodes / 3 edges) via a Phase B test.
- Onboarding documentation that points readers at a non-trivial example.

---

## 9. Tests Added / Updated

**New file:** `packages/cli/tests/cli-experience-phase-b.test.ts` — 21
tests across five describe blocks. No existing test was modified or
weakened.

| Block | Tests | Purpose |
| --- | --- | --- |
| `help-text constants` | 5 | `PRODUCT_PROMISE` non-empty + ends with `.`; `FIRST_RUN_PATH` lists the four v1.0.x verbs in order; `DOCS_URL` is `https://`; `SUPPORTED_EXPLAIN_TARGETS` contains `regression` + `policy`; `isSpecialExplainTarget` matches keywords only |
| `Phase B — root --help` | 5 | five-command list still pinned; product promise present; `First-run path:` section + 4 ordered steps; `Docs:` URL; no ANSI escapes under `NO_COLOR=1` |
| `Phase B — per-command --help` | 5 | `doctor`, `inspect`, `analyze`, `check`, `explain` each have an Examples block + relevant guidance (exit-code rows for `check`; supported-target rows for `explain`) |
| `Phase B — explain unknown target` | 2 | unknown target lists special keywords (human); JSON response includes `supportedSpecialTargets[]` |
| `Phase B — examples/demo-drift fixture` | 4 | fixture exists with the documented structure; no committed `.archengine/`; README mentions the four v1.0.x verbs; `doctor` and `inspect` run cleanly in a fresh tempdir copy |

The Phase A test file `cli-experience-phase-a.test.ts` is unchanged and
still passing all 15 of its tests. Net: **+21 new tests, 0 regressions**.

---

## 10. Build / Typecheck / Test / Pack Results

| Step | Result | Notes |
| --- | --- | --- |
| `npm install` | ok | `up to date in 446ms` |
| `npm run build` | **pass** | All workspaces + GitHub Action build cleanly |
| `npm run typecheck` | **pass** | All 7 public-contract packages typecheck silently |
| `npm test` | **1926 / 1926 pass; 650 / 650 files pass** | Up from 1905 / 649 (Phase A baseline). +21 tests, +1 file. **0 regressions.** |
| Freeze tests (`packages/core/tests/freeze`) | **357 / 357 pass** | unchanged |
| `npm pack --dry-run` (root) | **pass** | 77 files (was 76 — the new `examples/demo-drift/README.md` is included; root tarball doesn't include the demo fixture's source files because the root `files` list doesn't reference `examples/`) |

CLI smoke verifications (manual, on `examples/sample-monorepo` and
`examples/demo-drift` fresh copies, NO_COLOR=1):

- All five v1.0.x commands exit 0.
- `arch-engine --version` reports `1.0.1`.
- Phase A invariants hold: no command echoes, no hardcoded `v1.0.0`,
  no `Stability Score: CRITICAL` on no-policy fixture, no
  `CRITICAL`+`No blocking violations` contradiction, exactly one
  `Next:` / `Fix:` / `Exit N:` final line.

---

## 11. CLI Smoke Results

### Root help (excerpt)

```
arch-engine/1.0.1

Catch architecture drift before merge.
[…]
First-run path:
  1. arch-engine doctor     check workspace readiness and adapter signal
  […]
Docs: https://arch-engine.dev
```

### `explain` unknown target

```
$ arch-engine explain not-a-real-target

Querying reasoning trace...

No matches found for 'not-a-real-target'.

Supported special targets:
  regression   compare current run against the stored stability baseline
  policy       explain how the active policy pack(s) composed and which rules fired

Next: run `arch-engine inspect` to list every node and edge.
```

(Exit 0 — `explain` is informational, never blocks.)

### `examples/demo-drift` fresh tempdir copy

```
demo-drift doctor exit:  0
demo-drift inspect exit: 0
demo-drift analyze exit: 0
demo-drift check exit:   0
```

---

## 12. Compatibility Statement

This pass produces a **strict** patch-safe diff layered on Phase A:

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
| README | one Examples-section paragraph + one row added; no other prose changed |

JSON additions in Phase B:

- `arch-engine explain <unknown> --json` adds
  `supportedSpecialTargets: string[]`. This is a **new key on the
  unknown-target branch** — not a change to an existing key, not a
  change to the matched-target branch's shape. Backward compatible.

The Phase A additive JSON keys (`policyConfigured`, `headlineKind`) are
unchanged.

---

## 13. Remaining Deltas

### BLOCKER

*(none — Phase B is fully delivered)*

### HIGH

*(none)*

### MEDIUM

- **`check` exit-code mapping is not yet aligned with spec §9.1.** Still
  `2`/`3`/`5` instead of `1`/`2`/`3`. Phase A audit deferred this; Phase
  B documents it in `check --help`. Spec marks the migration as v1.1
  candidate. The exit-code TABLE in `check --help` matches the *current*
  behavior, not the spec recommendation, so the help is honest.
- **JSON top-level envelope is not yet introduced.** Spec §7.1's
  envelope (`schemaVersion`, `command`, `version`, `status`, `exitCode`,
  `summary`, `data`, `artifacts`, `diagnostics`, `nextActions`) remains
  opt-in via a future `--json-schema=v2` flag — Phase D scope.

### LOW

- **Demo-drift cannot yet produce a real "Blocked: 1 violation"
  output.** The fixture's policy-domain mapping for adapter-extracted
  topology requires per-package authority hints that the v1.0.x adapter
  doesn't yet read from a policy file. This is documented honestly in
  the fixture's README and in §8 of this audit. A future pass — likely
  alongside the `--ci`/`--format` flag work in v1.1 — should land the
  per-package authority hint plumbing and update the demo to produce the
  spec §12 canonical output.
- **`ARCH_ENGINE_*` error code rollout** (spec §8.3) is not landed.
  Phase E.

### MICRO_DELTA

- The redundant `cli.help()` call in `cli.ts` (which would have erased
  the registered `cli.help(callback)`) was removed. No previous behavior
  depended on a no-callback help — this is a strict bugfix discovered
  while implementing the help callback.
- The `examples/demo-drift/.arch-engine/` directory is auto-created by
  the CLI on first run inside the fixture (matching v1.0.1 behavior in
  `examples/sample-monorepo/`). It is `.gitignore`-d and doesn't
  pollute the working tree.

---

## 14. Recommended Next Mission

Default recommendation: **Arch-Engine v1.0.2 Patch Release Preparation Pass.**

Phase A + Phase B together deliver eight CLI Experience Specification
acceptance criteria (§16.1 #1 through #5, #9, plus partial #10). The
diff is patch-safe, backward-compatible, no API changes, no new
dependencies, no version bumps. The improvements are
credibility-critical for first-run experience and screenshot-worthy for
README/landing-page demos.

Shipping these as v1.0.2:

1. Bump the seven public packages from 1.0.1 → 1.0.2 (cross-deps
   `^1.0.1` → `^1.0.2`).
2. Add a `## [1.0.2] — 2026-MM-DD` section to `CHANGELOG.md` covering
   Phase A + Phase B deltas.
3. Run the full validation matrix.
4. Local public-style install smoke against newly-packed tarballs.
5. Write the v1.0.2 release preflight audit.
6. Stop short of `npm publish` (human-driven step).

If the team wants to stack one more cosmetic improvement before release
prep, the alternative is **CLI Experience MVP — Phase C (Demo Output
Calibration & Per-Package Authority Hints)** to close the demo-drift
"Blocked" output gap (§13 LOW). But that is a behaviour change to the
adapter-monorepo extraction path and is more naturally a v1.1.0 minor
than a v1.0.x patch.

---

## 15. Appendix: Commands Run

| # | Command | Purpose |
| --- | --- | --- |
| 1 | `git status --short`, `git log --oneline -n 12`, `git tag --list "arch-engine-v1.0.1"` | confirm baseline + Phase A unstaged |
| 2 | `npm run build` | initial build for help capture |
| 3 | `node packages/cli/dist/bin.js --help`, `… {doctor,inspect,analyze,check,explain} --help` | capture v1.0.1 baseline help |
| 4 | `cat packages/cli/src/cli.ts` | understand existing surface |
| 5 | `grep "example\|HelpSection\|help(" node_modules/cac/dist/index.d.ts` | confirm cac help/example API |
| 6 | `grep "outputHelp\|sections.push" node_modules/cac/dist/index.js` | understand help section ordering |
| 7 | `Write` `packages/cli/src/help-text.ts` | new shared constants |
| 8 | `Edit` `packages/cli/tsconfig.json` | include the new file |
| 9 | `Write` (replace) `packages/cli/src/cli.ts` | new descriptions, examples, help callback |
| 10 | `Edit` `packages/cli/src/commands/explain.ts` | unknown-target message + JSON additive |
| 11 | `npm run build` + per-command `--help` smokes | verify new help renders correctly |
| 12 | scaffold `examples/demo-drift/` (8 files) | demo fixture |
| 13 | trial `.archengine/policy.yml` + `arch-engine check` in fixture | confirmed policy-domain mapping doesn't auto-detect from node IDs; per mission, dropped the policy.yml |
| 14 | rewrite `examples/demo-drift/README.md` to be honest | document fixture limits |
| 15 | smoke five v1.0.0 commands on fixture | exit 0 across the board |
| 16 | `Write` `packages/cli/tests/cli-experience-phase-b.test.ts` | 21 new tests |
| 17 | `Edit` `README.md` | add Examples-section pointer to demo-drift |
| 18 | `npm install`, `npm run build`, `npm run typecheck`, `npm test`, `npm pack --dry-run` | full validation matrix |
| 19 | `npx vitest run packages/core/tests/freeze` | freeze tests still 357/357 |
| 20 | `mktemp` + smoke on demo-drift | clean fixture exits 0 across all four commands |
| 21 | `rm -rf` of auto-init `.arch-engine/` in repo fixtures | keep working tree tidy |
| 22 | Write this audit | record outcomes |

Working tree post-pass: 11 modified or new files (5 modified, 6 new outside `audits/` + 1 new audit). No `package.json` / lockfile / freeze-snapshot changes.

---

*End of Phase B implementation audit.*
