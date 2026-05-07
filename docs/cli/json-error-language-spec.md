# Arch-Engine JSON and Error Language Specification

## 1. Status

- **Document state:** Draft v0.1
- **Document date:** 2026-05-07
- **Target Arch-Engine release line:**
  - v1.0.3 for patch-safe additive improvements (described below).
  - v1.1.0 for the JSON v2 envelope behind an opt-in `--json-schema=v2` flag.
- **Implementation status:** spec only. No source has changed in this pass. No CLI behavior is changing in this pass. No new flags are added in this pass.
- **Predecessor specs / audits:**
  - [docs/cli/cli-experience-spec.md](./cli-experience-spec.md) — §7 (JSON envelope), §8 (Error language), §9 (Exit codes)
  - [docs/cli/cli-readiness-matrix.md](./cli-readiness-matrix.md)
  - [audits/release/ARCH_ENGINE_V1_0_2_PATCH_RELEASE_PREFLIGHT.md](../../audits/release/ARCH_ENGINE_V1_0_2_PATCH_RELEASE_PREFLIGHT.md)
  - The five CLI Experience implementation audits (Phase A / B / C / D-Lite / Doc Cleanup).

This document is the *machine-readability and error-language contract* the future implementation must satisfy. It tightens the existing CLI Experience Specification §7 and §8 into concrete v1.0.3 acceptance criteria and a v1.1.0 v2 envelope migration plan. It does not change the existing five-command surface, the existing JSON v1 keys, or the existing exit codes.

---

## 2. Purpose

After v1.0.2, the CLI is friendly to humans, calibrated against no-policy and blocked fixtures, and screenshot-worthy. The next gap is the **machine-readable layer**:

- Each command emits a different top-level JSON shape today (no shared envelope).
- `check --json` on a real blocking violation reports the score but omits the violation itself (rule, edge, severity) — the human output has the information; the machine output doesn't.
- Errors render as `Fatal: <message>` with no error code, no severity, no `Fix:` line, no documented exit code in the failing path.
- Stack traces are gated only behind `DEBUG=arch-engine:*`; there's no `--verbose` flag and no `ARCH_ENGINE_*` taxonomy.
- Absolute paths leak in `artifactPath` — already flagged in Phase A audit.

The v1.0.3 release should close this gap **patch-safely**, without breaking any existing v1.0.x JSON consumer and without adding new commands or required flags.

---

## 3. v1.0.3 Scope

### 3.1 In scope (patch-safe, additive only)

The following changes are normative for v1.0.3:

1. **`ARCH_ENGINE_*` error code vocabulary** lands as an internal CLI helper (NOT a public export). Defined in a new file `packages/cli/src/error-codes.ts`. Values are exported from that helper for cross-command use and for tests; they are NOT added to `@arch-engine/core`'s public surface and are NOT re-exported from `@arch-engine/cli`.
2. **Consistent human error rendering** for every code: a `Title.` headline, a `Problem:` block, a `Fix:` block, an `Exit N:` final line, an optional `Docs:` URL. Stack traces are off by default.
3. **Stack trace policy** locked: stack traces print only when `DEBUG=arch-engine:*` is set (existing behavior — confirmed and documented). No `--verbose` flag in v1.0.3 (that is a v1.1 candidate).
4. **Additive JSON `diagnostics: []` array** added to every command's `--json` output (v1.0.3). Initially empty on happy paths. On warnings and errors, populated with structured `{ code, severity, title, message, fix?, ciBlocking, path? }` objects. Existing JSON keys are not removed, renamed, or have their value types changed.
5. **`check --json` on blocking violations gains an additive `violations[]` array** with `{ id, ruleId, edge: { from, to, type }, severity, ciBlocking }`. The violation IDs are stable hashes (no timestamps, no random IDs), per spec §7.5. This is additive — v1.0.1/v1.0.2 consumers that read other keys continue to work.
6. **`artifactPath` path normalization**: the existing absolute-path emission is supplemented by a new `artifactRelativePath` field. Absolute path remains for tooling that needs it; relative path is preferred for screenshots and PR comments. Additive only.
7. **Documentation freeze** for current JSON v1 shape per command, recorded in this spec's §8.
8. **Future JSON v2 envelope design** locked here, intended for v1.1.0 behind `--json-schema=v2`.

### 3.2 Not in v1.0.3 scope

- **No new commands.** Five commands stay: `doctor`, `inspect`, `analyze`, `check`, `explain <target>`.
- **No new public flags.** `--verbose`, `--quiet`, `--ci`, `--format`, `--output`, `--json-schema=v2`, `--baseline` are all v1.1.0 candidates.
- **No breaking JSON changes.** v1.0.3 default `--json` output remains a strict superset of v1.0.2 — every existing key is present with the same value type. New keys are additive only.
- **No top-level envelope change.** The v2 envelope (with `schemaVersion`, `command`, `archEngineVersion`, `status`, `exitCode`, `summary`, `data`, `nextActions`) is documented but *not* emitted by default in v1.0.3.
- **No `@arch-governance/*` dependency.**
- **No public export widening** in `@arch-engine/core` or `@arch-engine/cli`.
- **No new package dependencies.**

### 3.3 Patch-safety decision (Path A vs. B vs. C)

The CLI Experience Specification §14.1 catalogued three rollout paths for the JSON envelope:

| Path | v1.0.3 | v1.1.0 | Breaking? |
| --- | --- | --- | --- |
| **A** (recommended) | Add additive fields (`diagnostics[]`, `violations[]`, `artifactRelativePath`) to existing v1 shape | Introduce `--json-schema=v2` flag; `v2` emits the full envelope; `v1` stays default | No |
| **B** | Document only; ship no JSON change in v1.0.3 | Same as A | No |
| **C** | Add `--json-schema=v2` flag in v1.0.3 itself | Flip v2 to default in v2.0.0 | No (v1 stays default through v1.x) |

