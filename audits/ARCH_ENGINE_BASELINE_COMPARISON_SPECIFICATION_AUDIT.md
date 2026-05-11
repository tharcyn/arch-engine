# Arch-Engine Baseline Comparison Specification Audit

**Audit date:** 2026-05-11
**Auditor:** Claude Opus 4.7 (1M context), spec/design pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**Pre-pass HEAD:** `5d9d83d docs(examples): add GitHub Actions PR report demo`
**Target spec:** [`docs/cli/baseline-comparison-spec.md`](../docs/cli/baseline-comparison-spec.md)
**Target release:** `@arch-engine/cli@1.2.0` (minor)

**Predecessor docs:**
- [`docs/cli/cli-experience-spec.md`](../docs/cli/cli-experience-spec.md)
- [`docs/cli/json-error-language-spec.md`](../docs/cli/json-error-language-spec.md)
- [`docs/cli/json-v2-ci-flags-spec.md`](../docs/cli/json-v2-ci-flags-spec.md)
- [`examples/github-actions/README.md`](../examples/github-actions/README.md)

**Predecessor audits:**
- [`audits/ARCH_ENGINE_JSON_V2_CI_FLAGS_IMPLEMENTATION_AUDIT.md`](./ARCH_ENGINE_JSON_V2_CI_FLAGS_IMPLEMENTATION_AUDIT.md)
- [`audits/ARCH_ENGINE_GITHUB_ACTIONS_PR_DEMO_AUDIT.md`](./ARCH_ENGINE_GITHUB_ACTIONS_PR_DEMO_AUDIT.md)
- [`audits/release/ARCH_ENGINE_V1_1_0_MINOR_RELEASE_PREFLIGHT.md`](./release/ARCH_ENGINE_V1_1_0_MINOR_RELEASE_PREFLIGHT.md)

---

## 1. Executive Verdict

**`BASELINE_COMPARISON_SPEC_READY_FOR_IMPLEMENTATION`**

The v1.2.0 Baseline Comparison contract is locked at
[`docs/cli/baseline-comparison-spec.md`](../docs/cli/baseline-comparison-spec.md).
The spec is **deterministic, additive, and patch-shaped** on top
of v1.1.0:

- **One new public flag** (`--baseline <path>`) on `check` and
  `analyze`.
- **One new sub-object** (`data.topology.canonical`) added
  unconditionally to inspect/analyze/check v2 outputs.
- **One new sub-object** (`data.drift`) added conditionally to
  check/analyze v2 outputs when `--baseline` is set.
- **One new markdown section** (`## Architecture Drift`)
  inserted into the existing v1.1.0 markdown template.
- **One new human output block** with the same drift content.
- **Five new error codes** prefixed `ARCH_ENGINE_BASELINE_*` /
  `ARCH_ENGINE_DRIFT_DETECTED`.

JSON v1 is untouched. The five-command surface is unchanged. No
new dependencies. No AGP integration. No version-default flip.
The exit-code contract grows by zero codes (exits 0–5 unchanged)
and grows by one mapping rule (`ARCH_ENGINE_BASELINE_*` all
exit 2).

The implementation pass is sized comparably to the v1.0.3
implementation pass — one main feature, a handful of new
internal modules, a Phase G test suite mirroring Phase F's
structure. Acceptance criteria in §18 of the spec are
exhaustive and verifiable.

No open questions block implementation. Three deliberate deferrals
(GitHub Actions baseline workflow, `--fail-on-drift`,
`--baseline-label`) are documented in §4 and §15 of the spec as
future opt-ins.

---

## 2. Scope

**Spec / design pass only. No code changes.**

This pass produced two files:

1. `docs/cli/baseline-comparison-spec.md` — the v1.2.0 contract
   (18 sections, ~1100 lines).
2. `audits/ARCH_ENGINE_BASELINE_COMPARISON_SPECIFICATION_AUDIT.md`
   — this audit.

No source code, no package.json, no test, no workflow, no
README cross-link was modified in this pass. The
implementation pass (separate mission) will produce the source
code and tests that this spec drives.

---

## 3. Current Product Surface Reviewed

### 3.1 Released CLI surface (as of HEAD = `5d9d83d`)

