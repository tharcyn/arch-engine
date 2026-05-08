# Arch-Engine JSON v2 and CI Flags Specification

**Status:** **Draft / Spec Pass** — locks the contract for the v1.1.0
minor release. No code lands in this pass.

**Spec date:** 2026-05-08
**Spec author:** Claude Opus 4.7 (1M context), spec/design pass.
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Target version:** `arch-engine v1.1.0` (minor release)
**Pre-pass HEAD:** `314c5ab (tag: arch-engine-v1.0.3) chore(release): prepare arch-engine v1.0.3`

**Predecessor specs:**
- [`docs/cli/cli-experience-spec.md`](./cli-experience-spec.md)
- [`docs/cli/json-error-language-spec.md`](./json-error-language-spec.md)
- [`docs/cli/cli-readiness-matrix.md`](./cli-readiness-matrix.md)

**Predecessor audits:**
- [`audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_SPECIFICATION_AUDIT.md`](../../audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_SPECIFICATION_AUDIT.md)
- [`audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_IMPLEMENTATION_AUDIT.md`](../../audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_IMPLEMENTATION_AUDIT.md)
- [`audits/release/ARCH_ENGINE_V1_0_3_PATCH_RELEASE_PREFLIGHT.md`](../../audits/release/ARCH_ENGINE_V1_0_3_PATCH_RELEASE_PREFLIGHT.md)

---

## 1. Status

This is a **spec/design pass** authored after v1.0.3 shipped. It is
the binding contract for the v1.1.0 minor release. The spec is locked
when this document is committed; the implementation pass that follows
must conform byte-for-byte.

No source code, no tests, no `package.json`, no `CHANGELOG.md`, and no
freeze snapshots are touched in this pass. Any source change is the
job of the v1.1.0 implementation pass.

---

## 2. Purpose

v1.1.0 has three goals, in priority order:

1. **Lock a stable JSON v2 envelope.** v1.0.3's flat JSON keys
   (`score`, `coverage`, `violations[]`, `diagnostics[]`,
   `artifactRelativePath`, …) were shipped under the rule "additive
   only, never break v1.0.x consumers." That rule made v1 forever-flat.
   v2 promotes the additive shape into a real envelope
   (`schemaVersion`, `command`, `archEngineVersion`, `status`,
   `summary`, `data`, `diagnostics`, `violations`, `artifacts`,
   `nextActions`) so future fields land in the right slot, ordering is
   stable, and CI tools can write one parser that targets v2 forever.
2. **Make CI consumption first-class.** v1.0.3 already produces
   reasonable CI output, but the user has no opt-in to ask for
   "deterministic, machine-quotable, no-decoration." This pass adds
   `--ci`, `--quiet`, `--verbose` and locks their semantics so a CI
   pipeline can write `arch-engine check --ci` once and never tune it
   again.
3. **Open the markdown channel.** PR-comment markdown is the single
   most common request from CI consumers. v1.1.0 ships a stable
   markdown output for `check`, `analyze`, and `doctor` via
   `--format markdown` (and `--output <path>` for posting it back).

These three goals combine to consolidate the v1.0.3 JSON contract,
prepare the CLI for AGP-emitter integration in a later release, and
let CI integrations stop polling stdout and start parsing.

---

## 3. v1.1 Scope

### 3.1 In scope (minor-release-safe, additive)

- New flag: `--json-schema=v1|v2` (default `v1`).
- New flag: `--ci`.
- New flag: `--format human|json|markdown` (default `human`; `json` is
  an alias for `--json`).
- New flag: `--output <path>`.
- New flag: `--verbose`.
- New flag: `--quiet`.
- New JSON envelope shape `arch-engine.cli.v2`, opt-in via
  `--json-schema=v2`.
- New markdown output contract for `check`, `analyze`, `doctor` via
  `--format markdown`.
- New stdout/stderr/exit-code rules under `--ci`.
- New deprecation policy for JSON v1 → v2 (one-minor-window after
  default flip in v2.0.0).
- All existing v1.0.3 outputs remain byte-identical when invoked with
  the same flags they accepted in v1.0.3.

### 3.2 Not in v1.1 scope (out of band)

- AGP emitter implementation. `--emit-agp` is **not** added in v1.1.
- `@arch-engine/agp-emitter` package — separate v1.2 (or feature)
  release.
- `@arch-governance/runtime` or `@arch-governance/architecture-profile`
  dependency.
- New commands. The five public verbs (`doctor`, `inspect`, `analyze`,
  `check`, `explain`) stay frozen.
- Default JSON v1 → v2 flip. The default stays v1 in every v1.x line.
  v2.0.0 is the first version that may flip the default.
- Removing or renaming any v1 JSON key. v1 stays additive-only forever
  in v1.x.
- `--baseline <path>` for drift comparison. Deferred — separate spec
  pass after v1.1.0 ships.
- `--format github` (`::error file=...,line=...::` annotations).
  Deferred — narrow value, large surface area; revisit after v1.1.0
  has shipped and we have data on `--format markdown` adoption.
- Exit-code changes. The v1.0.2-locked exit-code contract (0 / 1 / 2 /
  3 / 5) is preserved verbatim.
- Removing `--no-color`, `--json`, `--min-coverage`, `--sync`. All
  v1.0.x flags carry forward unchanged.

---

## 4. Non-Goals

The following were considered and explicitly rejected for v1.1.0:

- **Top-level `violations` field** in v2 envelope. v2 nests them under
  `data.violations` (clean envelope) and reports the count in
  `summary.violations`. The flat top-level form was a v1.0.3 patch
  concession; v2 doesn't need to re-make that compromise.
- **Implicit JSON when `--ci` is set.** `--ci` is about determinism;
  `--json` / `--format json` is about format. They are orthogonal.
  Combining them is a user choice (`--ci --format json`).
- **`--output` to a directory** with auto-generated filenames.
  v1.1.0's `--output <path>` always names the exact file. Directory
  semantics are deferred.
- **`--output -`** to mean stdout. Redundant with omitting `--output`.
  Deferred.
- **Self-rotating output files.** No log-rotation semantics. The user
  controls overwrite via shell idioms.
- **Exit-code rewiring under `--ci`.** Exit codes are byte-identical
  across `--ci` and non-`--ci`. `--ci` only affects stdout/stderr
  formatting and color.
- **Pretty-printing toggles** (`--json-pretty=false`). v1.0.x already
  pretty-prints; tightening is a future concern.
- **Schema documents** (JSON Schema v7 files). Considered worth
  shipping but deferred to a v1.1.1 patch — the prose contract here is
  the source of truth for v1.1.0.

---

## 5. Current v1.0.3 Baseline

Captured for reference at HEAD `314c5ab` (tag `arch-engine-v1.0.3`).
The implementation pass MUST verify byte-identical preservation of
every default-mode v1.0.3 output.

### 5.1 Public CLI surface

```
arch-engine doctor    [--json] [--no-color]
arch-engine inspect   [--json] [--no-color]
arch-engine analyze   [--json] [--no-color]
arch-engine check     [--json] [--no-color] [--min-coverage <0..1>] [--sync]
arch-engine explain <target> [--json] [--no-color]
```

