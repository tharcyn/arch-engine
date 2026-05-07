# Arch-Engine CLI Experience Specification

## 1. Status

- **Document state:** Draft v0.1
- **Document date:** 2026-05-06
- **Target Arch-Engine release line:** v1.0.x for non-breaking improvements, v1.1.0 for additive surface (`--ci`, `--format`, `--output`, etc.).
- **Implementation status:** spec only. No source has changed. No CLI behavior is changing in this pass. No flags are added in this pass.
- **Predecessor specs:** [`docs/contracts/cli-surface-contract.md`](../contracts/cli-surface-contract.md), [`docs/contracts/agp-emitter-contract.md`](../contracts/agp-emitter-contract.md), [`docs/contracts/determinism-contract.md`](../contracts/determinism-contract.md).
- **Predecessor audits:** the four v1.0.1 audits under `audits/` and `audits/release/`.

This document is the *experience contract*: what the CLI says, why, when, in what shape, and how it makes the product promise visible. It does not prescribe implementation tactics beyond what the experience requires.

---

## 2. Product Promise

> **Arch-Engine catches architecture drift before merge.**

Every CLI surface in this spec is judged against that single sentence. If a sentence the CLI prints does not help the user (a) detect drift, (b) understand drift, or (c) act on drift, that sentence is wrong by default and must justify itself.

A first-time user, ten seconds after running their second command, must be able to answer: *"What is this telling me, and what do I do next?"*

---

## 3. Current CLI Surface (v1.0.1)

```
arch-engine doctor                  Diagnose environment readiness and existing adapter usage
arch-engine inspect                 Output canonical topology summary without executing violations
arch-engine analyze                 Emit stability score, conflict ratios, and blast radius summary
arch-engine check                   Execute architecture pipeline and evaluate boundaries
                                      --min-coverage <pct>    Require minimum topology coverage (0.0–1.0)
                                      --sync                  Emit SaaS synchronization session locally
arch-engine explain <target>        Explain WHY a violation occurred or HOW confidence propagated

arch-engine --json                  Output results as JSON
arch-engine --no-color              Disable colorized output
arch-engine -h | --help             Display help
arch-engine -v | --version          Display version
```

These five command names are **frozen**. They will not be renamed, removed, or have their semantics inverted. Improvements happen *inside* their output and via additive flags.

### Observed v1.0.1 baseline

Captured from `examples/sample-monorepo` on 2026-05-06:

- Help output is plain `cac`-style: lists commands, lists global options, no examples, no exit code reference, no doc link.
- `doctor` prints the literal `arch-engine doctor` on line 1, then `Arch Engine CLI v1.0.0` and `Schema runtime v1.0.0` (two lines hardcoded with the wrong version). Then a column of ✔ marks for workspace detection. Ends with "No policy file detected" and a soft suggestion.
- `inspect` prints a table of topology counts and a domain distribution. Ends with "Adapters active: adapter-monorepo".
- `analyze` prints a table whose conclusion is **"Stability Score: CRITICAL (0.47)"** even on the healthy four-package fixture. Writes a `stability-score.json` artifact.
- `check` prints similar fields and concludes **"Stability Score: CRITICAL"** *and* **"✔ Verification complete. No blocking violations"** in the same screen — contradictory.
- `explain regression` prints "✔ No regression detected" or a short trace.
- All five commands exit `0`. `check` exits `0` even when classification is `CRITICAL`, which is correct in the *no-policy-file* case but invisibly correct.
- JSON outputs are populated and structured, but there is **no top-level envelope**: no `command`, no `version`, no `status`, no `exitCode`. The artifact path in `check --json` includes an absolute tempdir path.

---

## 4. CLI Experience Principles

These principles are normative for every output the CLI produces, in every command, in every mode.

### P1. No jargon before value

The first 5 lines a user reads must be plain English. Specialized vocabulary (`closureGraphHash`, `authority crossings`, `extraction mode`, `confidence variance`) only appears after the user has been told what the command actually concluded.

### P2. Human output should be understandable in 10 seconds

A reader with no Arch-Engine knowledge, glancing at the human-mode output for any command, must be able to answer "did anything go wrong?" within 10 seconds. The headline must be visible without scrolling.

### P3. JSON output must be deterministic and stable

Every `--json` payload is a stable contract. Keys are sorted. No timestamps inside identity-relevant fields. No `Date.now()` outputs in output keys other than a single, clearly-labelled `emittedAt`. No absolute paths unless explicitly path-normalized. (See §7.)

### P4. Every warning includes a next action

The CLI never tells the user "X is degraded" without telling them how to remediate or where to read more. A warning without a next action is reclassified as informational.

### P5. Every failure explains whether it blocks CI

When `check` prints a failure, the line that prints the failure also prints either `(blocks CI)` or `(does not block CI)`. The user never has to guess.

### P6. First run guides, not shames

If the user runs the CLI in a repo without a policy file, the output frames it as *"You haven't told Arch-Engine what to enforce yet — here's how"*, not *"⚠ no policy file detected"* on its own line as a warning. Setup gaps are guidance opportunities.

### P7. Missing policy is framed as setup guidance

Specifically: when no policy file is found, every command's footer prints **one** clear next-action sentence pointing at how to get value from the tool. Not five.

### P8. Unknown domains become improvement guidance

When `25% UNCLASSIFIED` shows up in a domain distribution, the output explains, in one sentence, what the user can do: rename a directory, add an adapter hint, or accept the classification.

### P9. Advanced details belong behind `--json` or `--verbose`

Component scores (`agreement_ratio`, `confidence_variance`), execution metrics (`extractionMs`), and internal structural fingerprints belong in JSON or `--verbose` mode. The default human output is for humans deciding what to do next, not for engineers debugging the engine.

### P10. The existing five-command surface remains stable

`doctor`, `inspect`, `analyze`, `check`, `explain` are the contract. Output content, formatting, and shape may improve. Names, semantics, and exit-code intent stay.

### P11. AGP remains invisible until explicitly requested

The AGP emitter (per [`docs/contracts/agp-emitter-contract.md`](../contracts/agp-emitter-contract.md)) is opt-in. The default output of any v1.0.x or v1.1.x command must contain zero references to `@arch-governance/*`, `agp_architecture_profile.v0.1`, or AGP record kinds. AGP appears only when the user passes a future `--emit-agp` flag.

### P12. CLI output is screenshot-worthy and PR-comment-worthy

Output reads well when:

- Pasted into a GitHub PR comment.
- Captured as a terminal screenshot for a tweet, README, or landing page.
- Printed in monochrome (no-color CI logs).
- Rendered without ligatures, in any monospace font.

If a section only looks good in a single 24-bit-color terminal, it's wrong.

