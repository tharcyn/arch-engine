# Arch-Engine Baseline Comparison Specification

> **Status:** v1.2.0 design pass. This document locks the public
> contract for cross-run architecture-drift detection. **No code
> changes accompany this pass** — it is the design specification
> that drives the v1.2.0 implementation pass.

---

## 1. Status

| Field | Value |
| --- | --- |
| Spec version | 1.0 |
| Target release | `@arch-engine/cli@1.2.0` (minor) |
| Author | Claude Opus 4.7 (1M context) |
| Date | 2026-05-11 |
| Predecessors | [`cli-experience-spec.md`](./cli-experience-spec.md), [`json-error-language-spec.md`](./json-error-language-spec.md), [`json-v2-ci-flags-spec.md`](./json-v2-ci-flags-spec.md) |
| Sister doc | [`examples/github-actions/README.md`](../../examples/github-actions/README.md) |
| Implementation status | **Not yet implemented.** Code lands in the v1.2.0 implementation pass. |

---

## 2. Purpose

Arch-Engine's v1.0.x–v1.1.x surface answers the question **"Does
this repository's current architecture pass policy?"** Every run
is independent: the topology is extracted fresh, the policy is
evaluated against it, and a verdict is emitted.

But the question that drives PR review is not "Does it pass?" It
is **"What changed?"** A green PR that touches `frontend/`
deserves no architectural attention. A green PR that introduces a
new `frontend → payments` edge does — even if the policy file
happens to permit it today.

v1.2.0 adds cross-run drift detection to answer the PR-review
question:

- Compare the current run against a **baseline** (a prior
  Arch-Engine JSON v2 report).
- Report **what changed** in the topology, the policy verdict, and
  the architecture signal.
- Surface drift in every existing output channel (`--json
  --json-schema=v2`, `--format markdown`, human) using the
  additive shape locked in this document.
- Treat drift as **diagnostic by default** — drift alone never
  fails CI. Only newly-introduced *blocking* violations exit 1.

The product framing carries forward from v1.1.0:

> **"Catch new architecture drift before merge."**

---

## 3. Product Promise

**For PR authors:** "What did my PR change in the architecture
graph?" gets a deterministic answer in the same markdown comment
that already posts via the v1.1.0 templates.

**For reviewers:** Topology changes that previously required
manual diffing (`git diff` of `package.json` files, hunting
imports) become a structured drift section. The reviewer reads
two columns — Added / Removed — and knows whether the PR's
architectural surface matches the description.

**For CI gates:** "Did this PR introduce a *new* blocking
architectural violation?" becomes a single exit code (1).
Existing pre-PR violations don't keep failing the same PR over
and over; they appear as `persistedViolations[]` for context.

**Stays out of scope (deliberately):** cloud baselines, branch
checkout orchestration, AGP integration, dashboard surfaces, PR
auto-fix suggestions.

---

## 4. v1.2 Scope

**One new public flag:** `--baseline <path>`.

That flag attaches to two commands:

| Command | `--baseline` support | Notes |
| --- | --- | --- |
| `check` | **Yes — primary surface.** | Drift comparison is the core feature; new blocking violations exit 1. |
| `analyze` | **Yes — secondary surface.** | Same drift block as `check`. Never exits non-zero on drift. |
| `inspect` | Topology data only. | `inspect` already emits the topology that becomes a baseline; it does NOT itself accept `--baseline` in v1.2 (defer). |
| `doctor` | No. | Doctor is a workspace-readiness probe; baseline isn't meaningful. |
| `explain` | No. | Defer to a future `explain drift <target>` mode. |

**JSON v2 additive fields** (every command that has topology):

- `data.topology.canonical.nodes[]` — full canonical node list.
- `data.topology.canonical.edges[]` — full canonical edge list.
- `data.topology.canonical.graphSurfaceHash` — deterministic hash
  of `(nodes, edges)`.

These let any prior v1.2+ JSON v2 report serve as a baseline.

**JSON v2 conditional fields** (only when `--baseline` is set on
`check` or `analyze`):

- `data.drift = { baseline, summary, topology, violations,
  signal }` — full drift breakdown.
- `summary.drift = { newViolations, addedEdges, … }` —
  top-level counters mirroring the most-asked subset.

**Markdown additions:** an `## Architecture Drift` section after
the existing `## Violations` block.

**Human additions:** an "Architecture drift" block before the
exit footer (in `check`) or before the "Next:" line (in
`analyze`).

**New error codes:** four `ARCH_ENGINE_BASELINE_*` codes (§16)
all exit 2.

**No version-default flip.** JSON v2 remains opt-in via
`--json-schema=v2`. Baseline comparison is **additive only**.

---

## 5. Non-Goals

The following are explicitly out of scope for v1.2.0 and will
NOT be addressed by this spec:

- **Git checkout orchestration.** The CLI will not run
  `git fetch origin main && arch-engine check ...` for the
  user. Baseline is file-based.
- **Remote baseline fetching.** No HTTP, no S3, no GCS, no
  registry. `--baseline` accepts a local file path only.
- **Baseline storage / lifecycle.** Documented in §14 as
  user-driven (CI artifact upload, repo blob, file in a tracked
  branch); not a CLI concern.
- **Cloud / dashboard / SaaS surface.** Out of scope for v1.x
  entirely.
- **AGP emitter integration.** Drift detection does not emit
  AGP envelopes. `--emit-agp` remains its own future track.
- **PR comment posting in the CLI.** Drift markdown is generated
  by `--format markdown --output …`; posting it remains a job for
  the GitHub Actions templates in
  `examples/github-actions/`.