**This spec recommends Path A.** Rationale: v1.0.3 is a CLI polish patch, and the most useful single thing for CI consumers right now is structured violations and diagnostics in `check --json`. Adding those as additive keys to the existing v1 shape is exactly the kind of additive change that v1.0.1 → v1.0.2 already established as patch-safe (compare `policyConfigured` / `headlineKind` / `supportedSpecialTargets[]` from Phase A and Phase B). No new flag is needed; no breaking change is required; v1 readers keep working; v2 envelope work moves to v1.1.0 with deliberate flag plumbing.

---

## 4. Non-Goals

The v1.0.3 implementation pass MUST NOT:

- Implement an AGP emitter or any AGP record-emitting code.
- Add `@arch-governance/runtime` or `@arch-governance/architecture-profile` as a dependency.
- Change `cli-output-contract.json` (the published v1.0.x JSON schema).
- Update freeze snapshots to widen any public API.
- Add a `--verbose`, `--quiet`, `--ci`, `--format`, `--output`, or `--json-schema=v2` flag.
- Add an `init` or any other new command.
- Change the v1.0.2 exit-code mapping.
- Remove or rename any existing JSON key.
- Touch any source under `packages/core/src/` other than additive type re-exports if absolutely needed (see §6 — likely none required).
- Build a SaaS dashboard, hosted registry, or federation runtime feature.
- Add telemetry of any kind.

---

## 5. Exit Code Contract

This contract is **frozen by v1.0.2**. v1.0.3 does not change it. Documenting here for completeness:

| Exit | Meaning | Used by |
| --- | --- | --- |
| `0` | Success. No blocking architecture violations. Includes "no policy configured" runs. | `doctor`, `inspect`, `analyze`, `check` (pass / no-policy / pass-with-warnings), `explain` |
| `1` | Blocking architecture violations found. | `check` only — covers both enforce-mode policy violations and BLOCKER authority-tier crossings (Phase D-Lite migrated both 5 and 2 to 1). |
| `2` | Invalid input or configuration. | RESERVED for v1.0.3 use: `ARCH_ENGINE_INVALID_POLICY`, `ARCH_ENGINE_INVALID_CONFIG`, `ARCH_ENGINE_TARGET_NOT_FOUND` (when target is malformed; "not matched in topology" stays exit 0 since `explain` is informational). Not currently emitted by any code path. |
| `3` | Adapter or workspace failure. | `check --min-coverage <threshold>` not met (existing). `ARCH_ENGINE_ADAPTER_NOT_FOUND`, `ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL` when emitting from `check`. `ARCH_ENGINE_UNSUPPORTED_WORKSPACE` from `doctor` (currently exits 0; v1.0.3 may migrate to 3 *only* if a fixture deliberately triggers it — no published fixture does today, so additive). |
| `5` | Internal invariant failure. Bug. | RESERVED. `ARCH_ENGINE_INTERNAL_INVARIANT_FAILED`, `ARCH_ENGINE_GRAPH_SHAPE_INVALID`. Not currently emitted by any code path. |

**v1.0.3 may migrate**: `ARCH_ENGINE_ADAPTER_NOT_FOUND` from `doctor` (currently `Fatal:` + `process.exit(3)` per the v1.0.2 doctor "doctor: cannot run without adapter" behavior — verified in Phase A smoke as exit 3 already). Other migrations require fixtures and are documented per command in §10.

---

## 6. Error Code Taxonomy

The `ARCH_ENGINE_*` codes form the v1.0.3 error vocabulary. Eleven codes total, locked here. Every code has the same row shape: meaning / severity / exit / human title / message style / fix line / CI-blocking / stack-trace policy.

### 6.1 Severity vocabulary

| Severity | Meaning | Where used |
| --- | --- | --- |
| `INFO` | Informational; not actionable; not a failure. | `ARCH_ENGINE_POLICY_NOT_FOUND`, `ARCH_ENGINE_TARGET_NOT_FOUND` (when free-form search misses), `ARCH_ENGINE_NO_BASELINE` |
| `WARNING` | Actionable advisory; does not block CI; advises a fix or improvement. | `ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL` |
| `BLOCKING` | Stops a CI gate. The user must address the violation or the rule. | `ARCH_ENGINE_BLOCKING_VIOLATION` |
| `ERROR` | User-side error: invalid input or configuration that prevents the command from running. | `ARCH_ENGINE_INVALID_POLICY`, `ARCH_ENGINE_INVALID_CONFIG`, `ARCH_ENGINE_ADAPTER_NOT_FOUND`, `ARCH_ENGINE_UNSUPPORTED_WORKSPACE` |
| `INTERNAL` | Engine bug. Stack trace shown only under `DEBUG=arch-engine:*`. The CLI tells the user this is a bug and links to issue tracker. | `ARCH_ENGINE_INTERNAL_INVARIANT_FAILED`, `ARCH_ENGINE_GRAPH_SHAPE_INVALID` |

### 6.2 Code-by-code