---

## 5. Command Contracts

Each command contract has the same shape: **purpose**, **the questions it must answer**, **ideal human output**, **example**, **next-action policy**.

### 5.1 `arch-engine doctor`

**Purpose.** First-run readiness and environment diagnosis. Answers "can Arch-Engine run here at all?"

**Must answer.**

- Can Arch-Engine run in this directory?
- What workspace type was detected?
- Was a topology adapter found?
- Did topology extraction succeed?
- Is a policy file present?
- What should the user do next?

**Ideal human sections (in order).**

1. **Headline status.** One line. Either `Ready.`, `Ready (no policy yet).`, or `Not ready.`
2. **Workspace.** What was detected.
3. **Adapter.** Which adapter resolved. If none, why.
4. **Topology signal.** Nodes detected, coverage, confidence in plain words.
5. **Policy.** Found / not found. If not found, one-line guidance.
6. **Next step.** Exactly one sentence.

**Example: first run on a healthy npm monorepo, no policy.**

```
Ready (no policy yet).

  Workspace      yarn-npm monorepo (4 packages)
  Adapter        @arch-engine/adapter-monorepo
  Topology       4 nodes, 2 edges, structured extraction (high confidence)
  Policy         not configured

Next: run `arch-engine inspect` to see your topology, then add a policy
file to start enforcing rules. See https://arch-engine.dev/getting-started.
```

**Example: monorepo where the adapter package is missing.**

```
Not ready.

  Workspace      yarn-npm monorepo (4 packages)
  Adapter        not installed
  Topology       cannot extract until an adapter is installed
  Policy         not configured

Fix: install the workspace adapter:
  npm install --save-dev @arch-engine/adapter-monorepo
```

**Example: single-package non-workspace project.**

```
Ready (no policy yet).

  Workspace      single package
  Adapter        @arch-engine/adapter-monorepo
  Topology       1 node, 0 edges (low signal — small repo)
  Policy         not configured

Next: Arch-Engine works best on multi-package repos. For now, run
`arch-engine inspect` to see what it found. To configure architecture
rules, see https://arch-engine.dev/policies.
```

**Next-action policy.** Exactly one `Next:` or `Fix:` line, never two.

**Banned.** The literal text `arch-engine doctor` printed on the first line. Hardcoded `Arch Engine CLI v1.0.0` strings in the output (use `pkg.version`). The phrase "Authority crossings observed: 0" in the default human output (move to verbose).

**Exit code.** `0` on success and on "ready (no policy yet)". `3` on adapter resolution failure. `5` on unsupported workspace. `1` is reserved for `check`'s blocking-violation case.

### 5.2 `arch-engine inspect`

**Purpose.** Architecture topology summary, no enforcement.

**Must answer.**

- How many nodes and edges?
- What domains/layers exist in the repository?
- What relationships matter most? (highest-degree nodes; cross-domain edges)
- What is underclassified or low-signal?
- What should the user review next?

**Ideal human sections (in order).**

1. **Topology summary.** Counts (nodes, edges, crossings, coverage, connectivity).
2. **Domain distribution.** Sorted descending by count.
3. **Key relationships.** Up to 5 highlights — high-degree nodes, cross-domain edges.
4. **Low-confidence areas.** Up to 3 lines describing what couldn't be classified, and why.
5. **Next step.** Exactly one sentence.

**Example: healthy 4-package monorepo.**

```
Topology summary

  Nodes              4
  Edges              2
  Coverage           100%
  Confidence         high (structured yarn-npm extraction)

Domain distribution

  LIBRARY             3
  UNCLASSIFIED        1   (rename `tools/` to a known prefix to classify)

Key relationships

  api  →  shared
  web  →  shared

Next: run `arch-engine check` to evaluate policy boundaries. (No policy
file is configured yet — you'll see the topology pass through unrestricted.)
```

**Banned.** Printing `Adapters active: adapter-monorepo` as a section heading without context. Mixing `Extraction mode:` raw values into the human output (move to verbose).

**Exit code.** `0` always (informational command).

### 5.3 `arch-engine analyze`

**Purpose.** Architecture health and risk analysis. Score + drivers.

**Must answer.**

- What is the stability score?
- What does that score mean?
- What are the top 3 risk drivers?
- What is the blast radius of the most central component?
- What changed since baseline (if a baseline exists)?
- What should the user review?

**Ideal human sections (in order).**

1. **Stability headline.** Single sentence with score and friendly classification.
2. **Risk drivers.** Up to 3 bullet lines explaining what brought the score down.
3. **Blast radius.** Up to 3 entities ranked by reach.
4. **Confidence.** Plain English (high/medium/low) plus one explanatory clause.
5. **Artifact.** Where the JSON artifact was written, repo-relative.
6. **Next step.** Exactly one sentence.

**Crucial:** the headline classification must be **calibrated to first-run reality**. A 4-node fixture with no policy file MUST NOT be labelled `CRITICAL` in the headline. The current v1.0.1 behavior of producing `CRITICAL (0.47)` on a healthy fixture is the single biggest UX bug this spec wants the implementation pass to fix.

A practical recommendation, normative for the implementation pass:

> If `policyFilePresent === false`, the headline classification MUST NOT use any negative tier (`CRITICAL`, `WARNING`). Instead, the headline reads `Topology captured (no policy to evaluate against).` and the score is reported but not graded.

A second recommendation:

> Score classification should weight confidence. A 0.475 score derived from zero-policy zero-conflict zero-evidence is a *low-information* score, not a *critical* score. Implementations must distinguish "we evaluated and it's bad" from "we have no signal".

**Example: 4-package monorepo, no policy.**

```
Topology captured (no policy to evaluate against).

  Stability score    0.48 / 1.00 (low information — no policy signal yet)
  Coverage           100%
  Confidence         high

Top contributors to the score

  • Authority coverage: 0% — no policy pack defines authority tiers.
  • Trust-weighted confidence: 0.38 — only one adapter has voted.

Blast radius

  shared              touched by 2 dependents

Artifact written to .arch-engine/stability-score.json

Next: add a policy pack to start evaluating real architecture rules.
See https://arch-engine.dev/policies.
```

**Example: same repo, with a policy file producing a single warning.**

```
Architecture stability: warning.

  Stability score    0.74 / 1.00 (medium)
  Coverage           100%
  Confidence         high

Top risk drivers

  • frontend depends on infrastructure (boundary: layered-app v1)
  • api lacks an authority tier declaration
  • shared has a cross-domain edge into web

Blast radius

  shared              3 dependents
  api                 1 dependent

Artifact written to .arch-engine/stability-score.json

Next: review the boundary violation reported above; run
`arch-engine check` for a CI-style verdict.
```