- **Auto-suggest policy from drift.** No `suggest`/`auto-fix`
  surface in v1.2. Drift is reported, not resolved.
- **Branch-protection API.** No GitHub-specific REST calls.
- **JSON v1 drift output.** Drift is a v2-only feature. JSON v1
  remains byte-identical to v1.1.0 / v1.0.3.
- **`--baseline-label` / `--current-label`.** Cosmetic; deferred
  until users request them.
- **`--drift-mode` modifier.** Defer; drift output is
  comprehensive by default.
- **`--fail-on-drift` modifier.** Defer; the exit-code contract
  in §10 covers the canonical case (new blocking violations
  → exit 1) and is enough for v1.2 PR gating.

---

## 6. Baseline Concept

A **baseline** is a previously-emitted Arch-Engine **JSON v2
envelope** stored as a file. Concretely:

```bash
# Generating a baseline (typically on `main`, in CI):
npx arch-engine check --ci \
  --json --json-schema=v2 \
  --output arch-engine-baseline.json

# Using it (on a PR branch, locally or in CI):
npx arch-engine check --ci \
  --baseline arch-engine-baseline.json \
  --format markdown --output arch-engine-report.md
```

### 6.1 What the baseline file must be

The baseline must satisfy ALL of:

1. Be a regular file (not a directory; not a symlink to a
   directory).
2. Parse as JSON.
3. Have top-level `schemaVersion: "arch-engine.cli.v2"`.
4. Have top-level `command` ∈ `{"check", "analyze", "inspect"}`.
5. Have `data.topology.canonical` (added in v1.2; see §11.3).
6. Have `archEngineVersion` ≥ `"1.2.0"`.

Each unmet rule maps to a specific error code (§16). Pre-v1.2
JSON v2 envelopes (`1.1.0`/`1.1.x` reports) cannot serve as
baselines because they don't carry `canonical`; users must
re-generate.

### 6.2 What the baseline is NOT

- **NOT a stability-score artifact.** The legacy
  `.arch-engine/stability-score.json` file is a snapshot of
  Arch-Engine's internal regression-detection state — it
  documents `regression`/`comparisonBaseline`/`regressionDelta`
  fields but does NOT carry the canonical topology lists.
  Implementations MUST NOT treat `stability-score.json` as a
  drop-in baseline.
- **NOT JSON v1 output.** v1 does not have a stable envelope
  and lacks `data.topology.canonical`.
- **NOT a markdown report.** Markdown is presentation, not data.
  Parsing markdown back to a diff is unstable and not part of
  the contract.

### 6.3 Command compatibility

Baseline files generated by one command should be comparable
against runs of the same command:

| Current command | Compatible baseline `command` field |
| --- | --- |
| `check`   | `check`, `analyze`, `inspect` |
| `analyze` | `check`, `analyze`, `inspect` |

Topology data is identical across these three commands, so a
baseline generated by any of them can be used to compare against
a run of any of them. Violation data, however, is **only present
in `check` baselines** — running `check --baseline analyze.json`
will yield `drift.violations = { new: [], resolved: [],
persisted: [] }` (empty) plus a `ARCH_ENGINE_BASELINE_*`
diagnostic explaining that no baseline violations were available.

Mismatches (e.g. `doctor` baseline against `check` run) exit 2
with `ARCH_ENGINE_BASELINE_COMMAND_MISMATCH`.

---

## 7. CLI Surface

### 7.1 New flag

| Flag | Type | Default | Behavior |
| --- | --- | --- | --- |
| `--baseline <path>` | string | unset | Compare current run against the JSON v2 envelope at `<path>`. |

### 7.2 Flag rules

- `--baseline` is valid on `check` and `analyze` only.
- Passing `--baseline` to `doctor`, `inspect`, or `explain`
  exits 2 with `ARCH_ENGINE_INVALID_CONFIG`.
- `--baseline` may be combined with any other v1.0.x / v1.1.x
  flag (`--ci`, `--json`, `--json-schema=v2`, `--format`,
  `--output`, `--verbose`, `--quiet`).
- `--baseline` does NOT require `--json` or
  `--json-schema=v2` on the current run — drift is rendered in
  whatever format the user chose. The baseline file itself MUST
  be JSON v2 (§6.1).
- Path resolution: relative paths resolve against `process.cwd()`.

### 7.3 Backward compatibility

- Without `--baseline`, every command behaves byte-identically
  to its v1.1.0 form. No new `data.drift` field appears. No
  exit-code change.
- `data.topology.canonical` is added unconditionally to
  inspect/analyze/check v2 outputs (additive, doesn't break v1
  consumers because v1 is unchanged).

### 7.4 Deferred flags (v1.3+)

The following are intentionally out of v1.2 scope but reserved
for future iterations:

- `--baseline-label <label>` / `--current-label <label>` — labels
  for the markdown report.
- `--drift-mode all|new-only|policy-only` — narrow the drift
  block.
- `--fail-on-drift` — promote non-violation drift to exit 1.

Implementations MUST NOT silently accept these flags in v1.2;
they should be unknown-flag rejections.

---

## 8. Baseline Input Validation

Validation runs **before** topology extraction so a malformed
baseline never wastes a full extraction cycle. The decision
tree:

```
1. Does <path> exist?
   No  → exit 2: ARCH_ENGINE_BASELINE_NOT_FOUND
   Yes → step 2.

2. Is <path> a regular readable file?
   No  → exit 2: ARCH_ENGINE_BASELINE_NOT_FOUND
   Yes → step 3.

3. Does it parse as JSON?
   No  → exit 2: ARCH_ENGINE_BASELINE_INVALID
   Yes → step 4.

4. Is schemaVersion === "arch-engine.cli.v2"?
   No  → exit 2: ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA
   Yes → step 5.

5. Is command ∈ {"check", "analyze", "inspect"}
   AND compatible with current command (§6.3)?
   No  → exit 2: ARCH_ENGINE_BASELINE_COMMAND_MISMATCH
   Yes → step 6.

6. Does archEngineVersion parse as semver AND >= "1.2.0"?
   No  → exit 2: ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA
         (sub-message: "baseline emitted by Arch-Engine <X>;
         needs >= 1.2.0 to include canonical topology")
   Yes → step 7.

7. Does data.topology.canonical exist with the expected shape?
   No  → exit 2: ARCH_ENGINE_BASELINE_INVALID
         (sub-message: "baseline missing data.topology.canonical")
   Yes → proceed with drift computation.
```

### 8.1 What "expected shape" means

The baseline MUST have:

```jsonc
{
  "data": {
    "topology": {
      "canonical": {
        "nodes": [ /* array of objects with `id` string */ ],
        "edges": [ /* array of objects with `id`, `from`, `to`, `type` */ ],
        "graphSurfaceHash": "sha256-prefixed string or 64-hex digest"
      }
    }
  }
}
```

Other v2 fields (`status`, `exitCode`, etc.) are read but not
strictly required for drift computation. Their absence is
flagged as `ARCH_ENGINE_BASELINE_INVALID`.

### 8.2 Forward compatibility

Future Arch-Engine versions may emit additional `data.topology.canonical.*`
sub-fields (e.g. `domains`, `weights`). v1.2 consumers MUST
ignore unknown sub-fields without erroring — only the three
listed in §8.1 are required.

### 8.3 Newer-schema-than-runtime

A baseline whose `archEngineVersion > current runtime` does NOT
exit 2 in v1.2 — it emits a `WARNING` diagnostic and proceeds.
v1.2 implementations comparing the fields documented here will
get correct results; new fields added in v1.3+ will simply be
unseen. v2.0 may tighten this to a hard error if the surface
diverges enough to make comparison unsafe.

---

## 9. Drift Model

Drift is computed across three orthogonal axes: **topology**,
**policy**, and **signal**. Each has a deterministic compute
algorithm and a stable JSON shape.

### 9.1 Canonical identifiers

Drift only works if "the same node" / "the same edge" /
"the same violation" can be identified across two runs. v1.2
locks the canonical ID forms:

| Entity | Canonical ID | Rationale |
| --- | --- | --- |
| Node | `id` = canonical entity name (e.g. `"@demo-drift/frontend"`) | Workspace adapter already emits these as stable identifiers. |
| Edge | `id` = `"e_" + sha256(\`${from}\|${to}\|${type}\`)[0..8]` | Mirrors the v1.0.3 violation-id pattern. Deterministic across runs. |
| Violation | `id` = existing v1.0.3 `"v_" + sha256(...)[0..8]` shape | Already stable; reused verbatim. |

Implementations MUST emit `id` on every `canonical.nodes[*]`,
`canonical.edges[*]`, and `violations[*]` entry. The `id`
field is the SOLE comparison key for drift computation.

### 9.2 Topology drift

```
nodes_added    = current.nodes.id  \  baseline.nodes.id
nodes_removed  = baseline.nodes.id \  current.nodes.id
nodes_changed  = { id ∈ current ∩ baseline | hash(current[id]) ≠ hash(baseline[id]) }

edges_added    = current.edges.id  \  baseline.edges.id
edges_removed  = baseline.edges.id \  current.edges.id
edges_changed  = { id ∈ current ∩ baseline | type(current[id]) ≠ type(baseline[id]) }
```

`nodes_changed` and `edges_changed` exist for forward
compatibility — v1.2 always returns them as empty arrays, since
node `id` and edge `(from, to, type)` are themselves the
identity. Future versions may surface real "changed" entries
when node metadata becomes part of the canonical shape.

### 9.3 Policy drift

Comparing `current.data.violations[]` against
`baseline.data.violations[]`, keyed by `violations[*].id`:

```
violations_new        = current.violations.id  \  baseline.violations.id
violations_resolved   = baseline.violations.id \  current.violations.id
violations_persisted  = current.violations.id  ∩  baseline.violations.id
violations_severity_changed = { id ∈ persisted | severity(current[id]) ≠ severity(baseline[id]) }
```

`violations_severity_changed` is also returned but typically
empty (severity is currently `"error"` for every blocking
violation).

### 9.4 Signal drift

Scalar deltas between baseline and current. Only fields that
appear in both reports are surfaced:

```jsonc
{
  "scoreDelta":         current.stability.score - baseline.stability.score,
  "coverageDelta":      current.topology.coverage - baseline.topology.coverage,
  "connectivityDelta":  current.topology.connectivity - baseline.topology.connectivity,
  "confidenceDelta":    current.topology.topologyConfidence - baseline.topology.topologyConfidence,
  "violationsDelta":    current.violations.length - baseline.violations.length,
  "graphSurfaceHashChanged": current.canonical.graphSurfaceHash !== baseline.canonical.graphSurfaceHash
}
```

Any baseline field that's missing on the current side surfaces
as `null` (not omitted; consumers can rely on key presence). The
last entry, `graphSurfaceHashChanged`, is a cheap "did anything
change?" gate: if `false`, every other drift array is also empty.

### 9.5 Determinism

Drift output is deterministic across runs given the same
`(baseline, current)` pair:

- All arrays sorted by `id` ascending.
- All scalar deltas computed at full `number` precision; renderers
  format to 2 / 4 decimal places per their own rules.
- No timestamps, no random IDs, no wall-clock fields inside any
  drift sub-object (envelope-level `emittedAt` is unaffected).
- Re-running on identical inputs produces byte-identical
  `data.drift` output.

---

## 10. Exit Behavior

The v1.2 exit-code contract is a strict extension of v1.0.3's
five-code surface. **Drift alone never fails CI.**

### 10.1 `check --baseline …`

| Condition | Exit | Status |
| --- | --- | --- |
| Baseline invalid (any reason in §8) | 2 | `error` |
| Adapter / extraction failure | 3 | `error` |
| Internal invariant failure | 5 | `internal_error` |
| **Current run has blocking violations** (regardless of baseline) | 1 | `blocked` |
| Current pass; topology drift only; no violations | 0 | `passed` |
| Current pass; baseline-detected resolved violations; no new violations | 0 | `passed` |
| No policy configured | 0 | `not_enforced` |

**Key principle:** the exit code is computed from the **current**
state. Baseline only affects what's reported, not what blocks. A
PR that fixes pre-existing violations exits 0; a PR that
introduces a new violation exits 1 regardless of how many old
violations are still around.

### 10.2 The "new blocking violations" question

The exit code is unchanged from v1.1.0: `check` exits 1 if the
**current** policy evaluation produced blocking violations.
v1.2 does NOT add a "only new violations block" mode — that
would mask pre-existing problems and break the
"check-on-its-own-merit" semantics that v1.x CI gates rely on.

The drift block is the place to surface *which* violations are
new vs. persisted vs. resolved. The exit code stays a strict
function of the current state.

The deferred `--fail-on-drift` flag (§7.4) could later promote
topology-only drift to exit 1, but is intentionally out of v1.2.

### 10.3 `analyze --baseline …`

`analyze` remains informational. Drift is surfaced in the same
shape as `check`'s drift block; exit code is always 0 unless the
baseline itself is invalid (exit 2) or extraction failed
(exit 3) or there's an internal invariant failure (exit 5).

### 10.4 Diagnostic exit semantics

| Diagnostic code | Severity | Exit | Notes |
| --- | --- | --- | --- |
| `ARCH_ENGINE_BASELINE_NOT_FOUND` | ERROR | 2 | Path doesn't exist or isn't readable. |
| `ARCH_ENGINE_BASELINE_INVALID` | ERROR | 2 | Parses but structurally malformed. |
| `ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA` | ERROR | 2 | Schema/version not supported. |
| `ARCH_ENGINE_BASELINE_COMMAND_MISMATCH` | ERROR | 2 | Baseline command incompatible. |
| `ARCH_ENGINE_DRIFT_DETECTED` | INFO | 0 | Drift detected; advisory unless paired with violation. |

`ARCH_ENGINE_DRIFT_DETECTED` is emitted any time
`data.drift.summary` is non-empty (any non-zero counter). It
never blocks; it exists so machine consumers and the human
output have a structured "this run produced drift" signal in
`diagnostics[]`.

---

## 11. JSON v2 Drift Contract

### 11.1 Top-level changes

The v2 envelope shape (§6 of `json-v2-ci-flags-spec.md`) gains
**no new top-level keys**. All v1.2 additions land under `data`.

The `status` enum is unchanged — drift alone never produces a
new status value. `summary.drift` (§11.5) adds a counter
sub-object inside the existing `summary`.

### 11.2 New: `data.topology.canonical`

**Emitted by:** `inspect`, `analyze`, `check` (always; no flag
required). Additive; replaces nothing.

```jsonc
{
  "data": {
    "topology": {
      // Existing v1.1 counters preserved verbatim.
      "nodes": 4,
      "edges": 2,
      "crossings": 0,
      "coverage": 1.0,
      "connectivity": 1.0,
      "topologyConfidence": 0.85,
      "topologyConfidenceLabel": "high",
      "extractionMode": "structured",
      "workspaceType": "yarn-npm",

      // NEW in v1.2 — the canonical lists that enable baseline
      // comparison.
      "canonical": {
        "graphSurfaceVersion": "1.0.0",
        "graphSurfaceHash": "sha256:f7ab1c…",
        "nodes": [
          { "id": "@demo-drift/frontend", "type": "package" },
          { "id": "@demo-drift/payments", "type": "package" },
          { "id": "@demo-drift/services", "type": "package" }
        ],
        "edges": [
          { "id": "e_a1b2c3d4", "from": "@demo-drift/frontend", "to": "@demo-drift/payments", "type": "workspace_dependency" },
          { "id": "e_5e6f7a8b", "from": "@demo-drift/services", "to": "@demo-drift/payments", "type": "workspace_dependency" }
        ]
      }
    }
  }
}
```

Ordering rules (locked):

- `canonical.nodes[]` sorted by `id` ascending.
- `canonical.edges[]` sorted by `id` ascending.
- `canonical.graphSurfaceHash` is computed deterministically
  from `(sorted_nodes, sorted_edges)`; algorithm fixed at
  sha256 of the concatenated canonical strings.

`graphSurfaceVersion` is `"1.0.0"` in v1.2; future v1.x may bump
to `"1.1.0"` etc. if the canonical surface evolves.

### 11.3 New: `data.drift` (only when `--baseline` is set)