| Code | Severity | Exit | Title | CI-blocking | Stack trace |
| --- | --- | --- | --- | --- | --- |
| `ARCH_ENGINE_POLICY_NOT_FOUND` | INFO | 0 | "No policy configured." | no | hidden |
| `ARCH_ENGINE_INVALID_POLICY` | ERROR | 2 | "Invalid policy file." | yes | hidden |
| `ARCH_ENGINE_INVALID_CONFIG` | ERROR | 2 | "Invalid configuration." | yes | hidden |
| `ARCH_ENGINE_ADAPTER_NOT_FOUND` | ERROR | 3 | "Workspace topology adapter is missing." | yes | hidden |
| `ARCH_ENGINE_UNSUPPORTED_WORKSPACE` | ERROR | 3 | "Workspace type not supported." | yes | hidden |
| `ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL` | WARNING | 0 | "Topology coverage is too low to evaluate confidently." | no | hidden |
| `ARCH_ENGINE_GRAPH_SHAPE_INVALID` | INTERNAL | 5 | "Internal graph shape invariant failed." | yes | hidden by default; visible under `DEBUG=arch-engine:*` |
| `ARCH_ENGINE_TARGET_NOT_FOUND` | INFO | 0 | "Explain target not found." | no | hidden |
| `ARCH_ENGINE_BLOCKING_VIOLATION` | BLOCKING | 1 | "Blocked: N architecture violation(s)." | yes | hidden |
| `ARCH_ENGINE_INTERNAL_INVARIANT_FAILED` | INTERNAL | 5 | "Arch-Engine internal invariant failed (bug)." | yes | hidden by default; visible under `DEBUG=arch-engine:*` |
| `ARCH_ENGINE_NO_BASELINE` | INFO | 0 | "No baseline artifact for regression comparison." | no | hidden |

### 6.3 Code authoring rules

When the implementation pass adds a new error code in the future, it MUST:

- Pick `ARCH_ENGINE_<TOPIC>` UPPER_SNAKE prefix.
- Map to exactly one severity from the §6.1 vocabulary.
- Map to exactly one of the §5 exit codes.
- Have a concrete `Fix:` recommendation in the `error-codes.ts` table.
- Have a single test in the future test suite that emits it on a controlled fixture and asserts the human + JSON shape.
- Be added to the spec table in §6.2 in this document.
- Avoid mentioning internal class names, stack frames, or filenames in the human Title.

### 6.4 Where codes live in source

```
packages/cli/src/error-codes.ts        — single source of truth (table + types)
packages/cli/src/format-error.ts       — human and JSON renderers
packages/cli/src/commands/<verb>.ts     — call sites that throw / emit
```

`error-codes.ts` exports a `const ARCH_ENGINE_ERROR_CODES = { … } as const` object plus a `type ArchEngineErrorCode = keyof typeof ARCH_ENGINE_ERROR_CODES`. **Not** added to `@arch-engine/cli`'s `package.json` `exports` map. This is CLI-internal. The CLI's public bin surface is unchanged; only the rendering paths know about codes.

---

## 7. Human Error Language

### 7.1 Render template

Every error or warning emitted by the CLI MUST render in this shape:

```
<Title>

Problem:
  <one-paragraph plain-English explanation>

Fix:
  <one or more concrete next-action sentences>

Exit N:
  <one-line exit-code statement>

(Docs: <URL> if available)
```

Rules:

- **Title** is `<Title>.` (sentence-case + period). No prefix like "Error:" or "Fatal:". No code in the title.
- **Problem** is one paragraph, plain English, no jargon, no internal class names.
- **Fix** is the action the user can take. Action verbs first: `Install …`, `Update …`, `Run …`, `Remove …`. If no action is possible (e.g. `INTERNAL`), `Fix` reads `Open an issue at https://github.com/tharcyn/arch-engine/issues with the output of \`arch-engine doctor --json\`.`.
- **Exit N** is exactly the line `Exit N: <semantic>.` matching the §5 mapping. The colon is literal. The semantic mirrors the spec §5 wording.
- **Docs** is optional. When present, it's a literal `Docs: <URL>` line, where the URL is `https://arch-engine.dev/cli/<verb>` or `/errors/<code>`. URLs MUST resolve once the docs site catches up.

The Title / Problem / Fix / Exit / Docs pattern is consistent across:

- Direct CLI errors (e.g. `ARCH_ENGINE_ADAPTER_NOT_FOUND` printed by `doctor` startup).
- Command-internal errors (e.g. `ARCH_ENGINE_INVALID_POLICY` printed by `check`).
- Internal invariant failures (e.g. `ARCH_ENGINE_INTERNAL_INVARIANT_FAILED` printed by any command).

### 7.2 Examples (normative for the implementation pass)

#### `ARCH_ENGINE_POLICY_NOT_FOUND` (INFO, exit 0)

The current Phase A footer already does this in spirit:

```
No policy configured — topology captured but not evaluated.

Next: add `arch-policy.yml` to enforce architecture rules.

Docs: https://arch-engine.dev/policies
```

(Note: `INFO` severity uses `Next:` instead of `Fix:` because nothing is broken. Phase A already established this convention.)

#### `ARCH_ENGINE_INVALID_POLICY` (ERROR, exit 2)

```
Invalid policy file.

Problem:
  `.archengine/policy.yml` could not be parsed: `mode` must be one of "enforce" | "advisory" — got "stricty".

Fix:
  Edit .archengine/policy.yml and set `mode: enforce` or `mode: advisory`.

Exit 2: invalid input or configuration.

Docs: https://arch-engine.dev/policies/syntax
```

#### `ARCH_ENGINE_ADAPTER_NOT_FOUND` (ERROR, exit 3)

```
Workspace topology adapter is missing.

Problem:
  `arch-engine` could not load `@arch-engine/adapter-monorepo`. The adapter is required for workspace topology extraction.

Fix:
  Install the adapter:
    npm install --save-dev @arch-engine/adapter-monorepo

Exit 3: adapter or workspace failure.

Docs: https://arch-engine.dev/adapters
```