**Banned.** Headline `CRITICAL` on a healthy or low-information fixture. Numbers without context (`average_trust_weighted_confidence: 0.375`) in default mode. Absolute paths in `Artifact written to …`.

**Exit code.** `0` always (informational command, never blocks CI).

### 5.4 `arch-engine check`

**Purpose.** Policy enforcement. The CI gate.

**Must answer.**

- Are there blocking violations?
- For each blocking violation: what rule was violated, by which edge or component?
- Why does the rule exist? (one sentence)
- What should the user fix?
- What exit code does CI receive, and why?

**Ideal human sections (in order).**

1. **Verdict line.** First non-blank line is one of: `Pass.`, `Pass with warnings.`, `Blocked: N violation(s).`
2. **Blocking violations.** Each on a multi-line block with edge, rule, "why it matters", "fix".
3. **Warnings.** Compact one-liners.
4. **Suggested fixes.** When violations exist, an indented "Try:" block with concrete commands or paths.
5. **CI summary.** Last line, machine-quotable: `Exit 1: 2 blocking violations.` or `Exit 0: no blocking violations (1 warning).`

**Example: pass.**

```
Pass.

  Workspace          yarn-npm monorepo (4 packages)
  Policy             policy-pack-authority v1.0.1
  Coverage           100%
  Violations         0 blocking, 0 warnings

Artifact: .arch-engine/stability-score.json
Exit 0: no blocking violations.
```

**Example: blocked.**

```
Blocked: 1 violation, 1 warning.

  Blocking
  ────────
  ✗ frontend/checkout → providers/payment-gateway   (blocks CI)
    Rule:    boundary.authority-tier
             frontend domain may not depend on providers domain.
    Why:     authority-tier policy enforces that gateway calls go through
             the api layer so payment provider changes never require a
             frontend release.
    Fix:     route the call through `api/payment-intent` instead, or
             extract the gateway interaction into a shared service in
             `services/payments`.

  Warnings
  ────────
  ⚠ shared depends on web                            (does not block CI)
    Rule:    layered-app
    Tip:     shared modules should not import from leaf apps. Consider
             moving the helper into shared, or removing the import.

Exit 1: 1 blocking violation.
```

**Example: pass with warnings.**

```
Pass with warnings.

  Warnings
  ────────
  ⚠ shared depends on web                            (does not block CI)
    Rule:    layered-app
    Tip:     ... (one-line guidance)

Exit 0: no blocking violations (1 warning).
```

**Banned.**

- The phrase `Stability Score: CRITICAL` appearing in the same screen as `✔ Verification complete. No blocking violations.` This is the v1.0.1 contradiction.
- Absolute paths.
- Output that doesn't end with an explicit `Exit N: …` line.
- Errors that print stack traces by default.

**Exit code.** See §9.

### 5.5 `arch-engine explain <target>`

**Purpose.** Tell the user *why* something happened — a violation, a confidence score, a topology inference, a regression.

**Must answer.**

- What is the target? (`<target>` is a stable identifier — see vocabulary below)
- What did Arch-Engine infer?
- Why did it infer that?
- What evidence supports it?
- How can the user influence the inference (rename a directory, add an adapter hint, override authority, etc.)?

**Target vocabulary.** The current v1.0.1 implementation accepts a small set of special targets (e.g. `regression`, `policy`) plus arbitrary node/edge identifiers. The vocabulary is currently undocumented. The spec requires the future `--help` output of `explain` to enumerate the supported targets and their syntax. Recommended initial target shapes:

| Target | Syntax | Meaning |
| --- | --- | --- |
| `regression` | literal keyword | explain why current run differs from the prior baseline |
| `policy` | literal keyword | explain how the policy pack(s) were composed |
| `<node-id>` | bare identifier (e.g. `shared`) | explain the node's classification, edges, and confidence |
| `<from> -> <to>` | edge identifier | explain that specific edge's classification |
| `rule:<rule-id>` | prefixed | explain a specific rule's intent and inputs |

**Ideal human sections (in order).**

1. **Target.** What was looked up (echoed back).
2. **Conclusion.** One-sentence summary of what was inferred.
3. **Evidence chain.** Up to 5 numbered lines: where each piece of evidence came from.
4. **Confidence.** Plain English plus the underlying score.
5. **Suggested action.** When applicable.

**Example: explaining an edge.**

```
Target: frontend/checkout → providers/payment-gateway

Conclusion: classified as a domain-boundary violation under the
layered-app policy pack.

Evidence

  1. Adapter `@arch-engine/adapter-monorepo` extracted the import from
     packages/frontend-checkout/src/payments.ts:12.
  2. `frontend` domain inferred from path prefix `frontend/`.
  3. `providers` domain inferred from path prefix `providers/`.
  4. Rule `boundary.authority-tier` defines `frontend` may not depend on
     `providers`.

Confidence: high (structured extraction, exact path match).

Suggested action: route through the api layer, or update the policy
pack to intentionally allow this edge.
```

**Example: target not found.**

```
Target not found: frontend/cheekcout

Did you mean:
  • frontend/checkout
  • frontend/cart

Tip: list all available targets with `arch-engine inspect --json`
(see the `nodes` and `edges` arrays).
```

**Banned.** Printing `null` or `regressionDelta: null` style raw JSON in human mode. The literal `regression` JSON envelope where 80% of the keys are `null` (current v1.0.1 behavior).

**Exit code.** `0` if the target was found and explained, even if the explanation is "this edge is fine". `2` if the target string is malformed. `0` *with* a "target not found" message for unknown targets — `explain` is informational, not a check.

---

## 6. Human Output Style Guide

### 6.1 Section headings

- Sentence-case, no trailing colon.
- One blank line above and below.
- Short underline `────────` style for inline grouping (UTF-8 box-drawing). Falls back to `--------` in `--no-color` only when the user's terminal lacks UTF-8 (extremely rare; spec defaults to UTF-8).

### 6.2 Status symbols

| Symbol | Meaning | Color (with `--color`) |
| --- | --- | --- |
| `✓` | success | green |
| `✗` | blocking failure | red |
| `⚠` | warning | yellow |
| `•` | bullet / list item | dim |
| `→` | edge / direction | dim |
| `─` | separator | dim |

ASCII fallback for `--no-color` MUST still emit the same symbols — UTF-8 is assumed; the `--no-color` flag affects color only, not characters.

### 6.3 Emoji policy

**No emoji in default output.** None. Emoji breaks ligatures, alignment, monochrome screenshots, and accessibility. The status symbols above (`✓`, `✗`, `⚠`) are the entire vocabulary of decoration.

### 6.4 Color strategy