### 5.2 v1 JSON top-level keys (per command)

Captured from a clean run on `examples/sample-monorepo`
and `examples/demo-drift`.

**`doctor --json`** (17 keys):
```
environment, extractionMode, topologyConfidence,
topologyConfidenceLabel, confidenceDescription, detectedNodes,
expectedNodes, connectedNodes, coverage, connectivity, crossings,
domainDistribution, domainIntegrity, warnings, autoInitialized,
hasPolicyFile, diagnostics
```

**`inspect --json`** (14 keys):
```
nodes, edges, crossings, confidence, topologyConfidenceLabel,
confidenceDescription, coverage, connectivity, extractionMode,
workspaceType, domainDistribution, warnings, adaptersActive,
diagnostics
```

**`analyze --json`** (18 keys):
```
score, classification, stabilityTier, topologyConfidenceLabel,
coverage, connectivity, topologyConfidence, extractionMode,
workspaceType, authorityCrossings, domainDistribution, blast_radius,
components, warnings, executionMetrics, policyConfigured,
headlineKind, diagnostics
```

**`check --json`** (18 keys):
```
score, classification, stabilityTier, topologyConfidenceLabel,
coverage, connectivity, extractionMode, topologyConfidence,
authorityCrossings, blockerCrossings, warnings, executionMetrics,
artifactPath, policyConfigured, headlineKind, diagnostics, violations,
artifactRelativePath
```

**`explain regression --json`** (13 keys):
```
regressionSeverity, regressionConfidence, regressionConfidenceSource,
regression, regressionDelta, trendIndicators, comparisonBaseline,
stabilityTier, topologyConfidenceLabel, coverage, connectivity,
stabilityScore, diagnostics
```

### 5.3 Frozen subshapes

- `diagnostics[i]` keys: `code`, `severity`, `title`, `message`,
  `ciBlocking`, `fix?`, `path?`, `details?`, `docsHint?` (per
  json-error-language-spec §8.8).
- `violations[i]` keys: `id` (`v_<8-hex>`), `ruleId`, `edge: { from,
  to, type }`, `severity`, `ciBlocking`, `category`, `code`
  (`ARCH_ENGINE_BLOCKING_VIOLATION`).

### 5.4 Exit codes (frozen)

```
0   success / informational / no blocking violation
1   blocking architecture violation
2   invalid input or configuration
3   adapter or workspace failure
5   internal invariant failure
```

### 5.5 Stack traces

Hidden by default. Re-enabled only when
`process.env.DEBUG ~= /arch-engine/`.

---

## 6. JSON v2 Envelope

### 6.1 Shape

A v2 JSON document, regardless of command, has the following
top-level shape. Keys are listed in the canonical alphabetical order
the implementation MUST emit.

```jsonc
{
  "archEngineVersion": "1.1.0",
  "artifacts": [
    {
      "kind": "stability-score",
      "relativePath": ".arch-engine/stability-score.json"
    }
  ],
  "command": "doctor" | "inspect" | "analyze" | "check" | "explain",
  "data": { /* command-specific payload — see §7 */ },
  "diagnostics": [ /* CliDiagnostic[] from json-error-language-spec §8.8 */ ],
  "emittedAt": "2026-05-08T07:42:00Z",
  "exitCode": 0 | 1 | 2 | 3 | 5,
  "nextActions": [
    "Add `arch-policy.yml` to enforce boundaries."
  ],
  "schemaVersion": "arch-engine.cli.v2",
  "status": "passed" | "blocked" | "warning" | "error" | "internal_error" | "not_enforced",
  "summary": {
    "headline": "<one-sentence verdict>",
    "verdict": "<status, mirrors top-level>",
    "score": 0.85,
    "violations": 0,
    "warnings": 0,
    "diagnostics": 1
  }
}
```

### 6.2 Required vs optional fields

**Required on every v2 emission:**

| Field | Type | Notes |
| --- | --- | --- |
| `archEngineVersion` | string | The `@arch-engine/cli` package version. |
| `artifacts` | array | Always present; empty when none. |
| `command` | enum string | One of the five verbs. |
| `data` | object | Command-specific payload (§7). Always an object, never null. |
| `diagnostics` | array | Always present; empty when none. |
| `emittedAt` | string | ISO 8601 UTC, second resolution. The **only** wall-clock-derived field. |
| `exitCode` | integer | Mirrors §5.4. |
| `nextActions` | array | Always present; empty when none. |
| `schemaVersion` | string | Constant: `"arch-engine.cli.v2"`. |
| `status` | enum string | Per §6.4. |
| `summary` | object | Per §6.5. |

**No other top-level keys are allowed.** Future v2 expansion happens
inside `data` or new optional sub-objects on `summary` — not by
adding top-level keys without a `schemaVersion` bump.

### 6.3 Stable ordering expectations

- **Top-level keys** emitted in alphabetical order (matches §6.1).
- **`data.*` object keys** alphabetized recursively by the
  implementation. Ordering rules under `data` are spelled out in §7
  per command.
- **`diagnostics[]`** sorted by tuple
  `(severity rank desc, code asc, message asc)` where
  `INTERNAL > BLOCKING > ERROR > WARNING > INFO`. This is a v2
  refinement; v1 had no spec'd order.
- **`violations[]`** (under `data.violations` for `check`) sorted by
  `id` ascending. The `id` itself is a sha256-truncated 8-char form
  (locked in v1.0.3) so this is already deterministic; v2 just
  pins the order.
- **`artifacts[]`** sorted by `kind` ascending, then `relativePath`
  ascending. Stable across runs.
- **`nextActions[]`** preserves human-output display order — these
  strings mirror the human `Next:` / `Fix:` lines.

### 6.4 Status vocabulary

The `status` field uses one of six lowercase tokens. The
implementation MUST pick exactly one per emission:

| `status` | Meaning | Typical exit | Typical commands |
| --- | --- | --- | --- |
| `passed` | Command completed successfully and gave a clean verdict. For `check` this means "policy enforced and all rules passed." For `inspect`/`doctor`/`analyze` this is the normal informational completion. | `0` | all five |
| `not_enforced` | Command completed, but no policy was configured and so nothing was enforced. Distinct from `passed` because consumers want to detect "config gap" vs. "actually clean." | `0` | `check`, `analyze` |
| `warning` | Command completed; the result is informational but contains a `WARNING`-severity diagnostic (e.g., low-signal topology). | `0` | any |
| `blocked` | Command completed; one or more **blocking** violations were detected. | `1` | `check` only |
| `error` | The command could not complete because of invalid input, invalid config, or an adapter/workspace failure. | `2` or `3` | any |
| `internal_error` | The CLI hit an internal invariant. This is a bug. | `5` | any |

Status maps deterministically from `(exitCode, diagnostics[].severity,
data.violations.length)`. The mapping is documented in §6.4.1.

#### 6.4.1 Status derivation table