#### `ARCH_ENGINE_UNSUPPORTED_WORKSPACE` (ERROR, exit 3)

```
Workspace type not supported.

Problem:
  `arch-engine` could not detect a supported workspace layout in `<repo-relative-path>`. Supported layouts: npm/yarn/pnpm workspaces, single-package projects.

Fix:
  Add a workspaces field to your root package.json, or run from a directory containing a recognised workspace layout.

Exit 3: adapter or workspace failure.

Docs: https://arch-engine.dev/adapters
```

#### `ARCH_ENGINE_BLOCKING_VIOLATION` (BLOCKING, exit 1)

The Phase C+D output already matches this pattern. Restated for completeness:

```
Blocked: 1 architecture violation.

  ✗ @demo-drift/frontend → @demo-drift/payments   (blocks CI)
    Rule:     frontend-must-not-touch-payment-gateway
    Severity: error

Fix: remove or re-route the offending edge(s) above, or update your policy to allow them.

Exit 1: blocking architecture violations.
```

(Note: blocking violations are special — they have a list of violations rather than a single Problem paragraph. The implementation pass must keep the existing Phase C rendering exactly; this spec is documenting what already exists for backward-compatibility.)

#### `ARCH_ENGINE_INTERNAL_INVARIANT_FAILED` (INTERNAL, exit 5)

```
Arch-Engine internal invariant failed (bug).

Problem:
  `reconcileEdges` expected ReconcilableEdge[] for adapter `local_fs`, received `number`. This is a bug in Arch-Engine, not in your repo.

Fix:
  Open an issue at https://github.com/tharcyn/arch-engine/issues with the output of:
    arch-engine doctor --json
    arch-engine inspect --json

Exit 5: internal invariant failure.
```

(Note: internal failures show a longer Problem describing what was wrong — this is the only context where we surface internal vocabulary, because the user needs it to file a useful bug report.)

#### `ARCH_ENGINE_TARGET_NOT_FOUND` (INFO, exit 0)

The Phase B+C `explain` unknown-target output already matches:

```
No matches found for 'qwertyuiop'.

Supported special targets:
  regression   compare current run against the stored stability baseline
  policy       explain how the active policy pack(s) composed and which rules fired

Next: run `arch-engine inspect` to list every node and edge.
```

---

## 8. Current JSON v1 Compatibility

The v1.0.x JSON shapes are documented here verbatim so the v1.0.3 implementation pass can preserve them exactly. **No key in this section may be removed, renamed, or have its value type changed in v1.x.**

### 8.1 `doctor --json`

```jsonc
{
  "environment": "yarn-npm",
  "extractionMode": "structured",
  "topologyConfidence": 1,
  "topologyConfidenceLabel": "HIGH",
  "confidenceDescription": "HIGH (Structured yarn-npm workspace extraction)",
  "detectedNodes": 4,
  "expectedNodes": 4,
  "connectedNodes": 4,
  "coverage": 1,
  "connectivity": 1,
  "crossings": 0,
  "domainDistribution": { /* AuthorityDomain → integer */ },
  "domainIntegrity": { "degraded": false, "unclassifiedRatio": 0.25, "message": null },
  "warnings": [],
  "autoInitialized": false,
  "hasPolicyFile": false
}
```

v1.0.3 additive: `diagnostics: AgpEmitterDiagnostic[]` (initially empty).

### 8.2 `inspect --json`

```jsonc
{
  "nodes": 4,
  "edges": 2,
  "crossings": 0,
  "confidence": 1,
  "topologyConfidenceLabel": "HIGH",
  "confidenceDescription": "HIGH (Structured yarn-npm workspace extraction)",
  "coverage": 1,
  "connectivity": 1,
  "extractionMode": "structured",
  "workspaceType": "yarn-npm",
  "domainDistribution": { /* AuthorityDomain → integer */ },
  "warnings": [],
  "adaptersActive": ["adapter-monorepo"]
}
```

v1.0.3 additive: `diagnostics: []`.

### 8.3 `analyze --json`

```jsonc
{
  "score": 0.475,
  "classification": "CRITICAL",            // alias of stabilityTier
  "stabilityTier": "CRITICAL",
  "topologyConfidenceLabel": "HIGH",
  "coverage": 1,
  "connectivity": 1,
  "topologyConfidence": 1,
  "extractionMode": "structured",
  "workspaceType": "yarn-npm",
  "authorityCrossings": 0,
  "domainDistribution": { /* AuthorityDomain → integer */ },
  "blast_radius": { /* … */ },
  "components": { /* component scores */ },
  "warnings": [],
  "executionMetrics": { "extractionMs": 0, "pipelineMs": 4, "totalMs": 5 },
  "policyConfigured": false,    // Phase A additive
  "headlineKind": "no-policy"   // Phase A additive
}
```

v1.0.3 additive: `diagnostics: []`.

### 8.4 `check --json`

```jsonc
{
  "score": 0.475,
  "classification": "CRITICAL",
  "stabilityTier": "CRITICAL",
  "topologyConfidenceLabel": "HIGH",
  "coverage": 1,
  "connectivity": 1,
  "extractionMode": "structured",
  "topologyConfidence": 1,
  "authorityCrossings": 0,
  "blockerCrossings": 0,
  "warnings": [],
  "executionMetrics": { "extractionMs": 1, "pipelineMs": 4, "totalMs": 6 },
  "artifactPath": "/abs/path/.arch-engine/stability-score.json",
  "policyConfigured": true,     // Phase A additive
  "headlineKind": "tier"        // Phase A additive
}
```