- Default in TTY: colorized, but only for status symbols and selected number-tier classifications. **Never** colorize whole sentences.
- `--no-color`: strip all ANSI sequences. Output remains semantically equivalent (the symbols carry the meaning).
- Auto-disable in non-TTY (default behavior of `picocolors`). CI logs that capture terminal output get clean output for free.
- The `NO_COLOR=1` environment variable is honored.

### 6.5 Tables

- Maximum 2 columns in the default human view. Wider tables move to `--json` or `--verbose`.
- Left-justified labels, value-aligned right-hand column to a stable column.
- No box characters around tables. Two-space indentation.

### 6.6 Line length

- Soft target: 80 columns.
- Hard target: 100 columns.
- Wrap textual sentences at word boundaries; do not wrap structured rows.

### 6.7 Path formatting

- Display paths repository-relative when possible (`packages/cli/src/cli.ts`, not `/Users/.../cli.ts`).
- Use forward slash separators in displayed paths regardless of host OS.
- When the path is outside the current repo (e.g., a tempdir), show `…/<file>` to indicate elision.

### 6.8 Singular / plural grammar

The CLI counts must read naturally:

- `1 violation`, not `1 violations`.
- `2 violations`, not `2 violation`.
- `0 violations`, not `no violation` (consistent plural for zero).

### 6.9 Confidence display

- High / medium / low — those exact words, lowercase.
- Followed by a parenthetical reason: `high (structured yarn-npm extraction)`.
- Numeric scores hidden in default mode unless they are the headline; exposed in JSON and `--verbose`.

### 6.10 Score display

- Two decimals: `0.48`.
- Always paired with `/ 1.00` in default mode for context.
- Tier word (`high`, `medium`, `low`, or for analyze: `excellent`, `healthy`, `at risk`, `unhealthy`) precedes the number.
- **Never** print `CRITICAL` for low-information scores. (See §5.3.)

### 6.11 Missing-policy display

A single sentence, shown in `doctor`, `inspect`, `analyze`, and `check` when no policy file is found:

> *No policy file is configured yet — see https://arch-engine.dev/policies for setup.*

The sentence is calibrated as **informational** (not a warning). It is shown once per command run, in the footer.

### 6.12 No-violations display

When `check` finds nothing wrong, the output is short and confident:

```
Pass.

  Policy             policy-pack-authority v1.0.1
  Coverage           100%
  Violations         0 blocking, 0 warnings

Exit 0: no blocking violations.
```

That's it. No additional fluff.

### 6.13 Unknown-domain display

When a non-zero portion of nodes is `UNCLASSIFIED`, the output is reframed as **guidance** in inspect and doctor. Two compact lines:

```
  UNCLASSIFIED        1   (rename `tools/` to a known prefix to classify)
```

The hint string is generated from an adapter-supplied taxonomy of recognized prefixes. If no hint is available, the line reads `(see docs to add adapter hints)`.

### 6.14 Low-signal topology display

When `coverage < 80%` or `confidence == low`, the headline reads:

```
Topology captured with low signal.
```

…and an explanatory line follows. Never print large stability-score numbers next to a low-signal topology — the score is meaningless at that point.

### 6.15 CI mode display

When the future `--ci` flag is passed, the output:

- Drops decorative separators.
- Drops color (forced).
- Adds machine-quotable `Exit N:` final line.
- Disables `…` path elision (full repo-relative path always).

The non-`--ci` default already produces good CI output (color auto-disables in non-TTY); `--ci` is a deterministic variant for users who want explicit control.

### 6.16 Artifact path display

Always **repo-relative**:

```
Artifact: .arch-engine/stability-score.json
```

If the artifact is outside the repo (tempdir, custom output dir), prefix with `…`:

```
Artifact: …/stability-score.json
```

`--json` mode emits a separate `artifacts.absolutePath` field for tooling, plus `artifacts.relativePath` for display.

---

## 7. JSON Output Contract

> **v1.0.3 implementation note.** The full top-level envelope below
> (`schemaVersion`, `command`, `version`, `emittedAt`, `status`, `exitCode`,
> `summary`, `data`, `artifacts`, `nextActions`) is the v1.1 candidate
> shape and is **deferred** until a minor release. v1.0.3 ships an
> additive subset compatible with the existing flat JSON keys:
> `diagnostics: []` lands on every command's `--json`, and `check --json`
> additionally gains `violations: []` and `artifactRelativePath`. See
> [`json-error-language-spec.md`](./json-error-language-spec.md) for the
> exact v1.0.3 grammar; existing keys are preserved verbatim.

### 7.1 Top-level envelope (every command)

```jsonc
{
  "schemaVersion": "arch-engine.cli.v1",
  "command": "doctor" | "inspect" | "analyze" | "check" | "explain",
  "version": "1.0.1",
  "emittedAt": "2026-05-06T07:42:00Z",
  "status": "ok" | "warn" | "fail" | "info",
  "exitCode": 0 | 1 | 2 | 3 | 4 | 5,
  "summary": "<one-sentence machine summary>",
  "data": { /* command-specific payload */ },
  "artifacts": [ { "kind": "stability-score", "relativePath": ".arch-engine/stability-score.json", "absolutePath": "/abs/path" } ],
  "diagnostics": [ /* see §8 */ ],
  "nextActions": [ "Run `arch-engine inspect`" ]
}
```

Rules:

- **Top-level keys are sorted alphabetically** when serialized.
- `schemaVersion` is the JSON contract version, **independent** of the package version. Format: `arch-engine.cli.v1`. New keys are additive; removals or shape-changes require a new schema version.
- `command` is the CLI verb that produced the output.
- `version` is the `@arch-engine/cli` package version.
- `emittedAt` is the only wall-clock-derived field. ISO 8601 UTC, second resolution. NEVER part of any record's identity.
- `status` is one of four words; never freeform.
- `exitCode` mirrors §9 exactly.
- `summary` is a single sentence designed for log scrapers; max 200 chars; no newlines.
- `data` is command-specific (§7.2–§7.6).
- `artifacts` is always an array, even when empty. Each artifact MUST include both `relativePath` and `absolutePath` (consumers pick).
- `diagnostics` is an array of structured `{ code, severity, message, fix }` (§8).
- `nextActions` is an array of human-readable strings the human-mode output also surfaces.

### 7.2 `doctor.data`

```jsonc
{
  "data": {
    "ready": true,
    "policyConfigured": false,
    "workspace": {
      "type": "yarn-npm",
      "label": "yarn-npm monorepo",
      "packageCount": 4
    },
    "adapter": {
      "id": "@arch-engine/adapter-monorepo",
      "resolved": true
    },
    "topology": {
      "nodes": 4,
      "edges": 2,
      "coverage": 1.0,
      "confidenceTier": "high",
      "extractionMode": "structured"
    },
    "domainDistribution": {
      "APPLICATION": 0,
      "FOUNDATION": 0,
      "INFRASTRUCTURE": 0,
      "LIBRARY": 3,
      "SERVICE": 0,
      "UNCLASSIFIED": 1
    }
  }
}
```