```jsonc
{
  "data": {
    "drift": {
      "baseline": {
        "path": "arch-engine-baseline.json",
        "schemaVersion": "arch-engine.cli.v2",
        "command": "check",
        "archEngineVersion": "1.2.0",
        "emittedAt": "2026-05-10T08:00:00Z",
        "graphSurfaceHash": "sha256:abcd…"
      },
      "summary": {
        "graphSurfaceHashChanged": true,
        "addedNodes": 0,
        "removedNodes": 0,
        "changedNodes": 0,
        "addedEdges": 1,
        "removedEdges": 0,
        "changedEdges": 0,
        "newViolations": 1,
        "resolvedViolations": 0,
        "persistedViolations": 0,
        "violationSeverityChanged": 0,
        "scoreDelta": -0.12,
        "coverageDelta": 0,
        "connectivityDelta": 0,
        "confidenceDelta": 0,
        "violationsDelta": 1
      },
      "topology": {
        "addedNodes": [],
        "removedNodes": [],
        "changedNodes": [],
        "addedEdges": [
          {
            "id": "e_a1b2c3d4",
            "from": "@demo-drift/frontend",
            "to": "@demo-drift/payments",
            "type": "workspace_dependency"
          }
        ],
        "removedEdges": [],
        "changedEdges": []
      },
      "violations": {
        "new": [
          {
            "id": "v_f6766b5c",
            "ruleId": "frontend-must-not-touch-payment-gateway",
            "edge": { "from": "@demo-drift/frontend", "to": "@demo-drift/payments", "type": "workspace_dependency" },
            "severity": "error",
            "ciBlocking": true,
            "category": "explicit_forbid",
            "code": "ARCH_ENGINE_BLOCKING_VIOLATION"
          }
        ],
        "resolved": [],
        "persisted": [],
        "severityChanged": []
      },
      "signal": {
        "scoreDelta": -0.12,
        "coverageDelta": 0,
        "connectivityDelta": 0,
        "confidenceDelta": 0,
        "violationsDelta": 1,
        "graphSurfaceHashChanged": true
      }
    }
  }
}
```

### 11.4 Field rules

- All arrays are present even when empty (`[]`, not omitted).
- All `*Delta` numerics are present; baseline-absent values
  surface as `null`.
- `drift.baseline.path` is normalised to its `path.basename` if
  the user-supplied path is absolute; relative paths are
  preserved as-given. No absolute paths leak by default; the
  full absolute path is emitted only with `--verbose` (consistent
  with v1.1.0's path-privacy policy in §13 of
  `json-v2-ci-flags-spec.md`).
- `drift.violations.new[*]`, `…resolved[*]`, `…persisted[*]`
  carry the **same shape** as `data.violations[*]` — consumers
  can reuse v1.0.3 parsers verbatim.

### 11.5 New: `summary.drift` (top-level counters)

When `--baseline` is set, the existing top-level `summary`
object gains a `drift` sub-object mirroring the most-asked
counters from `data.drift.summary`:

```jsonc
{
  "summary": {
    "headline": "Blocked: 1 architecture violation. (drift: +1 violation, +1 edge)",
    "verdict": "blocked",
    "score": 0.47,
    "violations": 1,
    "warnings": 0,
    "diagnostics": 2,
    "drift": {
      "newViolations": 1,
      "resolvedViolations": 0,
      "addedEdges": 1,
      "removedEdges": 0
    }
  }
}
```

The `headline` field is rewritten when drift is non-zero —
machine consumers reading just `summary.headline` get drift
context without parsing the full `data.drift` block.

### 11.6 Stability across runs

For the same `(baseline, current)` pair on the same fixture, the
v2 output is byte-identical except for `emittedAt`. This is
verifiable via a hash-of-output test (mirror of the v1.1.0
determinism test).

### 11.7 What does NOT change

- JSON v1 is byte-identical to v1.1.0 / v1.0.3 — no drift
  surface in v1 (drift requires JSON v2 baseline).
- Existing v2 keys (`schemaVersion`, `command`,
  `archEngineVersion`, etc.) preserved verbatim.
- Status enum unchanged.
- Exit-code-to-status mapping unchanged.

---

## 12. Markdown Output Contract

Markdown gains one new section: **`## Architecture Drift`**,
inserted between `## Violations` and `## Diagnostics` in the
existing check/analyze template (locked in §10 of
`json-v2-ci-flags-spec.md`).

### 12.1 Section shape (drift present)

```markdown
## Architecture Drift

Compared against `arch-engine-baseline.json` (arch-engine@1.2.0,
emitted 2026-05-10).

| Type | Count |
| --- | ---: |
| New blocking violations | 1 |
| Resolved violations | 0 |
| Persisted violations | 0 |
| Added edges | 1 |
| Removed edges | 0 |
| Score delta | -0.12 |

### New violating edges

| Rule | From | To | Severity | CI-blocking |
| --- | --- | --- | --- | --- |
| `frontend-must-not-touch-payment-gateway` | `@demo-drift/frontend` | `@demo-drift/payments` | error | yes |

### Added edges

| From | To | Type |
| --- | --- | --- |
| `@demo-drift/frontend` | `@demo-drift/payments` | `workspace_dependency` |
```

### 12.2 Section shape (no drift)

```markdown
## Architecture Drift

Compared against `arch-engine-baseline.json` (arch-engine@1.2.0).

_No architectural drift detected._
```

### 12.3 Ordering and caps

Mirroring the v1.1.0 markdown rules:

- **Tables sorted** by canonical id ascending.
- **Caps:** 25 entries per drift sub-table (the v1.1 violation cap
  was 50; drift sub-tables are tighter to keep PR comments
  scannable). Overflow line: `_…and N more (see JSON v2 for full
  data)._`
- **No timestamps** outside the existing `Compared against …`
  attribution line.