v1.0.3 additive:
- `diagnostics: AgpEmitterDiagnostic[]`
- `violations: { id, ruleId, edge: { from, to, type }, severity, ciBlocking }[]` — populated when `policyConfigured && violations.length > 0`; empty array on pass.
- `artifactRelativePath: string` — repo-relative version of `artifactPath`. Both fields present in v1.x; absolute removed in v2.0+ (deprecation deferred).

### 8.5 `explain --json` (matched target)

```jsonc
{
  "matches": [ /* EvaluatorEdge[] subset */ ],
  "extractionMode": "structured"
}
```

v1.0.3 additive: `diagnostics: []`.

### 8.6 `explain --json` (unknown target)

```jsonc
{
  "matches": [],
  "suggestions": ["…"],
  "supportedSpecialTargets": ["regression", "policy"]   // Phase B additive
}
```

v1.0.3 additive: `diagnostics: [ { code: "ARCH_ENGINE_TARGET_NOT_FOUND", … } ]`.

### 8.7 `explain regression --json`

```jsonc
{
  "regressionSeverity": null,
  "regressionConfidence": null,
  "regressionConfidenceSource": null,
  "regression": null,
  "regressionDelta": null,
  "trendIndicators": null,
  "comparisonBaseline": null,
  "stabilityTier": "CRITICAL",
  "topologyConfidenceLabel": "HIGH",
  "coverage": 1,
  "connectivity": 1,
  "stabilityScore": 0.475
}
```

The "mostly null" shape is a v1.0.x baseline carry-over. The v1.0.3 implementation pass MAY add `diagnostics: [ { code: "ARCH_ENGINE_NO_BASELINE", severity: "INFO" } ]` when a baseline is missing, but MUST NOT change the existing keys.

### 8.8 Diagnostic shape (v1.0.3 additive)

```ts
interface AgpEmitterDiagnostic {       // misnomer — kept for namespace
  readonly code: ArchEngineErrorCode;        // e.g. "ARCH_ENGINE_POLICY_NOT_FOUND"
  readonly severity: 'INFO' | 'WARNING' | 'BLOCKING' | 'ERROR' | 'INTERNAL';
  readonly title: string;                    // matches §7.1 Title
  readonly message: string;                  // matches §7.1 Problem paragraph
  readonly fix?: string;                     // matches §7.1 Fix sentence
  readonly ciBlocking: boolean;
  readonly path?: string;                    // repo-relative path when applicable
  readonly details?: Record<string, unknown>;
}
```

(The interface name in the implementation will be `CliDiagnostic` — `AgpEmitterDiagnostic` is a copy-paste artefact from the AGP emitter contract. The implementation pass picks the final name.)

### 8.9 Patch-safety rules

The v1.0.3 implementation pass MUST satisfy these rules:

1. Every key in §8.1–§8.7 above is present in v1.0.3 with the same value type.
2. `diagnostics: []` may be empty on happy paths, but the key MUST be present.
3. New keys are sorted alphabetically among themselves but appended to the existing key order (no rewriting the key sequence).
4. No JSON value's primitive type changes (e.g. `score` stays `number`, never becomes `string`).
5. The artifact paths at `.arch-engine/stability-score.json` and `.arch-engine/session.json` continue to use their existing internal shape — that is a separate file contract per `docs/contracts/cli-output-contract.json` and is **not** in v1.0.3 scope.

---

## 9. Future JSON v2 Envelope

This is **documented for v1.1.0 implementation** behind an opt-in `--json-schema=v2` flag. v1.0.3 does not implement it.

### 9.1 Top-level envelope

```jsonc
{
  "schemaVersion": "arch-engine.cli.v2",
  "command": "doctor" | "inspect" | "analyze" | "check" | "explain",
  "archEngineVersion": "1.1.0",
  "emittedAt": "2026-MM-DDTHH:MM:SSZ",
  "status": "ok" | "warn" | "fail" | "info",
  "exitCode": 0 | 1 | 2 | 3 | 5,
  "summary": "<one-sentence machine summary>",
  "data": { /* the v1 payload — moved under `data:` */ },
  "artifacts": [ { "kind": "stability-score", "relativePath": ".arch-engine/stability-score.json", "absolutePath": "/abs/path" } ],
  "diagnostics": [ /* CliDiagnostic[] from §8.8 */ ],
  "nextActions": [ "Run `arch-engine inspect`" ]
}
```

Rules:

- Top-level keys sorted alphabetically when serialized (the order shown above).
- `archEngineVersion` is the `@arch-engine/cli` package version.
- `emittedAt` is the only wall-clock-derived field. ISO 8601 UTC second resolution. NEVER part of any record's identity.
- `status` is one of four words; never freeform.
- `exitCode` mirrors §5.
- `summary` is a single sentence designed for log scrapers; max 200 chars; no newlines.
- `data` carries the v1 payload — every v1 key continues to exist, just nested.
- `artifacts` is always an array (empty when no artifact). Each entry includes both `relativePath` and `absolutePath`.
- `diagnostics` is the §8.8 array.
- `nextActions` is an array of human-readable strings. Each string corresponds to the human-mode `Next:` / `Fix:` line.

### 9.2 Migration mechanics

| v1.0.x | v1.1.0 | v2.0.0 |
| --- | --- | --- |
| Default: v1 (additive `diagnostics`, `violations`, `artifactRelativePath`) | Default still v1; `--json-schema=v2` opt-in for the envelope above | Default flips to v2; v1 still accessible via `--json-schema=v1` for one minor release |

Rationale: this matches the CLI Experience Specification §14.1's recommended Path B. v1.x consumers don't break. v2 envelope is opt-in. v2.0 carries the migration-window flag for one more minor release before retiring v1.

### 9.3 v2 specific rules