`domainDistribution` keys MUST be sorted alphabetically.

### 7.3 `inspect.data`

```jsonc
{
  "data": {
    "topology": {
      "nodes": 4,
      "edges": 2,
      "crossings": 0,
      "coverage": 1.0,
      "connectivity": 1.0,
      "confidenceTier": "high",
      "extractionMode": "structured",
      "workspaceType": "yarn-npm"
    },
    "domainDistribution": { /* sorted alphabetically */ },
    "keyRelationships": [
      { "from": "api", "to": "shared", "type": "workspace_dependency" },
      { "from": "web", "to": "shared", "type": "workspace_dependency" }
    ],
    "lowConfidenceAreas": [
      { "kind": "unclassified-node", "id": "tools", "hint": "rename to a known prefix" }
    ],
    "adapters": [
      { "id": "adapter-monorepo", "version": "1.0.1" }
    ]
  }
}
```

`keyRelationships` SHOULD be capped at 5 entries by default; full graph is in JSON mode but should be reachable via a future `--full` flag.

### 7.4 `analyze.data`

```jsonc
{
  "data": {
    "scoreTier": "low-information" | "excellent" | "healthy" | "at-risk" | "unhealthy",
    "score": 0.48,
    "coverage": 1.0,
    "connectivity": 1.0,
    "confidenceTier": "high",
    "policyConfigured": false,
    "topRiskDrivers": [
      { "id": "authority-coverage", "label": "Authority coverage", "value": 0.0, "explanation": "no policy pack defines authority tiers" }
    ],
    "blastRadius": [
      { "id": "shared", "dependents": 2 }
    ],
    "components": {
      "agreementRatio": 0.0,
      "averageTrustWeightedConfidence": 0.375,
      "authorityCoverage": 0.0,
      "confidenceVariance": 0.0,
      "conflictRate": 0.0
    },
    "executionMetrics": { "extractionMs": 1, "pipelineMs": 4, "totalMs": 6 }
  }
}
```

`scoreTier` MUST equal `"low-information"` whenever `policyConfigured === false`. A negative tier (`at-risk`, `unhealthy`) is only valid when a policy pack actually contributed signal.

### 7.5 `check.data`

```jsonc
{
  "data": {
    "verdict": "pass" | "pass-with-warnings" | "blocked",
    "policyConfigured": true,
    "violations": {
      "blocking": [
        {
          "id": "v_<sha8>",
          "ruleId": "boundary.authority-tier",
          "edge": { "from": "frontend/checkout", "to": "providers/payment-gateway", "type": "workspace_dependency" },
          "severity": "blocking",
          "message": "frontend domain may not depend on providers domain",
          "rationale": "authority-tier policy enforces gateway calls go through api",
          "fix": "route through api/payment-intent or extract into services/payments",
          "ciBlocking": true
        }
      ],
      "warnings": [
        { "id": "w_<sha8>", "ruleId": "layered-app", "edge": { "from": "shared", "to": "web" }, "severity": "warning", "message": "shared imports from web", "fix": "remove the import or move helper to shared", "ciBlocking": false }
      ]
    },
    "policy": {
      "packs": [ { "id": "policy-pack-authority", "version": "1.0.1" } ],
      "totalRules": 27
    },
    "executionMetrics": { "extractionMs": 1, "pipelineMs": 4, "totalMs": 5 }
  }
}
```

Violation `id` is a stable `sha256("<command>|<ruleId>|<edge.from>|<edge.to>|<edge.type>")[0..8]` — stable across runs of the same input. No timestamps in identity.

### 7.6 `explain.data`

```jsonc
{
  "data": {
    "target": "frontend/checkout -> providers/payment-gateway",
    "targetKind": "edge" | "node" | "rule" | "regression" | "policy" | "unknown",
    "conclusion": "classified as a domain-boundary violation under layered-app",
    "evidence": [
      { "step": 1, "source": "adapter-monorepo", "detail": "extracted import from packages/frontend-checkout/src/payments.ts:12" },
      { "step": 2, "source": "domain-inference", "detail": "frontend domain inferred from path prefix" },
      { "step": 3, "source": "policy-pack-authority", "detail": "rule boundary.authority-tier forbids frontend → providers" }
    ],
    "confidenceTier": "high",
    "suggestedAction": "route through api or update the policy pack",
    "didYouMean": []
  }
}
```

When `targetKind === "unknown"` the response includes `didYouMean: ["frontend/checkout", ...]` (max 5).

### 7.7 Forbidden in `--json`

- `null` everywhere as a placeholder (current v1.0.1 `explain --json` regression is the anti-pattern).
- Wall-clock times anywhere except `emittedAt`.
- Absolute paths in any field other than `artifacts[].absolutePath` (which is explicitly opt-in for tooling).
- Random IDs, UUIDs, PIDs.
- Locale-sensitive ordering of keys or arrays.
- Non-JSON-serializable values (Sets, Maps, Dates, class instances).

---

## 8. Error Language Contract

> **v1.0.3 implementation note.** The structured error renderer described
> in this section ships in v1.0.3 via `packages/cli/src/error-codes.ts`
> and `packages/cli/src/format-error.ts`. The codified, byte-exact
> grammar (`diagnostics: []` JSON shape, `Title / Problem / Fix / Exit /
> Docs` human template, locked exit-code semantics) lives in
> [`json-error-language-spec.md`](./json-error-language-spec.md). Where
> §8 below conflicts with the JSON / Error-Language spec (notably the
> exit codes for `ARCH_ENGINE_GRAPH_SHAPE_INVALID` and
> `ARCH_ENGINE_INTERNAL_INVARIANT_FAILED`, which are now both `5`),
> the JSON / Error-Language spec is the source of truth.

### 8.1 Error envelope

Every CLI error — whether shown in human mode or JSON — has the same conceptual shape:

| Field | Required? | Notes |
| --- | --- | --- |
| `code` | yes | `ARCH_ENGINE_*` (see §8.3) |
| `title` | yes | <60 chars, sentence-case, no trailing punctuation |
| `message` | yes | one-paragraph plain English |
| `cause` | optional | one sentence describing what triggered it |
| `fix` | yes | one or more concrete actions the user can take |
| `severity` | yes | `blocking` \| `warning` \| `info` |
| `exitCode` | yes | mirrors §9 |
| `ciBlocking` | yes | boolean — does this stop a CI gate? |
| `docsHint` | optional | absolute or repo-relative URL |