| Layer | Status | Locked by |
| --- | --- | --- |
| Five commands (`doctor`, `inspect`, `analyze`, `check`, `explain <target>`) | ✅ stable since v1.0.x | `cli-experience-spec.md` |
| JSON v1 default for `--json` | ✅ stable since v1.0.x | `json-error-language-spec.md` §8 |
| JSON v2 opt-in via `--json-schema=v2` | ✅ stable since v1.1.0 | `json-v2-ci-flags-spec.md` §6 |
| Markdown output via `--format markdown` | ✅ stable since v1.1.0 | `json-v2-ci-flags-spec.md` §10 |
| `--output <path>` writer | ✅ stable since v1.1.0 | `json-v2-ci-flags-spec.md` §8.4 |
| `--ci` deterministic mode | ✅ stable since v1.1.0 | `json-v2-ci-flags-spec.md` §11 |
| `--quiet` / `--verbose` | ✅ stable since v1.1.0 | `json-v2-ci-flags-spec.md` §8 |
| `diagnostics[]` array in every JSON output | ✅ stable since v1.0.3 | `json-error-language-spec.md` §8 |
| `violations[]` with stable `v_<hex8>` ids | ✅ stable since v1.0.3 | `json-error-language-spec.md` §10.4 |
| 11 `ARCH_ENGINE_*` error codes | ✅ stable since v1.0.3 | `json-error-language-spec.md` §6.2 |
| GitHub Actions PR templates | ✅ shipped at HEAD | `examples/github-actions/README.md` |

### 3.2 Existing artifacts and JSON fields that drift can read from

The spec's §11.2 leans on the v1.1.0 `check.data.topology` and
`analyze.data.topology` blocks (already locked in
`json-v2-ci-flags-spec.md` §7) and on the v1.0.3 stable violation
id (`violations[*].id` = `v_<hex8>`). The v1.2 spec adds
`data.topology.canonical` as the new piece — the canonical
sorted node / edge lists with deterministic hash — because the
v1.1.0 envelope emits only counters, not the lists needed for
per-element diff.

### 3.3 Existing baseline-related machinery (NOT used in v1.2)

The legacy `.arch-engine/stability-score.json` artifact + the
`explain regression` command read a different kind of "baseline"
(internal regression-detection state with `comparisonBaseline`,
`regressionDelta`, `baselineFound`, `lineageDepth`, etc.). The
v1.2 spec explicitly DECLINES to reuse this artifact as the
baseline source (§6.2 of the spec). Reasons:

1. `stability-score.json` does not carry the canonical topology
   lists.
2. Its lifecycle is owned by `check`'s auto-emit, not by the
   user — making it unsuitable as a "the user generated this
   on `main` and uploads it" artifact.
3. The internal-regression fields are tuned for trend analysis,
   not for diff against a discrete baseline.

The pre-existing `ARCH_ENGINE_NO_BASELINE` code (in the v1.0.3
vocabulary) flags absence of the stability-score artifact when
`explain regression` runs. It is unrelated to the v1.2 baseline
codes and is preserved verbatim.

### 3.4 `TopologyGraph` in `@arch-engine/core`

`packages/core/src/topology/TopologyGraph.ts` defines a
`graphSurfaceHash` field used by the federation execution
pipeline. The v1.2 spec reuses the same **concept** (a
deterministic hash of the canonical graph surface) but at a
different level — the CLI's workspace topology, not the
federation execution surface. The v1.2 implementation pass will
compute its own hash from the canonical node/edge lists locked
in spec §11.2. There is no collision.

---

## 4. Main Design Decisions

### 4.1 One flag, not many

The MVP surface is exactly one new flag: `--baseline <path>`.
Deferred flags (§4 and §7.4 of the spec):

| Deferred flag | Rationale for deferral |
| --- | --- |
| `--baseline-label <label>` / `--current-label <label>` | Cosmetic; users haven't asked. Adds combinatorial complexity to markdown/human renders. Easy to add in v1.3 if requested. |
| `--drift-mode all\|new-only\|policy-only` | Drift output is comprehensive by default; the `data.drift.summary` counters let consumers pick what they care about. A flag for narrowing is over-engineering until users hit a real ceiling. |
| `--fail-on-drift` | Promoting drift to a failure mode is a meaningful product change — it would invert "drift is diagnostic" into "drift is breaking". Defer until a user demands it; the current contract (only NEW blocking violations fail CI) is the right default. |

### 4.2 Baseline = JSON v2 file, period

The baseline source is a prior JSON v2 envelope **file**. Not a
git ref, not a remote URL, not a cloud store. This is the
narrowest contract that:

- Works without any environment assumptions (CI / local / fork
  PRs).
- Is verifiable by the v1.1.0 JSON v2 contract that already
  exists.
- Has a clean error-code surface (file-shape errors are
  observable).
- Has zero network surface.

### 4.3 Drift is additive, never breaking

Every v1.2 addition is conditional on either:
1. **Always-on** (`data.topology.canonical`) — additive new key
   under existing object. Doesn't break existing v2 consumers.
2. **Flag-gated** (`data.drift`, `summary.drift`,
   `summary.headline` parenthetical, markdown section, human
   block) — only emitted when `--baseline` is set.

JSON v1 consumers see ZERO new keys. Existing JSON v2 consumers
see one new sub-object (`data.topology.canonical`) which they
can safely ignore. This matches the v1.0.3 precedent
(`diagnostics: []`) and the v1.1.0 precedent (`schemaVersion`,
`emittedAt`, …).

### 4.4 Drift never blocks; current violations do

The exit-code contract from v1.1.0 is preserved exactly:

- Exit 1 = current run has blocking violations. Whether they're
  "new" or "persisted" is reported but does not affect exit.
- Exit 0 = current run has no blocking violations. Drift is
  diagnostic.

This is the simplest semantics consistent with "every PR
deserves the same gate" — a PR cannot exit 0 just because the
baseline already had violations. Surfacing `new` vs.
`persisted` in the drift block is the right place to highlight
"this PR's contribution"; the exit code stays a strict function
of the current state.

### 4.5 Canonical ids are content-addressed

The v1.2 spec locks:

- Node id = canonical entity name (from the workspace adapter).
- Edge id = `e_` + sha256(`from|to|type`)[0..8].
- Violation id = existing v1.0.3 `v_` + sha256(...)[0..8].

These are deterministic, do not require state, and survive
re-runs on the same source tree. The 8-character hex truncation
collides with probability ~1e-9 for any reasonable repo size;
acceptable for v1.2. The v2.0 spec may widen to 12 chars if
real-world collisions surface.

### 4.6 `graphSurfaceHash` as a fast "did anything change?" gate

The `data.topology.canonical.graphSurfaceHash` is a cheap
single-string comparison. When it matches between baseline and
current, no other drift work is needed; the implementation can
short-circuit and emit `data.drift.summary.graphSurfaceHashChanged
= false` with empty arrays. This keeps the common case (no-op
PR) cheap.

### 4.7 Schema floor at `arch-engine@1.2.0`

Baselines emitted by v1.1.0 do NOT have `data.topology.canonical`
and therefore cannot serve as baselines. The spec is explicit
(§6.1): `archEngineVersion >= 1.2.0` is required. Users on the
v1.1.0 release will need to regenerate their baseline once v1.2
ships. This is acceptable because:

1. Baselines are generated, not stored long-term in most
   workflows.
2. The error message under `ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA`
   explicitly says "needs >= 1.2.0".
3. CI re-generation is a one-command refresh.

### 4.8 Newer-than-runtime is a warning, not an error

A baseline emitted by `arch-engine@1.3.0` consumed by
`arch-engine@1.2.0` produces a WARNING and proceeds. This is
the v2.0 future-compatibility hatch: the v1.2 spec only reads
fields it knows about and ignores unknown ones, so a v1.3
baseline with extra `canonical.weights[]` will compare cleanly
against the v1.2 fields. This avoids cascading breakage when
teams roll back their CLI versions but their baseline is still
on the newer one.

---

## 5. Why v1.2

This release is `1.2.0`, not `1.1.x` (patch), because:

1. **One new public flag.** `--baseline` joins the global
   option surface. Adding public flags is a feature addition,
   not a patch. (Same rationale as v1.1.0's six flags.)
2. **One new public sub-object** (`data.topology.canonical`)
   on three command outputs. New top-level JSON keys are minor-
   release shape changes.
3. **New error codes.** Five new codes added to the locked
   vocabulary. Vocabulary growth is minor-shape.
4. **New markdown section** (`## Architecture Drift`). New
   public render output.
5. **No breaking change.** Every default identical to v1.1.0
   byte-for-byte when `--baseline` is not used.

The release follows the established lockstep convention: all
seven public packages bump from `1.1.0` → `1.2.0` together
when the implementation pass lands.

---

## 6. Baseline Format Decision

The baseline is **the JSON v2 envelope file generated by
`check`, `analyze`, or `inspect`**. Rationale documented in
spec §6 and audit §4.2.

**Rejected alternatives:**

| Alternative | Why rejected |
| --- | --- |
| `.arch-engine/stability-score.json` | Lacks canonical topology lists; lifecycle is auto-emit not user-emit; trend-analysis schema not diff-friendly. |
| Git ref / `--baseline-ref main` | Requires CLI to orchestrate git checkout. Out of scope for v1.x. |
| Remote URL / S3 / GCS | Adds network surface; complicates fork-PR safety; defer to a SaaS track. |
| Custom new artifact (e.g. `.arch-engine/canonical.json`) | New artifact = new spec + new lifecycle for users. Reusing the JSON v2 envelope is strictly cheaper. |

**Decision drivers:**

- Single source of truth for "what topology Arch-Engine saw".
- Users already know how to generate JSON v2 (v1.1.0 contract).
- The `--output <path>` writer handles the I/O (v1.1.0).
- No new file format to learn, validate, or document.

---

## 7. Drift Model Decision

Three orthogonal axes: **topology** (node/edge add/remove),
**policy** (new/resolved/persisted violations), **signal**
(score/coverage/connectivity/confidence deltas).

The choice to split into three axes (rather than one flat
"drift" array) lets consumers:

- Filter by axis cheaply (read only `data.drift.violations.new[]`).
- Render different axes differently in markdown
  (Violations table, Edges table, Score line).
- Reason about CI gating per-axis if `--fail-on-drift`
  ever lands.

**Canonical id forms** (locked in spec §9.1):

- Node id = `string` (adapter-emitted canonical entity name).
- Edge id = `"e_" + sha256(\`from|to|type\`)[0..8]`.
- Violation id = existing `"v_" + sha256(...)[0..8]` from v1.0.3.

These are content-addressed and deterministic. They survive
re-orderings, package renames inside the same workspace
(within reason), and concurrent runs.

**Future-compat:** `nodes_changed` / `edges_changed` /
`violations_severityChanged` are reserved fields that v1.2
always returns empty. v1.3+ implementations can populate them
when richer node metadata or severity variability becomes part
of the canonical surface.

---

## 8. Exit Behavior Decision

The v1.2 exit-code contract is a **strict extension** of v1.0.3
/ v1.1.0. The spec's §10 locks the matrix; the decision is:

**Drift alone never fails CI.** The exit code is computed from
the current state only. New violations exit 1; resolved
violations don't make a passing run exit non-zero.

**Why not "only new violations block"?**

- It would let pre-existing violations slide silently. A team
  inherits a repo with violations, baseline reflects them,
  every PR exits 0, no one fixes them.
- It muddles the "current state passes" semantics that v1.x CI
  gates rely on. Required-status-checks today mean "the current
  branch's architecture is OK"; switching to "the current branch
  didn't add anything bad" is a meaningful semantic shift that
  deserves its own flag (`--fail-on-drift` in a future release).

**Why not "drift counts as failure"?**

- Topology drift in a healthy workflow is normal — adding a
  service, splitting a package, etc. Most drift is intentional.
- Failing CI on every topology change would teach users to
  ignore Arch-Engine; the structured drift report is enough to
  surface intentionally-vs-unintentionally drift in code review.

**Result:** the exit code stays a strict function of `check`'s
current verdict. Drift augments the *report*, not the verdict.

---

## 9. Open Questions

None blocking implementation. Three minor questions to revisit
during the v1.2.0 implementation pass:

### 9.1 Should `inspect --baseline` ship in v1.2?

The spec defers it (§4). `inspect` already emits the canonical
topology that becomes a baseline, but it doesn't carry
violations and its v2 envelope doesn't have a `data.verdict`. A
trivial `inspect --baseline` would only report topology drift.

**Trade-off:** shipping it costs ~50 lines of code (reuse the
topology-drift sub-engine that `check` already needs).
Skipping it keeps the v1.2 surface tighter and avoids extra
spec text for the "what does `inspect --baseline` look like in
markdown?" question.

**Recommendation:** the v1.2.0 implementation pass should ship
it if the cost stays under one extra file (likely; the topology-
drift sub-engine is shared with `check`). If it would require a
new test suite of its own, defer.

### 9.2 Should `summary.headline` carry the drift parenthetical when violations are blocking?

The spec (§11.5) says yes:

```
"headline": "Blocked: 1 architecture violation. (drift: +1 violation, +1 edge)"
```

Alternative: keep `headline` blocked-violation-pure and put the
drift summary on a new line. The single-line form is easier to
grep; the two-line form is easier to read. The spec picks
single-line; the implementation pass may decide to soft-wrap if
review surfaces strong preference.

### 9.3 What hash algorithm for `canonical.graphSurfaceHash`?

The spec specifies sha256 (§11.2). The output format is left
slightly flexible: `"sha256:<64-hex>"` (prefixed) vs. just
`"<64-hex>"`. The implementation pass should pick one and lock
it; the spec's examples use both interchangeably and that
should be tightened. **Recommendation:** unprefixed 64-hex
(matches the v1.0.3 violation-id hash form, no algorithm
identifier needed at the data layer; the algorithm is a
contract choice).

---

## 10. Recommended Implementation Order

When the v1.2.0 implementation pass kicks off, the recommended
sequence is:

1. **Add the five new error codes** to
   `packages/cli/src/error-codes.ts` (additive metadata table
   entry per spec §16). Trivial; one PR/commit.
2. **Build the canonical topology emitter.** New helper
   (probably in a new file `packages/cli/src/render-v2.ts` or
   sibling) that takes the current extraction output and emits
   `data.topology.canonical` with deterministic IDs and hash.
   Add unconditionally to inspect/analyze/check v2 paths.
   Snapshot tests verify byte-identical re-runs.
3. **Implement the baseline reader.** New helper
   `packages/cli/src/baseline-reader.ts`. Reads + validates the
   file per spec §8. Returns either a typed baseline object or
   exits 2 with the right diagnostic.
4. **Implement the drift engine.** New helper
   `packages/cli/src/drift.ts`. Pure function:
   `(baseline, current) → DriftResult`. Three axes, deterministic
   ordering, no I/O. Heavy unit-test coverage; this is the heart
   of the feature.
5. **Wire the `--baseline` flag** in `packages/cli/src/cli-options.ts`
   (parse + validate the flag, including the "only valid on
   `check`/`analyze`" rule) and in `cli.ts` (register the flag).
6. **Wire `check` to consume drift.** Modify
   `packages/cli/src/commands/check.ts` to call the baseline
   reader and the drift engine when `--baseline` is set, and to
   add `data.drift` to the v2 emission path.
7. **Wire `analyze`** analogously.
8. **Update the markdown renderer.** Add the `## Architecture
   Drift` section to `packages/cli/src/render-markdown.ts`.
   Snapshot test.
9. **Update the human renderer.** Add the drift block before
   the exit footer in `check` and `analyze`.
10. **Add the Phase G test suite** covering spec §17.2.
11. **Run the full validation matrix** (build, typecheck, test,
    pack, freeze) and confirm Phase A–F suites stay green.
12. **Implementation audit + release prep + publish** in the
    standard lockstep convention (separate missions).

Estimated effort: comparable to the v1.0.3 or v1.1.0
implementation passes (one main feature, ~1500 lines of source,
~50-60 new tests).

---

## 11. Commands Run

```
git status --short
git branch --show-current
git remote -v
git log --oneline --decorate -n 20
git tag --list "arch-engine-v1.1.0"
git ls-remote --tags origin "arch-engine-v1.1.0"
ls docs/cli/
ls examples/
ls .github/workflows/
wc -l docs/cli/*.md examples/github-actions/README.md examples/demo-drift/README.md audits/ARCH_ENGINE_JSON_V2_CI_FLAGS_IMPLEMENTATION_AUDIT.md audits/ARCH_ENGINE_GITHUB_ACTIONS_PR_DEMO_AUDIT.md
grep -n "^## " docs/cli/json-v2-ci-flags-spec.md
grep -rn "graphSurfaceHash|topologySnapshot|stability-score|baselineRepoHash|baselineGeneratedAt|baselineFound|comparisonBaseline" packages/core/src packages/cli/src docs
git status --short                # post-write verification
git diff --stat                   # docs-only verification
grep -R "@arch-governance/runtime|@arch-governance/architecture-profile" package.json packages/*/package.json
```

No write commands beyond creating
`docs/cli/baseline-comparison-spec.md` and this audit. No
source edits. No `package.json` mutations. No dependency
additions.

---

*End of audit.*