- The v2 envelope is **idempotent and stable**: byte-identical for byte-identical input, except for `emittedAt`.
- All array sort orders fixed (per spec §8.1).
- All object keys sorted alphabetically at every level.
- No `null` placeholders (the v1.0.x `explain regression` "mostly null" shape becomes a `data: { regression: null }` carrying only the actual fields, with `diagnostics` carrying `ARCH_ENGINE_NO_BASELINE` when applicable).
- Forbidden in v2 entirely (already forbidden in v1.0.3 +): `Date.now()`, `Math.random()`, locale-dependent ordering, network reads, filesystem writes, absolute paths in any field other than `artifacts[].absolutePath`.

---

## 10. Command-Specific Rules

### 10.1 `doctor`

**Purpose:** readiness diagnostic.

**Exit codes:**
- `0` — ready or ready-with-no-policy (current).
- `3` — adapter not found (`ARCH_ENGINE_ADAPTER_NOT_FOUND`) or unsupported workspace (`ARCH_ENGINE_UNSUPPORTED_WORKSPACE`).
- `5` — internal failure (extraction crashed unexpectedly).

**Diagnostics that MAY appear in `diagnostics[]`:**
- `ARCH_ENGINE_POLICY_NOT_FOUND` (INFO) — the v1.0.2 footer "No policy file is configured yet." surfaces this.
- `ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL` (WARNING) — when coverage < 30% or `detectedNodes < 2`.
- `ARCH_ENGINE_ADAPTER_NOT_FOUND` (ERROR) — when adapter resolution fails.
- `ARCH_ENGINE_UNSUPPORTED_WORKSPACE` (ERROR).

**Implementation note:** the existing `domainIntegrity.message` field already carries low-signal warnings as plain strings. v1.0.3 keeps that, AND adds the same condition to `diagnostics[]` as a `WARNING` entry.

### 10.2 `inspect`

**Purpose:** topology summary.

**Exit codes:**
- `0` — always (informational; never blocks).
- `3` — adapter / extraction failure (rare).

**Diagnostics that MAY appear:**
- `ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL` (WARNING).
- `ARCH_ENGINE_ADAPTER_NOT_FOUND` (ERROR — escalates to exit 3).

### 10.3 `analyze`

**Purpose:** stability score and risk drivers.

**Exit codes:**
- `0` — always (informational; Phase A invariant).
- `3` — adapter failure.

**Diagnostics that MAY appear:**
- `ARCH_ENGINE_POLICY_NOT_FOUND` (INFO) when `policyConfigured === false`.
- `ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL` (WARNING) when low-signal headline triggers.

### 10.4 `check`

**Purpose:** the CI gate.

**Exit codes:**
- `0` — pass / pass-with-warnings / no-policy.
- `1` — `ARCH_ENGINE_BLOCKING_VIOLATION` (Phase D-Lite).
- `2` — `ARCH_ENGINE_INVALID_POLICY` or `ARCH_ENGINE_INVALID_CONFIG`.
- `3` — `ARCH_ENGINE_ADAPTER_NOT_FOUND`, `ARCH_ENGINE_UNSUPPORTED_WORKSPACE`, or `--min-coverage` not met.
- `5` — `ARCH_ENGINE_INTERNAL_INVARIANT_FAILED` or `ARCH_ENGINE_GRAPH_SHAPE_INVALID`.

**Diagnostics that MAY appear:**
- All of the above.
- `ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL` (WARNING) when low-signal headline triggers (does not block).

**`violations[]` shape (v1.0.3 additive):**

```jsonc
"violations": [
  {
    "id": "v_<sha256(command|ruleId|from|to|type)[0:8]>",
    "ruleId": "frontend-must-not-touch-payment-gateway",
    "edge": { "from": "@demo-drift/frontend", "to": "@demo-drift/payments", "type": "workspace_dependency" },
    "severity": "error",
    "ciBlocking": true,
    "category": "explicit_forbid"
  }
]
```

The `id` is a stable hash — no timestamps, no random IDs (per CLI Experience Spec §7.5). `ciBlocking` mirrors whether the violation contributes to the exit-1 count. The `violations[]` array is **always present** (empty on pass). `category` matches the existing v1.0.x `policyEvaluation.violationCategory` semantics (`explicit_forbid` / `tier_violation`).

### 10.5 `explain <target>`

**Purpose:** explain inference / regression / policy.

**Exit codes:**
- `0` — always (informational, never blocks; matches Phase A spec §5.5).
- `2` — only if the target *string* is malformed (e.g. empty after trim). Today no fixture triggers this. The implementation pass MAY add this; otherwise leave as `0` with `ARCH_ENGINE_TARGET_NOT_FOUND` INFO.

**Diagnostics that MAY appear:**
- `ARCH_ENGINE_TARGET_NOT_FOUND` (INFO).
- `ARCH_ENGINE_NO_BASELINE` (INFO) on `explain regression` when no baseline artifact exists.

---

## 11. Stack Trace Policy

### 11.1 Default behavior

Stack traces are **off by default** for every command, every error class. The user sees the §7.1 Title / Problem / Fix / Exit / Docs format only.

### 11.2 Debug mode

`DEBUG=arch-engine:*` (or `DEBUG=arch-engine:cli`) enables stack-trace emission:

- Every uncaught throw or `console.error` of an `Error` instance prints its `.stack`.
- Internal-class identifiers and source line numbers MAY appear in `Problem:` blocks under DEBUG.
- DEBUG output goes to `stderr`; stdout JSON remains unchanged.

This matches the existing v1.0.x behavior in `cli.ts:80-87`. v1.0.3 documents it; no code change needed.

### 11.3 `--verbose` / `--quiet` flags (v1.1 only)