### 8.2 Human rendering

```
Error: ARCH_ENGINE_ADAPTER_NOT_FOUND
  Workspace topology adapter is missing.

  Cause:   `@arch-engine/adapter-monorepo` is not installed.
  Fix:     npm install --save-dev @arch-engine/adapter-monorepo

  Docs:    https://arch-engine.dev/adapters

Exit 3: adapter resolution failed.
```

### 8.3 Error code vocabulary

| Code | Severity | Exit | Meaning |
| --- | --- | --- | --- |
| `ARCH_ENGINE_ADAPTER_NOT_FOUND` | blocking | 3 | A required topology adapter is missing. |
| `ARCH_ENGINE_POLICY_NOT_FOUND` | info | 0 | No policy file. Treated as guidance, not error. |
| `ARCH_ENGINE_INVALID_POLICY` | blocking | 2 | A policy file exists but failed to parse. |
| `ARCH_ENGINE_INVALID_CONFIG` | blocking | 2 | `arch-engine.yml` (or equivalent) is malformed. |
| `ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL` | warning | 0 | Coverage or confidence too low for meaningful evaluation. |
| `ARCH_ENGINE_UNSUPPORTED_WORKSPACE` | blocking | 5 | The repo's structure isn't recognized by any installed adapter. |
| `ARCH_ENGINE_GRAPH_SHAPE_INVALID` | blocking | 4 | Internal: an adapter emitted a malformed graph. |
| `ARCH_ENGINE_INTERNAL_INVARIANT_FAILED` | blocking | 4 | An invariant in `@arch-engine/core` was violated. Bug. |
| `ARCH_ENGINE_TARGET_NOT_FOUND` | info | 0 | `explain <target>` couldn't resolve the target. |
| `ARCH_ENGINE_NO_BASELINE` | info | 0 | `explain regression` ran without a stored baseline. |
| `ARCH_ENGINE_BLOCKING_VIOLATION` | blocking | 1 | `check` found a blocking architecture violation. |

### 8.4 Tone

- Action-first language. `"Install the adapter:"` is better than `"To proceed, you should consider installing the adapter."`
- Never reference internal class names, source line numbers, or commit hashes in default mode.
- Never print stack traces by default. `--verbose` (or `DEBUG=arch-engine:*` env var) is the gate.
- **Internal invariant failures** are *not* hidden — they must always tell the user this is a bug, what was supposed to be true, and how to file an issue. They are the only error class allowed to recommend "open an issue".

### 8.5 Stack trace policy

- Stack traces are **off by default**, every command, every error class.
- `--verbose` (new in v1.1) prints stack traces for `ARCH_ENGINE_INTERNAL_INVARIANT_FAILED` and `ARCH_ENGINE_GRAPH_SHAPE_INVALID` only.
- `DEBUG=arch-engine:*` is honored as an additional verbose toggle for parity with conventional Node CLIs.

---

## 9. Exit Code Contract

### 9.1 Recommended stable codes

| Exit | Meaning | Used by |
| --- | --- | --- |
| `0` | success / informational / no blocking violation | all commands on the happy path |
| `1` | blocking architecture violation | `check` only |
| `2` | invalid user input or config | `check`, `inspect`, `analyze` (when config is malformed); `explain` (malformed target string) |
| `3` | adapter or workspace resolution failure | any command, when it cannot proceed without a topology |
| `4` | internal invariant failure | any command, on a bug |
| `5` | unsupported environment | `doctor` primarily |

### 9.2 Current v1.0.1 behavior

- All five commands exit `0` on the happy path. Confirmed.
- `check` exits `0` even when classification is `CRITICAL`, **as long as no blocking violation occurred** (correct under §9.1).
- Invocation with no command: exit `1` (cac default). The spec wants this changed to `2` in v1.1 (since "no input" is a user-input issue, not a violation).
- Bad command (`arch-engine gibberish`): exit `1`. Same — should become `2` in v1.1.
- A real `ARCH_ENGINE_BLOCKING_VIOLATION` does not yet exist in v1.0.1 because the bundled CLI hasn't shipped a violating fixture; once policy enforcement is wired to exit `1`, this becomes the canonical CI gate.

### 9.3 Migration plan

Backward-compatible additive changes are safe. Any change to an existing exit code is breaking and waits for v1.1.

| Change | Compatibility | Target |
| --- | --- | --- |
| `check` returns `1` on real blocking violation | additive (v1.0.1 has no fixture that triggers this) | v1.0.x patch ok |
| `check` returns `2` on malformed config | additive | v1.0.x patch ok |
| `arch-engine` with no command returns `2` | breaking (`1` today) | v1.1.0 |
| Unknown command returns `2` | breaking (`1` today) | v1.1.0 |
| `doctor` returns `5` on unsupported workspace | additive (`0` today) | v1.0.x patch ok |
| `doctor` returns `3` on adapter resolution failure | additive | v1.0.x patch ok |

---

## 10. First-Run Onboarding Flow

### 10.1 Ideal journey

```
1. install        npm install --save-dev @arch-engine/cli @arch-engine/adapter-monorepo
2. doctor         confirm Arch-Engine can run, read the next-step line
3. inspect        see what topology Arch-Engine extracted
4. check          see whether (without a policy yet) any structural rules trip
5. (optional)     add a policy pack and re-run check
6. (later)        wire `arch-engine check` into CI
```

The user reaches usefulness at step 3. Steps 5 and 6 are opt-in.

### 10.2 Scenario: no policy file (the most common case)

`doctor` prints the "Ready (no policy yet)." headline plus a one-sentence next step. `inspect` works. `analyze` works but reports `Topology captured (no policy to evaluate against).` — never `CRITICAL`. `check` reports `Pass.` with the missing-policy guidance line.

### 10.3 Scenario: single-package repo

`doctor` reads `Workspace: single package`. `inspect` reads `1 node, 0 edges (low signal — small repo)`. `analyze` reports `low-information` tier and recommends a multi-package context.

### 10.4 Scenario: monorepo

The default best path. All commands work as designed.

### 10.5 Scenario: no adapter installed

`doctor` reads `Not ready.`, `Adapter: not installed`, with a `Fix:` line giving the exact `npm install` command. Exit `3`.

### 10.6 Scenario: low signal (small fixture, partial workspace)

Headlines reframe to `low signal` rather than `CRITICAL`. Score is reported but not graded.

### 10.7 Scenario: unknown domains

Domain distribution shows `UNCLASSIFIED: N (rename `tools/` to a known prefix to classify)` — see §6.13.

### 10.8 Scenario: no edges (e.g. disconnected packages)