- **No absolute paths.** The baseline reference uses
  `path.basename` of the user-supplied path.
- **Size cap** carries forward (250 KB total markdown). If drift
  data pushes the document over the cap, the drift section is
  truncated last (its detail tables drop first; the summary
  counters table is preserved).

### 12.4 Verdict line update

When drift is non-zero, the `**Verdict:**` line at the top of
the markdown gains a parenthetical:

```markdown
**Verdict:** Blocked _(drift: +1 violation, +1 edge)_
```

The parenthetical is omitted when all drift counters are zero.

### 12.5 Next-action block

The existing `## Next` block gains drift-specific actions:

- **New blocking violation:** "Review the new edge(s) above, or
  update your policy if the change is intentional."
- **Resolved violations only:** "Previously-blocking violations
  have been fixed. Re-run on `main` to update the baseline."
- **Topology drift only:** "No blocking violations were
  introduced. Review drift if surprising."

---

## 13. Human Output Contract

The human renderer gains an `Architecture drift` block before
the existing exit footer (in `check`) or before the "Next:"
line (in `analyze`). Color follows the v1.0.x palette: red for
new violations, yellow for non-blocking drift, dim for resolved
items.

### 13.1 Blocked-with-drift example (check)

```
  Workspace:            yarn-npm (structured)
  Confidence:           HIGH
  Coverage:             100%
  Connectivity:         100%
  Authority cross.:     0 observed
  Policy Evaluation:    1 violations (enforce mode)

Blocked: 1 architecture violation.

  ✗ @demo-drift/frontend → @demo-drift/payments   (blocks CI)
    Rule:     frontend-must-not-touch-payment-gateway
    Severity: error

Architecture drift detected (compared against arch-engine-baseline.json):

  New blocking violations:
    ✗ frontend-must-not-touch-payment-gateway

  New edges:
    + @demo-drift/frontend → @demo-drift/payments

  Score: 0.59 → 0.47 (-0.12)

Fix: review the new edge or update policy if intentional.
Exit 1: blocking architecture violations.
```

### 13.2 Drift-only example (check, no violations)

```
  …existing pass-path output…

✔ Pass. No blocking architecture violations.

Architecture drift observed (compared against arch-engine-baseline.json):

  Added edges (1):
    + @demo-drift/services → @demo-drift/analytics

  Score: 0.85 → 0.82 (-0.03)

Next: review drift. No blocking architecture violations were introduced.
```

### 13.3 No-drift example

```
  …existing pass-path output…

✔ Pass. No blocking architecture violations.

✔ No architectural drift detected (compared against arch-engine-baseline.json).

Exit 0: no blocking architecture violations.
```

### 13.4 Render rules

- **Quiet mode** (`--quiet`) suppresses the verbose drift table
  but keeps the verdict-level summary line (`Architecture drift
  detected`) and the exit footer.
- **Verbose mode** (`--verbose`) adds the absolute baseline path
  and the full baseline `emittedAt` timestamp.
- **CI mode** (`--ci`) drops ANSI as in v1.1.0; otherwise
  identical to the example output.
- **Cap:** at most 5 entries per drift section in human output
  (matches the v1.0.x violation cap). Overflow line: `... and N
  more (see --json for the full list).`

---

## 14. Artifact / Storage Guidance

### 14.1 Canonical baseline generation

The user runs `check` (or `analyze`) on the desired baseline
state, redirecting JSON v2 output to a file:

```bash
npx arch-engine check --ci \
  --json --json-schema=v2 \
  --output arch-engine-baseline.json
```

Recommended naming: `arch-engine-baseline.json` at the repo
root (gitignored, or stored as a CI artifact).

### 14.2 Local workflow

```bash
# 1. Build a baseline of the current branch's HEAD.
npx arch-engine check --ci --json --json-schema=v2 \
  --output arch-engine-baseline.json

# 2. Edit code, introduce drift.
#    …

# 3. Compare current working tree against the baseline.
npx arch-engine check --ci \
  --baseline arch-engine-baseline.json \
  --format markdown --output arch-engine-report.md

# 4. Read the report.
cat arch-engine-report.md
```

### 14.3 CI workflow (sketch)

The full GitHub Actions implementation is deferred to a future
demo pass (§15), but the v1.2 contract supports the following
pattern:

1. On every push to `main`, generate the baseline and upload it
   as a build artifact (or commit it to a `arch-engine-baseline`
   branch).
2. On every PR, download the latest `main` baseline and compare:

   ```bash
   npx arch-engine check --ci \
     --baseline ./baselines/arch-engine-baseline.json \
     --format markdown --output arch-engine-report.md
   ```

3. Post the markdown report as a PR comment via the v1.1.0
   sticky-comment template (`examples/github-actions/arch-engine-pr-comment.yml`).

### 14.4 Baseline lifecycle

v1.2 does not prescribe a lifecycle policy. Reasonable choices
the CLI supports without modification:

- **Per-commit baseline** — generate one on every push to
  `main`; treat the previous commit as the comparison point.
- **Tagged-release baseline** — generate on release-tag
  promotions; PRs compare against the most recent release tag.
- **Mainline-only baseline** — single baseline file in
  `arch-engine-baselines/main.json`, regenerated on every main
  push.

Whichever lifecycle the user picks, the CLI just reads the file
the user points it at. No CLI assumption about lifecycle.

### 14.5 Privacy and reproducibility

Per §11.4 the baseline file does not include absolute paths
(except when generated with `--verbose`). Committing a baseline
to a public repo is safe by default.