Spec §6.5 of CLI Experience Specification proposed `--verbose` and `--quiet`. Those are **v1.1 candidates**, NOT v1.0.3 scope.

### 11.4 Exception: `INTERNAL` severity

For `ARCH_ENGINE_INTERNAL_INVARIANT_FAILED` and `ARCH_ENGINE_GRAPH_SHAPE_INVALID`, the human output:

- `Title.` + `Problem:` + `Fix:` + `Exit 5:` shown by default.
- Stack trace **NOT** shown by default (matches §11.1).
- Stack trace shown when `DEBUG=arch-engine:*` is set.
- The `Fix:` for INTERNAL points at the issue tracker.

The reason: a stack trace is only useful to the engine developer, not the consumer. Telling the consumer "open an issue with `arch-engine doctor --json` output" is more actionable than dumping a stack.

---

## 12. Path / Privacy Policy

### 12.1 Path normalization rules

Per CLI Experience Spec §6.7 + §8.4:

- Display paths repository-relative when possible (`packages/cli/src/cli.ts`, not `/Users/.../cli.ts`).
- POSIX forward-slash separators in displayed paths regardless of host OS.
- For external paths (tempdirs etc.), display as `…/<file>` with the elision marker.

### 12.2 v1.0.3 specifics

- `check --json` `artifactPath` continues to carry the absolute path (backward-compat).
- v1.0.3 ADDS `artifactRelativePath` (always present, repo-relative).
- Other path fields in `metadata` should be repo-relative when emitted (the implementation pass MAY add a `path` field to `diagnostics` entries; that field MUST be repo-relative).

### 12.3 No leaked secrets

The CLI MUST NOT print:

- Authentication tokens, API keys, signing keys, environment variables.
- Raw source code from the repository.
- Email addresses or usernames discovered in `package.json` `author` fields, unless explicitly invoked.

This already holds in v1.0.x; v1.0.3 documents it for completeness.

### 12.4 Stable JSON serialization

- No `BigInt`, no `Date` instances, no class instances.
- No `undefined` values; absent fields are absent keys.
- UTF-8 strings without normalization changes (no NFC/NFD coercion).
- Numbers use JavaScript-default decimal representation.
- Booleans as `true` / `false`; `null` as `null`; `undefined` is forbidden.

---

## 13. CI Consumption Model

### 13.1 Primary CI command

`arch-engine check` is the CI gate. The exit code is the source of truth.

### 13.2 Recommended CI patterns

**Bash:**

```bash
# Simple:
arch-engine check

# Capture exit code:
arch-engine check
EXIT=$?
if [ $EXIT -eq 1 ]; then echo "blocking architecture violations"; fi
if [ $EXIT -ne 0 ]; then exit $EXIT; fi

# JSON parsing:
arch-engine check --json | jq -e '.violations | length == 0'
```

**GitHub Actions:**

```yaml
- name: Architecture check
  run: npx arch-engine check
```

When exit ≠ 0, the step fails — GitHub renders a step failure. The CLI's human output is in the step log.

### 13.3 What's available in v1.0.3

After the v1.0.3 implementation pass:

- Stable exit codes (frozen in v1.0.2).
- Stable v1 JSON keys (frozen here).
- Additive `diagnostics: []` in every `--json` output.
- Additive `violations: []` in `check --json`.
- Additive `artifactRelativePath` in `check --json`.

### 13.4 What's deferred to v1.1

- `--ci` flag (force monochrome, drop separators, force machine-quotable summary).
- `--format markdown` for PR-comment rendering.
- `--format github` for `::error file=...,line=...::` annotations.
- `--output <path>` for writing the formatted output to a file.
- `--baseline <path>` for drift comparison.

---

## 14. Migration Plan

### 14.1 v1.0.2 → v1.0.3

| Surface | Status |
| --- | --- |
| Five public commands | unchanged |
| Public flags | unchanged |
| Exit codes | unchanged |
| JSON v1 keys | unchanged |
| JSON v1 additive | `diagnostics: []` (all commands), `violations: []` (`check`), `artifactRelativePath` (`check`) |
| Error rendering | structured Title/Problem/Fix/Exit/Docs |
| Error vocabulary | 11 `ARCH_ENGINE_*` codes (CLI-internal) |
| Stack traces | hidden by default; `DEBUG=arch-engine:*` opt-in |
| Public exports | unchanged |
| Dependencies | unchanged |
| AGP integration | not yet |

### 14.2 v1.0.3 → v1.1.0

v1.1.0 introduces the additive flags (`--verbose`, `--quiet`, `--ci`, `--format`, `--output`, `--baseline`), the v2 envelope behind `--json-schema=v2`, and (separately) an opt-in `@arch-engine/agp-emitter@0.1.0` package per `docs/contracts/agp-emitter-contract.md`. None of these are in v1.0.3 scope.

### 14.3 v1.1.x → v2.0.0

v2.0.0 flips `--json-schema` default from `v1` to `v2`. The `v1` schema is accessible for one v2 minor release window before being retired in v2.1.

---

## 15. Test Plan

The future v1.0.3 implementation pass MUST include the following test coverage. No tests are added in this spec pass.

### 15.1 Unit-test coverage for `error-codes.ts` and `format-error.ts`

- Each `ARCH_ENGINE_*` code maps to its severity, exit code, and Title from the §6.2 table.
- `format-error(diagnostic)` produces the §7.1 Title/Problem/Fix/Exit/Docs shape.
- `format-error` does not include stack traces unless `process.env.DEBUG?.includes('arch-engine')`.
- Snapshot tests for each of the eight error rendering examples in §7.2.

### 15.2 Process-level tests for each command