`inspect` reports `0 edges (your packages don't depend on each other yet)`. Not framed as failure.

### 10.9 Scenario: no violations (with a policy file)

`check` reports `Pass.` — short, confident, no fluff (§6.12).

### 10.10 Scenario: invalid config

`check` reports `ARCH_ENGINE_INVALID_CONFIG` with a `Fix:` line pointing at the file and the parse error. Exit `2`.

### 10.11 `init` command

A future `arch-engine init` that scaffolds a starter policy file is **a v1.1+ candidate**. It is **not** part of v1.0.x. The current command surface stays at five.

---

## 11. CI Usage Model

### 11.1 Primary command

`arch-engine check` is the CI gate. Nothing else.

### 11.2 Output for PR logs

The default human output (color auto-disabled in non-TTY) is already PR-paste-friendly. The `Exit N: …` final line is the line a CI bot or scraper picks up. Example PR-comment bot rendering:

> ```
> Pass with warnings.
>
>   Warnings
>   ────────
>   ⚠ shared depends on web                            (does not block CI)
>     Rule:    layered-app
>     Tip:     remove the import or move the helper into shared.
>
> Exit 0: no blocking violations (1 warning).
> ```

### 11.3 Output for machines

`arch-engine check --json` is the machine surface. Top-level envelope per §7.1. Exit code is the source of truth; `data.verdict` is the human-readable mirror.

### 11.4 Future flags

| Flag | Release | Effect |
| --- | --- | --- |
| `--ci` | v1.1 | force monochrome, drop separators, force absolute path elision off, force machine-quotable summary |
| `--format <human\|json\|markdown\|github>` | v1.1 | choose output format. `markdown` is PR-comment-shaped. `github` includes `::error file=...,line=...::` annotations. |
| `--output <path>` | v1.1 | write the formatted output to a file in addition to stdout |
| `--baseline <path>` | v1.2 | compare against a stored topology snapshot for drift |
| `--upload <url>` | deferred | post artifact to a configured endpoint (SaaS-flavored; out of scope until a hosted service exists) |

### 11.5 Constraints

- No interactive prompts in any command. The CLI MUST never wait for stdin.
- Output deterministic across runs given the same input + the same Arch-Engine version. (The `emittedAt` envelope field is the only legitimate time-derived value.)
- Exit codes are the contract. The text changes; the codes don't.

### 11.6 Baseline comparison (future)

In v1.2 the user can do:

```
arch-engine check --baseline .arch-engine/baseline.json --format markdown
```

The output then includes a "What changed since baseline" section. Spec deferred.

### 11.7 Artifact upload path

`--output <path>` is sufficient for any CI to upload artifacts via existing CI primitives (GitHub `actions/upload-artifact`, etc.). Arch-Engine never uploads on its own.

---

## 12. Demo Output Target

This is the **single output** the implementation pass must be able to produce reliably for screenshots, the README, the landing page, and sales demos. A handcrafted fixture in `examples/demo-drift/` should reproduce it byte-for-byte.

### 12.1 The "drift detected" output

```
$ arch-engine check

Blocked: 1 violation, 1 warning.

  Blocking
  ────────
  ✗ frontend/checkout → providers/payment-gateway   (blocks CI)
    Rule:    boundary.authority-tier
             frontend domain may not depend on providers domain.
    Why:     payment provider changes shouldn't trigger frontend
             releases. Routing through api/ keeps the gateway
             integration internal.
    Fix:     route the call through `api/payment-intent`, or extract
             the gateway interaction into `services/payments`.

  Warnings
  ────────
  ⚠ shared depends on web                            (does not block CI)
    Rule:    layered-app
    Tip:     shared modules should not import from leaf apps.

  Policy             policy-pack-authority v1.0.1
  Coverage           100%
  Workspace          yarn-npm monorepo (12 packages)

Exit 1: 1 blocking violation.
```

### 12.2 Why this output works

- **Headline tells the story** in one line: `Blocked: 1 violation, 1 warning.`
- **Visual hierarchy** is monochrome-safe: `Blocking` and `Warnings` headers; `✗`/`⚠` carry the meaning.
- **Concrete edge** with two real package names that read as a real product.
- **Three-line explanation per violation:** Rule, Why, Fix. Every line answers a question.
- **CI verdict** at the bottom. The exit code is the contract.
- Fits in a 40-line terminal screenshot. Fits in a single PR comment. Reads correctly in monochrome.
- No emoji. No noise. No version stamps inside the body. No `Stability Score: CRITICAL` next to "no violations" contradiction.

### 12.3 Variants

The `examples/demo-drift/` fixture should also produce:

- A **Pass** variant — for "before drift" screenshots.
- A **Pass with warnings** variant — for "warnings-only" screenshots.
- A **multi-violation** variant — for "your repo when you've ignored Arch-Engine for six months" screenshots.

Each variant must be reproducible from a deterministic fixture; no random sample data.

---

## 13. v1.0.x Compatibility Rules

The spec must preserve, byte-for-byte, the v1.0.1 baseline that consumers have already adopted:

- **Five commands stay.** No renames. No removals. No semantic inversions of `doctor` / `inspect` / `analyze` / `check` / `explain`.
- **Install path stays.** `npm install --save-dev @arch-engine/cli @arch-engine/adapter-monorepo`.
- **Package identity stays.** `@arch-engine/cli` is the bin, `@arch-engine/core` is the runtime, `@arch-engine/adapter-monorepo` is the peer-optional adapter.
- **No default AGP output.** `--emit-agp` and the AGP emitter are opt-in surfaces. Default `--json` of any command MUST NOT contain `@arch-governance/*` references.
- **No required AGP dependency** for any v1.0.x command. The v1.0.x bundle does not pull `@arch-governance/*` at all.
- **No patch-release breakage.** A patch release MUST NOT change exit codes, command semantics, or top-level JSON keys. New keys: yes; removed/renamed keys: no.

### 13.1 Patch-release-safe (v1.0.2, v1.0.3, …)

The following are non-breaking and may ship as patches:

- Clearer human output (more readable headlines, plain-English risk drivers, better next-step lines).
- Fixes to the v1.0.1 UX bugs in §3 ("CRITICAL on healthy repo", hardcoded `v1.0.0` in `doctor`, command-name echo, contradictory `check` output).
- Better warning messages with `Fix:` lines.
- More actionable error messages.
- JSON additive keys (`schemaVersion`, `command`, `version`, `status`, `exitCode`, `summary`, `nextActions`, `artifacts.relativePath`).
- Path normalization in `artifactPath` outputs.
- Better `--help` per-command output (examples, exit codes, docs links).
- Documented `explain <target>` vocabulary in `--help`.
- **v1.0.3 (shipped):** additive `diagnostics: []` array on every command's `--json`; structured `ARCH_ENGINE_*` error-code vocabulary; `Title / Problem / Fix / Exit / Docs` human renderer; `violations: []` and `artifactRelativePath` on `check --json`. Existing keys preserved verbatim. See [`json-error-language-spec.md`](./json-error-language-spec.md).