Baselines are deterministic for a given source tree — re-running
the same generator on the same checkout produces a byte-identical
file modulo `emittedAt`. Implementations MAY add an `--omit-emitted-at`
flag in v1.3 for fully byte-identical regeneration, but v1.2
ships without it.

---

## 15. GitHub Actions Follow-Up

This spec does **not** ship workflow templates. A future demo
pass will ship one or two templates under
`examples/github-actions/` to mirror the existing
`arch-engine-pr-report.yml` / `arch-engine-pr-comment.yml`
pair:

- `arch-engine-pr-baseline-report.yml` — downloads the `main`
  baseline artifact, runs `check --baseline …`, uploads the
  drift-aware report.
- `arch-engine-pr-baseline-comment.yml` — same plus sticky PR
  comment.

That demo pass is the natural sequel to this spec + the v1.2
implementation pass. v1.2 itself does not depend on it.

### 15.1 Why workflows are deferred

- The baseline-storage decision (artifact upload vs. dedicated
  branch vs. cache action) is workflow-shape concern, not CLI
  concern. Shipping multiple workflow variants is appropriate
  AFTER the CLI surface lands and users vote with their feet.
- Splitting the spec from the demo keeps the v1.2 implementation
  pass focused on the CLI contract.

---

## 16. Error Code Additions

The v1.0.3 `ARCH_ENGINE_*` vocabulary (locked in
`json-error-language-spec.md` §6.2) grows by FIVE codes in v1.2:

| Code | Severity | Exit | Title | Default Fix |
| --- | --- | --- | --- | --- |
| `ARCH_ENGINE_BASELINE_NOT_FOUND` | ERROR | 2 | Baseline file not found. | Check the path passed to `--baseline`. Relative paths resolve from the current working directory. |
| `ARCH_ENGINE_BASELINE_INVALID` | ERROR | 2 | Baseline file is structurally invalid. | Re-generate the baseline with `arch-engine check --ci --json --json-schema=v2 --output <path>`. |
| `ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA` | ERROR | 2 | Baseline schema not supported. | Baseline must be Arch-Engine JSON v2 (schemaVersion `arch-engine.cli.v2`) emitted by `arch-engine@>=1.2.0`. Re-generate with a current CLI version. |
| `ARCH_ENGINE_BASELINE_COMMAND_MISMATCH` | ERROR | 2 | Baseline command is incompatible with current command. | Use a baseline generated by `check`, `analyze`, or `inspect` when running `check` or `analyze`. |
| `ARCH_ENGINE_DRIFT_DETECTED` | INFO | 0 | Architecture drift detected. | Review the drift section; update policy or revert the change if it's unintentional. |

### 16.1 Code-ordering decision

The existing 11 v1.0.3 codes plus the 5 new codes total 16.
They retain their declaration order:

```
ARCH_ENGINE_POLICY_NOT_FOUND
ARCH_ENGINE_INVALID_POLICY
ARCH_ENGINE_INVALID_CONFIG
ARCH_ENGINE_ADAPTER_NOT_FOUND
ARCH_ENGINE_UNSUPPORTED_WORKSPACE
ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL
ARCH_ENGINE_GRAPH_SHAPE_INVALID
ARCH_ENGINE_TARGET_NOT_FOUND
ARCH_ENGINE_BLOCKING_VIOLATION
ARCH_ENGINE_INTERNAL_INVARIANT_FAILED
ARCH_ENGINE_NO_BASELINE
ARCH_ENGINE_BASELINE_NOT_FOUND        (NEW v1.2)
ARCH_ENGINE_BASELINE_INVALID          (NEW v1.2)
ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA (NEW v1.2)
ARCH_ENGINE_BASELINE_COMMAND_MISMATCH  (NEW v1.2)
ARCH_ENGINE_DRIFT_DETECTED             (NEW v1.2)
```

The pre-existing `ARCH_ENGINE_NO_BASELINE` is unrelated — it
flags the *absence* of the v1.0.3 stability-score artifact in
`explain regression`. It does not conflict with the v1.2 baseline
codes and remains in place.

### 16.2 Human render examples

`ARCH_ENGINE_BASELINE_NOT_FOUND`:

```
Baseline file not found.

Problem:
  The path "./old-baseline.json" did not resolve to a regular file.

Fix:
  Check the path passed to --baseline. Relative paths resolve
  from the current working directory.

Exit 2: invalid input or configuration.
Docs: https://arch-engine.dev/cli/baseline
```

`ARCH_ENGINE_DRIFT_DETECTED` (INFO, no Exit line):

```
Architecture drift detected.

Problem:
  Compared against arch-engine-baseline.json: 1 new violation,
  1 added edge.

Next:
  Review the drift section; update policy or revert the change
  if it's unintentional.

Docs: https://arch-engine.dev/cli/baseline
```

---

## 17. Test Plan

The v1.2 implementation pass MUST ship tests covering every
contract in this document. Suggested structure (mirrors Phase F
of the v1.1.0 implementation):

### 17.1 New test files

- `packages/cli/tests/cli-experience-phase-g-baseline-validation.test.ts`
- `packages/cli/tests/cli-experience-phase-g-drift-model.test.ts`
- `packages/cli/tests/cli-experience-phase-g-baseline-json-v2.test.ts`
- `packages/cli/tests/cli-experience-phase-g-baseline-markdown.test.ts`
- `packages/cli/tests/cli-experience-phase-g-baseline-human.test.ts`

### 17.2 Coverage matrix

**Baseline validation (§8):**