```
exitCode  | violations | top diag severity   | status
----------|-----------|---------------------|----------------
0         | -         | INFO (POLICY_NOT_FOUND) | not_enforced
0         | -         | WARNING             | warning
0         | -         | INFO or none        | passed
1         | >0        | BLOCKING            | blocked
2         | -         | ERROR               | error
3         | -         | ERROR               | error
5         | -         | INTERNAL            | internal_error
```

The `top diag severity` column means the highest severity in
`diagnostics[]`. If multiple severities apply, `internal_error` >
`blocked` > `error` > `warning` > `not_enforced` > `passed`.

### 6.5 Summary shape

`summary` is an object with at minimum a `headline` and a `verdict`.
Optional counters are included when they apply to the command:

```jsonc
{
  "summary": {
    "headline": "Blocked: 1 architecture violation.",
    "verdict": "blocked",
    "score": 0.47,           // analyze, check
    "violations": 1,         // check (count in data.violations)
    "warnings": 0,           // any (count of WARNING-severity diagnostics)
    "diagnostics": 2,        // any (total diagnostics[].length)
    "matches": 3             // explain (when matched-target run)
  }
}
```

`headline` is `string` ≤ 200 chars, no newlines, designed for log
scrapers. It mirrors the human `Title` line of the calibrated
output.

`verdict` is the same string token as `status` — included redundantly
inside `summary` so a caller that destructures `summary` doesn't need
the top-level `status` separately.

### 6.6 Path normalization

Per CLI Experience Spec §6.7 + json-error-language-spec §12.

- All paths under `data.*` are **repo-relative POSIX** strings.
- `artifacts[].relativePath` is **repo-relative POSIX**.
- `artifacts[].absolutePath` is **omitted by default** in v2. It is
  included only when `--verbose` is set OR a future `--with-absolute-paths`
  flag is set. (Different from v1: v1 always emits absolute paths;
  v2 defaults to no leakage.)
- When the artifact lives outside the cwd (e.g. tempdir runs),
  `relativePath` becomes `…/<basename>` — same elision marker as the
  human-mode display.
- `diagnostics[].path` (when present) is repo-relative POSIX.
- The implementation MUST NOT emit any absolute path in v2 default
  output. This is a v2-specific rule; v1 keeps absolute paths for
  backward compatibility.

### 6.7 Deterministic diagnostics order

`diagnostics[]` is sorted by:

1. Severity rank descending: `INTERNAL` (5) > `BLOCKING` (4) >
   `ERROR` (3) > `WARNING` (2) > `INFO` (1).
2. Code ascending lexicographically.
3. Message ascending lexicographically.

This sort is **stable** — duplicates by all three keys are emitted in
insertion order.

### 6.8 Deterministic violations order