### 13.2 v1.1 candidate (additive, non-breaking)

- `--ci` flag (§6.15).
- `--format <human|json|markdown|github>` (§11.4).
- `--output <path>` (§11.4).
- `--verbose` flag (§8.5).
- `--quiet` flag (suppresses everything except errors and exit code).
- `arch-engine init` command (scaffolds a starter policy).
- `arch-engine check --emit-agp` and the `@arch-engine/agp-emitter` package (per [`docs/contracts/agp-emitter-contract.md`](../contracts/agp-emitter-contract.md)).
- Calibrated `analyze` classification using `low-information` tier.

### 13.3 Deferred (out of scope until further notice)

- SaaS dashboard.
- Hosted registry.
- Federation runtime.
- Multi-language adapter expansion (Python, Go, Rust scanners).
- `auto-fix` / policy-suggestion commands.
- `arch-engine check --upload <url>`.
- Incremental drift detection.

---

## 14. v1.1 Candidate Improvements (consolidated)

| Surface | Description | Compatibility |
| --- | --- | --- |
| `--ci` | force CI-flavored output; deterministic, monochrome | additive flag |
| `--format` | choose `human`/`json`/`markdown`/`github` | additive flag |
| `--output` | duplicate output to a file | additive flag |
| `--verbose` | enable stack traces + numeric scores in human mode | additive flag |
| `--quiet` | drop everything but errors | additive flag |
| `init` | scaffold a starter policy pack | additive command |
| `check --emit-agp` | emit AGP records (per emitter contract) | additive flag |
| Calibrated `analyze` classification | `low-information` tier when no policy | breaking? — only the human-headline word changes; the score number is unchanged |
| Top-level JSON envelope | `{ schemaVersion, command, version, status, exitCode, summary, data, artifacts, diagnostics, nextActions }` | additive (existing keys move under `data`) |

### 14.1 The JSON envelope question

Adding a top-level envelope around the existing `--json` payload is the only borderline-breaking change in this spec. There are two paths:

**Path A — additive nesting.** v1.1 default `--json` adds the envelope, moving the v1.0.x payload into `data`. v1.0.x consumers break unless they update.

**Path B — opt-in envelope.** v1.1 adds a `--json-schema=v2` flag (or equivalent) that emits the enveloped form; default `--json` stays as-is. Bumps `--json-schema=v3` to flip the default in v2.0.

Spec recommendation: **Path B**. Existing CI consumers don't break; new consumers opt in for the envelope. Once we are confident in the v2 schema, v2.0.0 of the CLI flips the default.

---

## 15. Deferred / Non-Goals

The spec explicitly does not cover, and the implementation pass MUST NOT add:

- **Dashboard / SaaS.** Out of product scope.
- **Hosted registry.** Out of scope.
- **Federation runtime.** Out of scope.
- **Multi-language adapter expansion.** Out of v1.x scope.
- **`auto-fix` commands.** Off the roadmap.
- **AGP runtime usage.** Forbidden by the AGP emitter contract.
- **Telemetry** (anonymous usage stats, even opt-in). Out of v1.x scope; revisit when there is a privacy contract.
- **Auto-update / self-update commands.** npm handles updates.
- **Plugin system.** Adapter packages are the extension point.
- **Configuration via env vars** beyond `NO_COLOR` and `DEBUG`. Repeats configuration that belongs in flags or the policy file.

---

## 16. Acceptance Criteria for Implementation Pass

The next implementation pass — call it **"Arch-Engine CLI Experience MVP Implementation Pass"** — succeeds if and only if every item below is true.

### 16.1 v1.0.x patch scope (must ship in v1.0.2 or v1.0.3)

| # | Criterion | Verifiable by |
| --- | --- | --- |
| 1 | `doctor` no longer prints `arch-engine doctor` as the first line. | smoke |
| 2 | `doctor` no longer prints hardcoded `Arch Engine CLI v1.0.0` / `Schema runtime v1.0.0` strings. Version is read from `pkg.version`. | smoke |
| 3 | `analyze` and `check` headlines never print `CRITICAL` on a no-policy / low-information run. The `low-information` (or equivalent) tier is used. | fixture test |
| 4 | `check` does not print a stability classification and a "no blocking violations" line in the same screen on a no-policy run. | fixture test |
| 5 | Every command's last human-mode line is exactly one of: `Next: …`, `Fix: …`, `Exit N: …`. | fixture test for all five |
| 6 | `--json` mode for every command emits the new top-level envelope behind an opt-in `--json-schema=v2` (or equivalent). The current `--json` shape is preserved as default. | snapshot test |
| 7 | `inspect`, `analyze`, `check` artifact paths render as repo-relative in human mode. | smoke |
| 8 | `explain regression --json` no longer returns 80% `null` keys. The shape is calibrated to actual content. | snapshot test |
| 9 | Per-command `--help` includes a one-line example, an exit-code list, and a `Docs: <url>` line. | smoke |
| 10 | The `examples/demo-drift/` fixture exists and produces the §12 demo output byte-for-byte. | replay test |
| 11 | All v1.0.1 freeze tests still pass; no public export added. | existing freeze test suite |
| 12 | No new package dependency. | `git diff --stat` |
| 13 | Tag and publish as v1.0.2 (or v1.0.3 if v1.0.2 was used elsewhere) per the existing release workflow. | npm registry |

### 16.2 v1.1 minor scope (separate release)

| # | Criterion | Verifiable by |
| --- | --- | --- |
| 14 | `--ci`, `--format`, `--output`, `--verbose`, `--quiet` flags exist and behave per §6, §8, §11. | smoke + flag tests |
| 15 | `arch-engine init` scaffolds a minimal `arch-policy.yml`. | fixture test |
| 16 | `--json-schema=v2` is the default in v1.1; v1 schema remains accessible via `--json-schema=v1` for one minor release before being removed in v2. | snapshot test |
| 17 | All exit-code migrations from §9.3 are landed. | exit-code tests |
| 18 | `@arch-engine/agp-emitter@0.1.0` is published per the AGP emitter contract; `arch-engine check --emit-agp` works. | npm + smoke |

### 16.3 Out of scope for both passes

- README rewrite (handled in a separate documentation pass).
- Marketing site copy.
- Logo / branding changes.
- Any change to v1.0.x exit codes.

---

*End of CLI experience specification.*