- Baseline path doesn't exist → exit 2 with `ARCH_ENGINE_BASELINE_NOT_FOUND`.
- Baseline path is a directory → exit 2 with `ARCH_ENGINE_BASELINE_NOT_FOUND`.
- Baseline file doesn't parse → exit 2 with `ARCH_ENGINE_BASELINE_INVALID`.
- Wrong `schemaVersion` → exit 2 with `ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA`.
- Wrong `command` (e.g. `doctor`) → exit 2 with `ARCH_ENGINE_BASELINE_COMMAND_MISMATCH`.
- Missing `data.topology.canonical` → exit 2 with `ARCH_ENGINE_BASELINE_INVALID`.
- `archEngineVersion < 1.2.0` → exit 2 with `ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA`.
- `archEngineVersion > current runtime` → WARNING diagnostic, run continues.

**Drift detection (§9):**

- Identical baseline and current → all drift arrays empty.
- New edge → appears in `drift.topology.addedEdges[]`.
- Removed edge → appears in `drift.topology.removedEdges[]`.
- New violation → appears in `drift.violations.new[]`.
- Resolved violation → appears in `drift.violations.resolved[]`.
- Persisted violation → appears in `drift.violations.persisted[]`.
- `graphSurfaceHashChanged` flips correctly.
- Scalar deltas computed correctly.

**Exit behavior (§10):**

- `check` with current blocking violations + baseline → exit 1
  regardless of drift content.
- `check` with no current violations + drift → exit 0.
- `check` with no current violations + resolved baseline violations
  → exit 0.
- `check` no-policy + baseline → exit 0 (`not_enforced`).
- `analyze --baseline` → exit 0 even when drift exists.
- Invalid baseline → exit 2.

**JSON v2 shape (§11):**

- `data.topology.canonical.{nodes, edges, graphSurfaceHash}`
  present in inspect/analyze/check v2 outputs without `--baseline`.
- `data.drift` present only when `--baseline` is set.
- All `data.drift.*` arrays sorted by id.
- `data.drift.baseline.path` does NOT contain absolute paths
  without `--verbose`.
- `summary.drift` mirrors top-level counters.
- `summary.headline` carries the drift parenthetical when drift
  is non-zero.
- Byte-identical output across two runs of the same `(baseline,
  current)` pair, modulo `emittedAt`.

**Markdown output (§12):**

- `## Architecture Drift` section appears in markdown when
  `--baseline` is set.
- "No drift" path produces single-paragraph section.
- Table caps (25 entries) respected.
- No absolute paths in markdown.
- `**Verdict:**` line gains drift parenthetical when applicable.

**Human output (§13):**

- Drift block appears before the exit footer in `check`.
- `--quiet` suppresses the detail table but keeps the verdict line.
- `--verbose` adds absolute baseline path.
- 5-entry cap on human drift lists, overflow line correct.

**Backward compatibility:**

- JSON v1 output byte-identical to v1.1.0 when `--baseline` not
  used (drift requires v2).
- JSON v1 output byte-identical when `--baseline` IS used (drift
  data goes to v2 only).
- `data.topology.canonical` is the only new key in v2 default
  (no-baseline) output.
- Existing Phase A–F tests stay green.
- No new commands.
- No version-default flip.

**Determinism (§9.5):**

- Re-running the same `(baseline, current)` produces
  byte-identical drift output.
- `canonical.edges[].id` is stable across runs.
- `canonical.graphSurfaceHash` is stable across runs.

### 17.3 Snapshot tests

Lock the markdown / human / JSON-v2 drift shapes via snapshots
against the `examples/demo-drift` fixture, mirroring the
v1.1.0 Phase F snapshot pattern.

---

## 18. Acceptance Criteria for Implementation Pass

The v1.2.0 implementation pass succeeds **if and only if** all
of the following are satisfied:

1. `--baseline <path>` is implemented for `check` and `analyze`;
   rejected with `ARCH_ENGINE_INVALID_CONFIG` on other commands.
2. The five new `ARCH_ENGINE_BASELINE_*` / `ARCH_ENGINE_DRIFT_DETECTED`
   codes are added to `packages/cli/src/error-codes.ts` with the
   metadata locked in §16.
3. `data.topology.canonical` is emitted by inspect/analyze/check
   v2 outputs whether or not `--baseline` is set.
4. `data.drift` is emitted by check/analyze v2 outputs ONLY when
   `--baseline` is set.
5. `summary.drift` and `summary.headline` carry the v1.2
   adjustments when drift is non-zero.
6. Markdown output gains the `## Architecture Drift` section
   per §12.
7. Human output gains the drift block per §13.
8. All exit-code rules in §10 hold.
9. JSON v1 default output is byte-identical to v1.1.0 (verified
   by snapshot test).
10. Phase A / B / C / D-Lite / E / F suites stay green unchanged.
11. New Phase G tests cover the matrix in §17.2.
12. No new public exports from `@arch-engine/cli`.
13. No new dependencies in any `package.json`.
14. No AGP dependency.
15. `npm run build`, `npm run typecheck`, `npm test`,
    `npm pack --dry-run` all pass.
16. Tag and publish as v1.2.0 via the established
    release-prep pass (separate human-driven mission).

### 18.1 Out of scope for the v1.2.0 implementation pass

Reserved for future iterations:

- `--baseline-label`, `--current-label`, `--drift-mode`,
  `--fail-on-drift`.
- GitHub Actions workflow templates for baseline (deferred
  to a separate demo pass).
- Cloud / SaaS baseline store.
- Auto-fix / policy suggestion from drift.
- `explain drift` mode.
- JSON v1 drift surface (intentional — JSON v2 only).

---

*End of Baseline Comparison Specification.*