- `doctor` on no-policy fixture: exit 0; `diagnostics[]` includes `ARCH_ENGINE_POLICY_NOT_FOUND` (INFO).
- `doctor` on missing-adapter fixture: exit 3; `diagnostics[]` includes `ARCH_ENGINE_ADAPTER_NOT_FOUND` (ERROR); human output matches §7.2 example 3.
- `analyze` on no-policy fixture: exit 0; `diagnostics[]` includes `ARCH_ENGINE_POLICY_NOT_FOUND` (INFO); headline still uses the Phase A calibrated `No policy configured` text.
- `check` on no-policy fixture: exit 0; `diagnostics[]` includes `ARCH_ENGINE_POLICY_NOT_FOUND` (INFO); `violations: []` empty.
- `check` on demo-drift (enforce-mode policy): exit 1; `violations[]` has one entry with `id`, `ruleId`, `edge`, `severity`, `ciBlocking: true`; `diagnostics[]` includes `ARCH_ENGINE_BLOCKING_VIOLATION` (BLOCKING).
- `check` on malformed `.archengine/policy.yml` fixture: exit 2; `diagnostics[]` includes `ARCH_ENGINE_INVALID_POLICY` (ERROR); human output matches §7.2 example 2; no stack trace.
- `check --min-coverage 0.99` on coverage-failing fixture: exit 3; `diagnostics[]` includes `ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL` (WARNING) — note: coverage threshold is currently a separate `--min-coverage` failure path that does not use a code today; v1.0.3 wires it through `ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL`.
- `explain unknown` (unmatched target): exit 0; `diagnostics[]` includes `ARCH_ENGINE_TARGET_NOT_FOUND` (INFO); existing `supportedSpecialTargets[]` still present.
- `explain regression` without baseline: exit 0; `diagnostics[]` includes `ARCH_ENGINE_NO_BASELINE` (INFO); existing "mostly null" shape preserved.

### 15.3 JSON-shape backward-compatibility tests

- For every v1.0.2 `--json` output: every existing key from §8 is present in v1.0.3 with the same value type. (This is a snapshot diff against the v1.0.2 baseline.)
- v1.0.3 `--json` outputs always include `diagnostics: []` (even when empty).
- `check --json` always includes `violations: []` (even when empty).
- `check --json` always includes both `artifactPath` and `artifactRelativePath`.

### 15.4 Stack-trace tests

- Without `DEBUG`: no `\n at ` (stack frame marker) appears in any human output for any error code.
- With `DEBUG=arch-engine:*`: stack frames appear for `INTERNAL` severity.

### 15.5 Path-normalization tests

- `artifactRelativePath` never starts with `/`.
- `artifactRelativePath` uses POSIX forward slashes regardless of host.
- No `diagnostics[].path` ever starts with `/` or contains drive letters.

### 15.6 Determinism tests

- For every command's `--json` output: running the command twice on the same fixture produces byte-identical output (after stripping any `emittedAt`-like field — which v1.0.3 does NOT add).
- `violations[].id` is stable across runs (no timestamp/random in identity).

---

## 16. Acceptance Criteria for Implementation Pass

The future "Arch-Engine CLI v1.0.3 JSON / Error-Language Implementation Pass" succeeds if and only if every item below is true.

### 16.1 v1.0.3 implementation gates

| # | Criterion | Verifiable by |
| --- | --- | --- |
| 1 | `packages/cli/src/error-codes.ts` exists and exports the 11 `ARCH_ENGINE_*` codes per §6.2. | snapshot test |
| 2 | `packages/cli/src/format-error.ts` exists and renders §7.1 shape for every code. | unit test |
| 3 | Every existing v1.0.2 JSON key from §8 is present in v1.0.3 with the same value type. | shape-diff test |
| 4 | Every command's `--json` output includes `diagnostics: []` (additive). | smoke test |
| 5 | `check --json` always includes `violations: []` (empty on pass; populated on block). | demo-drift smoke test |
| 6 | `check --json` includes both `artifactPath` (absolute) and `artifactRelativePath` (repo-relative). | demo-drift smoke test |
| 7 | Process-level tests in §15.2 all pass. | new test files |
| 8 | Stack-trace tests in §15.4 pass. | new test files |
| 9 | Path-normalization tests in §15.5 pass. | new test files |
| 10 | Determinism tests in §15.6 pass. | new test files |
| 11 | Phase A / B / C / D-Lite invariants hold (existing test files still green). | existing test suite |
| 12 | No new public exports from `@arch-engine/cli`. | freeze test |
| 13 | No new dependencies in any `package.json`. | `git diff --stat` |
| 14 | `npm run build`, `npm run typecheck`, `npm test`, `npm pack --dry-run` all pass. | release validation |
| 15 | Tag and publish as v1.0.3 per the existing release workflow (separate human-driven mission). | npm registry |

### 16.2 v1.1.0 minor-release scope (for the implementation pass after v1.0.3)

| # | Criterion |
| --- | --- |
| 16 | `--json-schema=v2` flag exists; emits the §9 envelope; default remains `v1`. |
| 17 | `--verbose`, `--quiet`, `--ci`, `--format`, `--output` flags exist per spec §6.15 / §11.4. |
| 18 | `arch-engine init` scaffold command exists. |
| 19 | All exit-code migrations from spec §9.3 land. |
| 20 | `@arch-engine/agp-emitter@0.1.0` is published per the AGP emitter contract. |

### 16.3 Out of scope for both passes

- README rewrite (separate documentation pass).
- Marketing site copy.
- Logo / branding changes.
- Dashboard / SaaS / registry / federation features.

---

*End of JSON / Error Language Specification.*