`data.violations[]` (under `check`'s data payload) is sorted by `id`
ascending. The `id` is `v_<8-hex>` from a sha256 over the deterministic
inputs `(check | ruleId | from | to | category)`, so the sort is
already independent of evaluation order.

### 6.9 Artifact metadata

```jsonc
{
  "artifacts": [
    {
      "kind": "stability-score",
      "relativePath": ".arch-engine/stability-score.json"
    }
  ]
}
```

`kind` is one of:

| `kind` | Emitted by | Description |
| --- | --- | --- |
| `stability-score` | `analyze`, `check` | The stability artifact written under `.arch-engine/`. |

Future kinds (e.g., `agp-emission`, `policy-trace`) are added by future
spec passes. The kind vocabulary is closed within a given v2 spec
revision.

### 6.10 Backward-compatibility with v1 JSON

- A consumer that today calls `arch-engine check --json` keeps getting
  the v1 flat shape **unchanged** as long as `--json-schema=v2` is not
  passed.
- Every v1.0.3 key inside the v1 shape is preserved verbatim with the
  same value type.
- `--json-schema=v2` is purely additive: it produces a different
  envelope on opt-in, never alters the default.
- Implementation note: it is acceptable for the v2 emitter to compute
  the v1 payload and wrap it under `data:`, provided the resulting
  envelope satisfies §6.3's ordering rules and §6.6's path rules.

---

## 7. Command-Specific v2 Shapes

Each command's `data:` payload is locked in this section. **Inside
`data`, every existing v1 field MAY be present**, but the v2 layout
groups them into named sub-objects so future fields land cleanly.

### 7.1 `doctor.data`

```jsonc
{
  "data": {
    "ready": true,
    "policyConfigured": false,
    "workspace": {
      "type": "yarn-npm",
      "extractionMode": "structured",
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
      "connectivity": 1.0,
      "topologyConfidence": 0.85,
      "topologyConfidenceLabel": "high",
      "confidenceTier": "high"
    },
    "domains": {
      "APPLICATION": 0,
      "FOUNDATION": 0,
      "INFRASTRUCTURE": 0,
      "LIBRARY": 3,
      "SERVICE": 0,
      "UNCLASSIFIED": 1
    },
    "domainIntegrity": {
      "degraded": false,
      "unclassifiedRatio": 0.25,
      "message": null
    },
    "warnings": []
  }
}
```

`ready` is `true` iff the workspace was resolved AND the adapter loaded
AND coverage is ≥ the quality floor.

### 7.2 `inspect.data`

```jsonc
{
  "data": {
    "topology": {
      "nodes": 4,
      "edges": 2,
      "crossings": 0,
      "coverage": 1.0,
      "connectivity": 1.0,
      "topologyConfidence": 0.85,
      "topologyConfidenceLabel": "high",
      "extractionMode": "structured",
      "workspaceType": "yarn-npm"
    },
    "domains": { /* same shape as doctor */ },
    "warnings": [],
    "adaptersActive": ["adapter-monorepo"]
  }
}
```

### 7.3 `analyze.data`

```jsonc
{
  "data": {
    "stability": {
      "score": 0.85,
      "tier": "HEALTHY",
      "headlineKind": "tier",
      "policyConfigured": false
    },
    "topology": { /* same shape as inspect, plus authorityCrossings */ },
    "domains": { /* same shape as doctor */ },
    "blastRadius": { /* current v1 blast_radius payload */ },
    "components": [ /* current v1 components array */ ],
    "executionMetrics": {
      "extractionMs": 1,
      "pipelineMs": 3,
      "totalMs": 4
    },
    "warnings": []
  }
}
```

`headlineKind` carries forward from Phase A (v1.0.2) — values:
`"tier"`, `"no-policy"`, `"low-signal"`.

### 7.4 `check.data`

```jsonc
{
  "data": {
    "verdict": "passed" | "blocked" | "not_enforced",
    "stability": { /* same shape as analyze */ },
    "topology": {
      /* same as inspect, plus: */
      "authorityCrossings": 0,
      "blockerCrossings": 0
    },
    "domains": { /* same shape as doctor */ },
    "violations": [
      {
        "id": "v_f6766b5c",
        "ruleId": "frontend-must-not-touch-payment-gateway",
        "edge": { "from": "@x/frontend", "to": "@x/payments", "type": "workspace_dependency" },
        "severity": "error",
        "ciBlocking": true,
        "category": "explicit_forbid",
        "code": "ARCH_ENGINE_BLOCKING_VIOLATION"
      }
    ],
    "policyConfigured": true,
    "executionMetrics": { /* same shape as analyze */ },
    "warnings": []
  }
}
```

The `verdict` mirrors top-level `status` for the subset of values
`check` can emit. Consumers that read only `data.verdict` still get
the right answer.

`ciBlocking` is on each violation entry (matches v1.0.3's locked
shape).

### 7.5 `explain.data`

`explain` has multiple modes; the `data` shape varies by mode and
target.

**Matched target (substring match):**

```jsonc
{
  "data": {
    "target": "shared",
    "mode": "matched",
    "matches": [ /* canonical edge entries */ ],
    "extractionMode": "structured"
  }
}
```

**Unknown target (no match):**

```jsonc
{
  "data": {
    "target": "definitely-not-a-real-target",
    "mode": "unmatched",
    "matches": [],
    "suggestions": ["@x/foo", "@x/bar"],
    "supportedSpecialTargets": ["regression", "policy"]
  }
}
```

**Regression context (`explain regression`):**

```jsonc
{
  "data": {
    "target": "regression",
    "mode": "regression",
    "regression": {
      "detected": false,
      "baselineFound": true,
      "summary": "..."
    },
    "regressionSeverity": null,
    "regressionConfidence": null,
    "regressionConfidenceSource": null,
    "regressionDelta": null,
    "trendIndicators": null,
    "comparisonBaseline": { /* lineage */ },
    "stabilityTier": "HEALTHY",
    "topologyConfidenceLabel": "high",
    "coverage": 1.0,
    "connectivity": 1.0,
    "stabilityScore": 0.85
  }
}
```

**Policy context (`explain policy`):**

```jsonc
{
  "data": {
    "target": "policy",
    "mode": "policy",
    "explainSchemaVersion": 1,
    "policyHash": "sha256:...",
    "policyMode": "enforce",
    "policyVersion": "...",
    "matchedEdges": [ /* edges */ ],
    "violations": [ /* same shape as check.data.violations */ ]
  }
}
```

`explain` exits `0` for every mode (informational; never blocks). Even
when `data.violations` is non-empty, the top-level `status` is
`passed` and the violations are advisory under `explain`. Consumers
that want a CI gate should run `check`, not `explain`.

---

## 8. Flag Contracts

This section locks the precise semantics of every flag introduced in
v1.1.0 plus every flag that survives from v1.0.x. The implementation
pass MUST match these.

### 8.1 `--json-schema=v1|v2`

| Aspect | Contract |
| --- | --- |
| Type | string enum |
| Allowed values | `v1`, `v2` |
| Default | `v1` |
| Valid only with | `--json` or `--format json` |
| Default when used with markdown/human | exit 2 (conflict) |
| Invalid value | exit 2 with `ARCH_ENGINE_INVALID_CONFIG` diagnostic |

Examples:

```bash
arch-engine check --json                         # v1 (default)
arch-engine check --json --json-schema=v1        # v1 (explicit)
arch-engine check --json --json-schema=v2        # v2 envelope
arch-engine check --json --json-schema=v3        # exit 2
arch-engine check --json-schema=v2               # exit 2 (no --json)
```

### 8.2 `--ci`

| Aspect | Contract |
| --- | --- |
| Type | boolean flag |
| Default | off |
| Behavior | Forces `--no-color`; drops decorative separators in human output; uses full repo-relative paths (no `…` elision); emits machine-quotable `Exit N: <semantic>.` line for every exit; suppresses progress / spinner output. |
| Implies | nothing (does NOT imply `--json`, does NOT imply `--quiet`) |
| Compatible with | every other flag |
| Stdout | command output as usual; deterministic |
| Stderr | errors as usual; deterministic |
| Exit codes | unchanged (mirrors §5.4) |

`--ci` is about determinism and machine-quotability. It does not
change content; it changes presentation.

### 8.3 `--format human|json|markdown`

| Aspect | Contract |
| --- | --- |
| Type | string enum |
| Allowed values | `human`, `json`, `markdown` |
| Default | `human` |
| `--format json` semantics | identical to `--json` (aliases) |
| `--format json` + `--json` | allowed; both must agree (else exit 2) |
| `--format markdown` semantics | per §10 |
| `--format human` + `--json` | exit 2 (conflict) |
| `--format markdown` + `--json` | exit 2 (conflict) |
| Invalid value | exit 2 with `ARCH_ENGINE_INVALID_CONFIG` |

Rationale: `--json` is the v1 ergonomic alias users already know;
`--format` is the proper extensible knob for v1.1+. Both work; they
reduce to the same code path internally.

### 8.4 `--output <path>`

| Aspect | Contract |
| --- | --- |
| Type | string (filesystem path) |
| Default | unset (writes to stdout) |
| Behavior | Writes the formatted output (per `--format` / `--json`) to `<path>` instead of stdout. |
| Stdout when `--output` is set | empty (or status line in `--ci` only? — see below) |
| Stderr when `--output` is set | error messages still go to stderr |
| Parent directory creation | yes — recursively, like `mkdir -p` |
| Overwrite | yes (truncate-and-write); no `--no-overwrite` flag in v1.1.0 |
| Path normalization | `<path>` is interpreted relative to the cwd if not absolute |
| Trailing slash | rejected (must point to a file, not a directory) — exit 2 |
| Write failure | exit 2 with `ARCH_ENGINE_INVALID_CONFIG` and reason in `details` |
| Encoding | UTF-8, no BOM |
| Newlines | `\n` (LF) regardless of host OS |

When `--output` is set and the run produces a non-zero exit code, the
file is **still written** with whatever output the command produced.
A blocking `check` with `--output` writes the report file AND exits
with `1`. CI scripts that conditionally post the report should test
the exit code, not the file's existence.

When `--output` is set without `--ci` and not in JSON/markdown mode,
the human output is written to the file with **no ANSI codes** (since
files don't render color); the implementation MUST strip color even
if `--no-color` was not passed.

### 8.5 `--verbose`

| Aspect | Contract |
| --- | --- |
| Type | boolean flag |
| Default | off |
| Behavior in human mode | Adds diagnostic detail to the rendered output: one or two extra lines per `WARNING`/`ERROR`/`INTERNAL` diagnostic showing `details:` content; full repo-relative paths (no elision); execution timing breakdown; for `INTERNAL` severity, shows the stack trace. |
| Behavior in `--json` mode | When `--json-schema=v2`, includes `artifacts[].absolutePath`. Adds optional `traceback` string in `diagnostics[].details` for `INTERNAL` only. |
| Behavior in `--format markdown` | Includes a `<details>`-collapsed extras block per violation. |
| Equivalent toggle | Setting `DEBUG=arch-engine:*` activates the same stack-trace gate; `--verbose` is the discoverable surface. |
| Forbidden side effects | Never prints authentication tokens, API keys, environment variables, raw source code. Verbose adds engine self-description, not user-data dumps. |

`--verbose` is intentionally narrow. It does not switch on `DEBUG=*`
verbosity from third-party libraries.

### 8.6 `--quiet`

| Aspect | Contract |
| --- | --- |
| Type | boolean flag |
| Default | off |
| Behavior in human mode | Suppresses headers, sub-section titles, decorative output, hint lines, and `Next:` lines. The verdict (one line) and any `ERROR`/`INTERNAL` diagnostic still appear. |
| Behavior in `--json` mode | No effect (machine output is never silenced). |
| Behavior in `--format markdown` | No effect (markdown is fully formatted regardless). |
| Behavior in `--output` mode | The file content is still complete; only stdout is suppressed. |
| With `--verbose` | `--quiet` wins (suppresses verbose details); the user gets only the verdict and errors. |
| Errors still printed | `ERROR` and `INTERNAL` diagnostics always print to stderr; they are not silenced. |

`--quiet` is a stdout volume control. It never silences errors and
never silences machine outputs.

### 8.7 v1.0.x flags carried forward unchanged

| Flag | Behavior unchanged from v1.0.3 |
| --- | --- |
| `--json` | Same as v1.0.3. Defaults to v1 schema. |
| `--no-color` | Same as v1.0.3. Disables color output. |
| `--min-coverage <0..1>` | (`check` only) Same as v1.0.3; exit 3 when threshold not met. |
| `--sync` | (`check` only) Same as v1.0.3; opt-in SaaS sync stub. |
| `--help` / `-h` | Same as v1.0.3 + new flags listed. |
| `--version` / `-v` | Same as v1.0.3; reports `1.1.0`. |

---

## 9. Flag Interaction Matrix

Conflicts and precedence rules for every cross-flag combination
introduced or affected by v1.1.0. **Exit 2** in this section means
"invalid input or configuration" with an `ARCH_ENGINE_INVALID_CONFIG`
diagnostic.

### 9.1 Format ↔ JSON ↔ Schema

| `--json` | `--format` | `--json-schema` | Allowed | Behavior |
| --- | --- | --- | --- | --- |
| (none) | (none) | (none) | ✓ | human output (default) |
| ✓ | (none) | (none) | ✓ | JSON v1 (current default) |
| ✓ | (none) | `v1` | ✓ | JSON v1 (explicit) |
| ✓ | (none) | `v2` | ✓ | JSON v2 envelope |
| ✓ | (none) | `v3` | ✗ | exit 2 (invalid value) |
| (none) | `human` | (none) | ✓ | human output |
| (none) | `human` | `v2` | ✗ | exit 2 (`--json-schema` is JSON-only) |
| (none) | `json` | (none) | ✓ | JSON v1 (alias for `--json`) |
| (none) | `json` | `v2` | ✓ | JSON v2 envelope |
| (none) | `markdown` | (none) | ✓ | markdown output |
| (none) | `markdown` | `v1` | ✗ | exit 2 (`--json-schema` is JSON-only) |
| (none) | `markdown` | `v2` | ✗ | exit 2 (same) |
| ✓ | `json` | (any) | ✓ | identical paths; both must agree |
| ✓ | `human` | (any) | ✗ | exit 2 (conflict) |
| ✓ | `markdown` | (any) | ✗ | exit 2 (conflict) |

### 9.2 Verbosity ↔ Output

| `--verbose` | `--quiet` | Allowed | Behavior |
| --- | --- | --- | --- |
| off | off | ✓ | default |
| on | off | ✓ | verbose |
| off | on | ✓ | quiet |
| on | on | ✓ | quiet wins (suppresses verbose extras); errors still shown |

`--verbose` and `--quiet` are NOT mutually exclusive; they compose.

### 9.3 CI ↔ everything

| `--ci` | other | Allowed | Behavior |
| --- | --- | --- | --- |
| ✓ | (none) | ✓ | deterministic human |
| ✓ | `--json` | ✓ | deterministic JSON v1 |
| ✓ | `--json --json-schema=v2` | ✓ | deterministic JSON v2 |
| ✓ | `--format markdown` | ✓ | deterministic markdown |
| ✓ | `--no-color` | ✓ | redundant (`--ci` already forces no-color); accepted |
| ✓ | `--quiet` | ✓ | deterministic + quiet (typical CI log mode) |
| ✓ | `--verbose` | ✓ | deterministic + verbose |
| ✓ | `--output <path>` | ✓ | deterministic + write to file |

`--ci` composes with every other flag. It is purely a presentation
layer toggle.

### 9.4 Output ↔ everything

| `--output` | other | Allowed | Behavior |
| --- | --- | --- | --- |
| `<path>` | (none) | ✓ | writes plain (no-ANSI) human to file; stdout empty |
| `<path>` | `--json` | ✓ | writes JSON v1 to file |
| `<path>` | `--json --json-schema=v2` | ✓ | writes JSON v2 to file |
| `<path>` | `--format markdown` | ✓ | writes markdown to file |
| `<path>` | `--quiet` | ✓ | file content full; stdout empty |
| `<path>` | `--verbose` | ✓ | file content includes verbose extras |
| `<path>` (trailing slash) | any | ✗ | exit 2 (must point to a file) |
| `<path>` (write fails) | any | ✗ | exit 2 with `ARCH_ENGINE_INVALID_CONFIG` |

### 9.5 Blocking violations under each combination

`check` with a blocking violation behaves identically across all
output combinations:

| Combination | Stdout/file | Exit |
| --- | --- | --- |
| `check` (default human) | violation rendered | `1` |
| `check --ci` | deterministic human | `1` |
| `check --json` | violation in `violations[]` | `1` |
| `check --json --json-schema=v2` | violation in `data.violations` | `1` |
| `check --format markdown` | markdown report with violation table | `1` |
| `check --output report.md --format markdown` | file written; stdout empty | `1` |
| `check --quiet` | one-line verdict on stderr; nothing on stdout | `1` |
| `check --quiet --json` | full JSON on stdout (machine output never silenced) | `1` |

The exit code is **always** `1` for blocking violations, regardless of
format, regardless of verbosity, regardless of where output goes.

---

## 10. Markdown Output Contract

`--format markdown` produces a stable, deterministic markdown document
suitable for posting as a PR comment. v1.1.0 supports markdown for
`check`, `analyze`, and `doctor`. `inspect` and `explain` emit
markdown via a basic template (§10.5).

### 10.1 Determinism rules

- No `Generated at` lines, no timestamps in markdown body.
- No absolute paths.
- Tables use `|`-pipe markdown.
- Multi-byte characters allowed (✓ etc.); Unicode escapes forbidden.
- Trailing newline at end of file.
- LF line endings.
- Order matches `data.*` ordering rules from §6.7 / §6.8.

### 10.2 `check` markdown template

```markdown
# Arch-Engine `check`

**Verdict:** Blocked

| Metric | Value |
| --- | --- |
| Stability | CRITICAL (0.47 / 1.00) |
| Coverage | 100% |
| Connectivity | 100% |
| Confidence | high |
| Policy | configured (enforce mode) |

## Violations (1)

| Rule | From | To | Severity | CI-blocking |
| --- | --- | --- | --- | --- |
| `frontend-must-not-touch-payment-gateway` | `@demo-drift/frontend` | `@demo-drift/payments` | error | yes |

## Diagnostics (1)

- **`ARCH_ENGINE_BLOCKING_VIOLATION`** (BLOCKING): Detected 1 blocking architecture violation in enforce mode.

## Next

- Remove or re-route the offending edge(s) above, or update your policy to allow them.

---

_Exit 1 — blocking architecture violations._
```

### 10.3 `check` markdown — passed variant

```markdown
# Arch-Engine `check`

**Verdict:** Passed

| Metric | Value |
| --- | --- |
| Stability | HEALTHY (0.85 / 1.00) |
| Coverage | 100% |
| Connectivity | 100% |
| Confidence | high |
| Policy | configured (enforce mode) |

## Violations (0)

_No blocking architecture violations._

## Diagnostics (0)

_No diagnostics._

## Next

- Continue iterating; re-run `arch-engine check` on each PR.

---

_Exit 0 — no blocking architecture violations._
```

### 10.4 `analyze` and `doctor` markdown templates

Same overall structure as §10.2: `# Heading`, `**Verdict:**` line,
metrics table, `## Diagnostics`, `## Next`, `---`, exit footer. The
table and section content varies by command.

`analyze` uses the calibrated headline (Phase A / `headlineKind`):

- `headlineKind === "tier"` → `**Verdict:** {STABLE|HEALTHY|WARNING|CRITICAL}`
- `headlineKind === "no-policy"` → `**Verdict:** No policy configured`
- `headlineKind === "low-signal"` → `**Verdict:** Low-signal topology`

`doctor` uses readiness:

- `**Verdict:** Ready` (when `data.ready === true`)
- `**Verdict:** Adapter missing` (when `ARCH_ENGINE_ADAPTER_NOT_FOUND`)
- `**Verdict:** Workspace not supported` (when `ARCH_ENGINE_UNSUPPORTED_WORKSPACE`)
- `**Verdict:** Not enforced` (when no policy configured but otherwise healthy)

### 10.5 `inspect` and `explain` markdown templates

These are informational; markdown is a thin wrapper over the JSON
content. `inspect` produces a topology summary table; `explain`
produces a relationships table for matched targets and a
"no-match + suggestions" block for unknown targets. Both are
single-section and have no `Violations`/`Verdict` block.

### 10.6 Path safety in markdown

Per §6.6 path normalization:

- File paths in tables are repo-relative POSIX, wrapped in backticks.
- External paths render as `…/<basename>`.
- The implementation MUST NOT emit absolute paths in markdown.

### 10.7 Length cap

Markdown reports cap at:

- 50 violations (table truncated with `_…and N more (see artifact)._`)
- 25 diagnostics
- 250 KB total document size (over-cap → truncate violations table
  first, then diagnostics list; never truncate the verdict line)

CI tools that require the full set MUST consume the JSON v2 envelope.

---

## 11. CI Usage Model

### 11.1 Canonical CI commands

```bash
# Default — human output, exit code is the source of truth.
arch-engine check --ci

# Machine-readable JSON v2 for tooling.
arch-engine check --ci --json --json-schema=v2

# Markdown for PR comment posting.
arch-engine check --ci --format markdown --output arch-engine-report.md
```

### 11.2 Exit behavior

Exit codes are **identical** under `--ci` and non-`--ci`. The exit
code is the source of truth for whether the check passed. CI scripts
should test exit code first; format only affects how the human reads
the log.

### 11.3 Stdout / stderr behavior under CI flags

| Mode | stdout | stderr |
| --- | --- | --- |
| `--ci` (human) | deterministic verdict + violations table | errors only |
| `--ci --json` | JSON v1 document | errors only |
| `--ci --json --json-schema=v2` | JSON v2 envelope | errors only |
| `--ci --format markdown` | markdown report | errors only |
| `--ci --format markdown --output report.md` | empty | errors only |
| `--ci --quiet` | one-line verdict | errors only |

In every mode, **stderr** carries `ERROR` and `INTERNAL` diagnostics.
Even `--quiet` does not silence stderr.

### 11.4 GitHub Actions example

```yaml
- name: Architecture check
  run: npx arch-engine check --ci

- name: Architecture report (always)
  if: always()
  run: |
    npx arch-engine check --ci --format markdown --output arch-engine-report.md
    if [ -f arch-engine-report.md ]; then
      gh pr comment ${{ github.event.pull_request.number }} \
        --body-file arch-engine-report.md
    fi
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The first step gates the build; the second always runs and posts the
report regardless of pass/fail.

### 11.5 GitLab CI example

```yaml
arch-engine check:
  script:
    - npx arch-engine check --ci
  artifacts:
    when: always
    reports:
      # GitLab merge request widget reads any markdown artifact.
      junit: []
    paths: [arch-engine-report.md]
  before_script: []
  after_script:
    - npx arch-engine check --ci --format markdown --output arch-engine-report.md || true
```

### 11.6 No-color default

`--ci` forces `--no-color`. Color codes never appear in CI logs by
default. This matches the behavior CI consumers expect.

### 11.7 Path policy under CI

Under `--ci`, paths are full repo-relative (no `…` elision). A
consumer pasting a path into another tool gets a usable string.

### 11.8 Failure example: blocking violation

```bash
$ arch-engine check --ci
... metrics ...

Blocked: 1 architecture violation.

  ✗ @x/frontend → @x/payments   (blocks CI)
    Rule:     frontend-must-not-touch-payment-gateway
    Severity: error

Fix: remove or re-route the offending edge(s) above, or update your policy to allow them.
Exit 1: blocking architecture violations.
$ echo $?
1
```

### 11.9 Failure example: invalid policy

```bash
$ arch-engine check --ci
Invalid policy file.

Problem:
  Could not parse `.archengine/policy.yml`:
  ...

Fix:
  Edit your policy file to fix the problem reported above.

Exit 2: invalid input or configuration.
Docs: https://arch-engine.dev/policies/syntax
$ echo $?
2
```

### 11.10 Failure example: adapter missing

```bash
$ arch-engine check --ci
Workspace topology adapter is missing.

Problem:
  The workspace adapter could not extract topology for this repo.
  Underlying error: Cannot find module '@arch-engine/adapter-monorepo'.

Fix:
  Run `arch-engine doctor` to inspect adapter detection.
  Install the adapter:
    npm install --save-dev @arch-engine/adapter-monorepo

Exit 3: adapter or workspace failure.
Docs: https://arch-engine.dev/adapters
$ echo $?
3
```

---

## 12. Error / Exit Code Compatibility

The v1.0.2-locked exit-code contract carries forward verbatim. v1.1.0
adds **no new exit codes** and changes **no existing exit code**.

| Exit | Meaning | New in v1.1.0? |
| --- | --- | --- |
| 0 | success / informational / no blocking violation | unchanged |
| 1 | blocking architecture violation | unchanged |
| 2 | invalid input or configuration | unchanged (now also fires for invalid `--json-schema`, `--format`, `--output` values) |
| 3 | adapter or workspace failure | unchanged |
| 5 | internal invariant failure | unchanged |

`ARCH_ENGINE_INVALID_CONFIG` (exit 2) is the diagnostic code for every
new invalid-flag scenario in v1.1.0.

The 11 `ARCH_ENGINE_*` codes locked in
`json-error-language-spec.md` §6.2 carry forward unchanged. v1.1.0
adds **no new codes** in the public vocabulary; the implementation may
introduce internal sub-categorisation if it wants, but the externally
visible vocabulary stays at 11.

---

## 13. Path and Privacy Policy

### 13.1 Repo-relative POSIX everywhere by default

All paths in v2 emissions are repo-relative POSIX strings. Forward
slashes, no leading `/`, no Windows drive letters. Implementation MUST
normalize on write.

### 13.2 Absolute path leakage policy

| Mode | `artifacts[].absolutePath` |
| --- | --- |
| v1 default (`--json` / `--json-schema=v1`) | present (backward-compat) |
| v2 default (`--json --json-schema=v2`) | **absent** |
| v2 with `--verbose` | present |

This is a v2-specific tightening: machine consumers parsing v2 should
be path-safe by construction. Power users opting into `--verbose`
explicitly acknowledge they want the absolute paths.

### 13.3 No leaked secrets

Never emit:

- Environment variables (other than CI-relevant ones the user passed
  via `--<flag>`).
- API keys, tokens, signing keys.
- Source code from the repository.
- Email addresses or usernames found in `package.json`'s `author` or
  `contributors` fields.

### 13.4 No filesystem reads outside cwd / `.arch-engine/`

The CLI reads:

- The current working directory's `package.json`,
  `.archengine/policy.yml`, `arch-engine.yml`.
- The cwd's workspace packages.
- The cwd's `.arch-engine/` artifact directory.

It does NOT read from `~`, `$HOME`, `/etc`, or arbitrary paths.

### 13.5 No filesystem writes outside cwd / `--output`

The CLI writes:

- The cwd's `.arch-engine/stability-score.json` (existing v1 behavior).
- The path given to `--output` (new in v1.1.0).

It does NOT write to `~`, `$HOME`, `/tmp` (other than for explicit
test fixtures), or any other location without explicit user consent.

### 13.6 No network I/O

v1.1.0 makes no network calls. `--sync` (the existing v1.0.x stub)
remains a local-only emission until SaaS sync is a separate spec
pass.

---

## 14. Migration Policy

### 14.1 Version map

| Version | JSON v1 default | JSON v2 access | Notes |
| --- | --- | --- | --- |
| v1.0.x | yes (additive only) | not exposed | Locked in v1.0.3. |
| **v1.1.x** | **yes** | **opt-in via `--json-schema=v2`** | Both supported. v2 is stable but optional. |
| v1.2.x — v1.N.x | yes (default) | opt-in | v2 may add fields under `data.*` / `summary.*` (additive). v1 still supported. |
| v2.0.0 | accessible via `--json-schema=v1` | **default** | First version where the default flips. v1 still works for one minor release. |
| v2.1.0+ | removed (`--json-schema=v1` errors with `exit 2`) | only choice | v1 archived. |

### 14.2 Communication plan

- v1.1.0 changelog: "v2 envelope shipped behind `--json-schema=v2`. v1
  remains the default; new integrations should target v2."
- v1.1.0 `--help` for `--json-schema`: "default `v1`; pass `v2` for
  the stable JSON envelope. v1 remains supported through v1.x."
- v1.1.0 docs: docs/cli/json-v2-ci-flags-spec.md (this file) is the
  reference; README gains a one-paragraph "JSON v2" callout pointing
  here.
- v1.5.x (mid-v1 line, when stable): emit a `WARNING`-severity
  diagnostic on `--json-schema=v1` invocations: "v1 will become
  opt-in at v2.0.0; switch to `--json-schema=v2` for new integrations."
- v2.0.0: default flips. CHANGELOG calls out the breaking change.
  `--json-schema=v1` still works.
- v2.1.0: `--json-schema=v1` errors with exit 2. v1 archived.

### 14.3 Implementation guarantees during migration

- Within v1.x: no v1 JSON key removed or renamed. (Carries v1.0.3's
  rule.)
- Within v1.x: no v2 JSON key removed or renamed once shipped in
  v1.1.0. New keys may be added under `data.*` and `summary.*` only.
- v2.0.0 may add new top-level v2 keys (envelope grow), but only with
  a `schemaVersion` clarification.
- v3.0.0 (hypothetical) would introduce a v3 envelope; v2 deprecation
  follows the same one-minor-window pattern.

---

## 15. Test Plan

The v1.1.0 implementation pass MUST add the following test coverage.
This section is normative for the implementation; the file paths are
suggestive but the test names MUST appear verbatim in the suite.

### 15.1 Flag parser

Add `packages/cli/tests/cli-experience-phase-f-flags.test.ts`:

- `--json-schema=v2` accepted with `--json`.
- `--json-schema=v2` accepted with `--format json`.
- `--json-schema=v3` exits 2 (invalid value) with
  `ARCH_ENGINE_INVALID_CONFIG`.
- `--json-schema=v2` without `--json` or `--format json` exits 2.
- `--json-schema=v2` with `--format markdown` exits 2.
- `--format human` + `--json` exits 2.
- `--format markdown` + `--json` exits 2.
- `--format invalid` exits 2.
- `--output trailing/` (trailing slash) exits 2.
- `--output /unwritable/path` exits 2.
- `--quiet --verbose` is allowed and `--quiet` wins.
- `--ci` forces no-color (verify ANSI absent).
- `--ci --json --json-schema=v2` produces v2 envelope.

### 15.2 JSON v2 envelope shape

Add `packages/cli/tests/cli-experience-phase-f-json-v2.test.ts`:

- Each of the five commands' v2 emission has all required top-level
  keys (§6.2).
- Top-level keys are alphabetically ordered.
- `schemaVersion === "arch-engine.cli.v2"` exactly.
- `archEngineVersion === <package version>`.
- `emittedAt` matches ISO 8601 second-resolution UTC.
- `status` ∈ {`passed`, `blocked`, `warning`, `error`,
  `internal_error`, `not_enforced`}.
- `exitCode` ∈ {0, 1, 2, 3, 5}.
- `summary.headline` is a string ≤ 200 chars, no newlines.
- `data` is an object (never null).
- `diagnostics`, `nextActions`, `artifacts` are always arrays.
- Each command's `data.*` matches the §7 shape (per-command snapshot
  test).
- `data.violations[]` (under `check`) matches §5.3 violation entry
  shape.
- `diagnostics[]` is sorted per §6.7.
- `data.violations[]` (under `check`) is sorted per §6.8.
- `artifacts[]` is sorted per §6.9.

### 15.3 v1 JSON unchanged by default

Add `packages/cli/tests/cli-experience-phase-f-v1-compat.test.ts`:

- `arch-engine doctor --json` produces byte-identical output to
  v1.0.3 (snapshot diff against committed v1.0.3 fixtures).
- Same for `inspect`, `analyze`, `check`, `explain` (each mode).
- `--json-schema=v1` (explicit) produces the same as `--json` alone.

### 15.4 CI flag determinism

Add `packages/cli/tests/cli-experience-phase-f-ci.test.ts`:

- `arch-engine check --ci` output contains no ANSI escapes
  (`/\x1b\[/`).
- `arch-engine check --ci` is byte-identical across two runs on the
  same fixture.
- `arch-engine check --ci --json --json-schema=v2` is byte-identical
  except `emittedAt` across two runs.
- `arch-engine check --ci` exit code matches non-`--ci` exit code on
  every fixture (passed, blocked, no-policy, low-signal).

### 15.5 Markdown output

Add `packages/cli/tests/cli-experience-phase-f-markdown.test.ts`:

- `arch-engine check --format markdown` on `demo-drift` produces a
  markdown document matching the §10.2 template (snapshot test).
- `arch-engine check --format markdown` on a passing fixture matches
  §10.3 (snapshot).
- `arch-engine analyze --format markdown` on `sample-monorepo` matches
  §10.4 (snapshot).
- `arch-engine doctor --format markdown` matches §10.4 (snapshot).
- Markdown output never contains absolute paths.
- Markdown output ends with a trailing newline.
- Markdown output uses LF line endings on every host.
- Violations table truncates at 50 rows with the
  "_…and N more (see artifact)._" line.

### 15.6 `--output` writing

Add `packages/cli/tests/cli-experience-phase-f-output.test.ts`:

- `--output report.md --format markdown` writes the file in cwd.
- `--output sub/dir/report.md --format markdown` creates parent dirs.
- `--output report.md` writes ANSI-stripped human output.
- `--output report.json --json` writes JSON v1.
- `--output report.json --json --json-schema=v2` writes JSON v2.
- File overwrite is permitted.
- File content matches what stdout would have produced (modulo
  ANSI stripping for human).
- Stdout is empty when `--output` is set (except errors which go to
  stderr).
- Write-failure (read-only directory) exits 2.

### 15.7 Verbose / Quiet

Add `packages/cli/tests/cli-experience-phase-f-verbose-quiet.test.ts`:

- `--verbose` adds details to `INTERNAL` diagnostics in human mode.
- `--verbose --json --json-schema=v2` adds `artifacts[].absolutePath`.
- `--verbose` does NOT print env vars or source code.
- `--quiet` removes `Next:` / hint lines from human output.
- `--quiet` does NOT silence `ERROR` / `INTERNAL` diagnostics.
- `--quiet` does NOT affect `--json` / `--json-schema=v2` content.
- `--quiet --verbose`: same as `--quiet` (verbose extras suppressed).

### 15.8 Path / privacy

Add `packages/cli/tests/cli-experience-phase-f-paths.test.ts`:

- v2 default emission contains zero absolute paths.
- v2 with `--verbose` includes `artifacts[].absolutePath`.
- v1 emission (default) keeps `artifactPath` absolute (back-compat).
- No emission contains environment variables or token-like strings.
- All `data.*` paths are repo-relative POSIX.

### 15.9 Backward-compat with v1.0.3 Phase E tests

The 44 tests in `cli-experience-phase-e.test.ts` MUST stay green
without modification. The v1.1.0 implementation pass adds tests; it
does not change Phase E.

### 15.10 Acceptance gate count

The implementation pass succeeds only when **all** of §15.1–§15.9
pass, AND the Phase A/B/C/D/E suites stay green, AND
`npm pack --dry-run` succeeds at v1.1.0 metadata for every public
package.

---

## 16. Acceptance Criteria for Implementation Pass

The future "Arch-Engine CLI v1.1.0 JSON v2 / CI Flags Implementation
Pass" succeeds if and only if every item below is true.

### 16.1 v1.1.0 implementation gates

| # | Criterion | Verifiable by |
| --- | --- | --- |
| 1 | `--json-schema=v1\|v2` flag exists and parses; default `v1`. | flag-parser unit test |
| 2 | `--ci` flag exists; forces no-color, deterministic output. | CI determinism test |
| 3 | `--format human\|json\|markdown` flag exists; default `human`; `json` aliases `--json`. | flag interaction test |
| 4 | `--output <path>` flag exists; writes formatted output to file; creates parent dirs; overwrites. | output writing test |
| 5 | `--verbose` flag exists; adds detail without leaking secrets. | verbose test |
| 6 | `--quiet` flag exists; suppresses non-essential output; preserves errors. | quiet test |
| 7 | JSON v2 envelope matches §6.1 shape exactly for all five commands. | v2 envelope tests |
| 8 | `data.*` payloads match §7 per-command shapes. | snapshot tests |
| 9 | v1 JSON output is byte-identical to v1.0.3 when `--json-schema=v1` (or default) is used. | v1 backward-compat snapshot tests |
| 10 | Markdown output matches §10 templates for `check`, `analyze`, `doctor`. | markdown snapshot tests |
| 11 | All flag interactions in §9 behave as specified (allowed combinations work; forbidden combinations exit 2). | flag interaction matrix tests |
| 12 | Exit codes are unchanged from v1.0.3 (§5.4); new flag misuse exits 2. | exit code parity tests |
| 13 | Stack traces hidden by default; visible with `--verbose` or `DEBUG=arch-engine:*`. | stack-trace gate tests |
| 14 | No absolute paths in v2 default output; absolute paths under `--verbose`. | path-leakage test |
| 15 | Phase A / B / C / D-Lite / E test suites stay green. | existing test suite |
| 16 | No new public CLI commands. The five-verb surface is preserved. | freeze test |
| 17 | No new dependencies in `@arch-engine/cli` `package.json`. | `git diff --stat package.json` |
| 18 | No `@arch-governance/*` dependency. | `grep` test |
| 19 | `npm run build`, `npm run typecheck`, `npm test`, `npm pack --dry-run` all pass. | release validation |
| 20 | Tag and publish as v1.1.0 per the existing release workflow (separate human-driven mission). | npm registry |

### 16.2 v1.2.0+ candidate scope (out of band)

| # | Item | Notes |
| --- | --- | --- |
| 21 | `--baseline <path>` for drift comparison. | Separate spec pass. |
| 22 | `--format github` (`::error file=...,line=...::`) annotations. | Separate spec pass; revisit after v1.1.0 markdown adoption data. |
| 23 | `arch-engine init` scaffold command. | Separate spec pass. |
| 24 | `arch-engine check --emit-agp` (AGP emitter). | Separate spec + impl mission. |
| 25 | JSON v2 default flip (v2.0.0 mission). | Separate release mission. |
| 26 | JSON Schema v7 documents shipped alongside v2 prose contract. | v1.1.1 patch. |

### 16.3 Out of scope for both passes

- README rewrite (separate documentation pass).
- Marketing site copy.
- Logo / branding.
- Dashboard / SaaS / registry / federation features.
- Multi-language adapter expansion.
- `auto-fix` / policy-suggestion commands.

---

*End of JSON v2 / CI Flags Specification.*
