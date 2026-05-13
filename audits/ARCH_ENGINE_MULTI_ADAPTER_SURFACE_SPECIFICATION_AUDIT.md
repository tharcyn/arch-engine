# Arch-Engine Multi-Adapter Surface Specification Audit

**Audit date:** 2026-05-13
**Auditor:** Claude Opus 4.7 (1M context), spec/design pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**Pre-pass HEAD:** `1b52581 chore(cli): normalize npm bin metadata`
**Target spec:** [`docs/adapters/multi-adapter-surface-spec.md`](../docs/adapters/multi-adapter-surface-spec.md)
**Target releases:** `@arch-engine/adapter-pnpm@0.1.0` (new package, additive) + a future v1.3.0-class `@arch-engine/cli` release that wires adapter selection. `@arch-engine/adapter-yarn-pnp@0.1.0` is scoped here but deferred to a separate implementation pass after pnpm lands.

**Predecessor docs:**
- [`docs/cli/baseline-comparison-spec.md`](../docs/cli/baseline-comparison-spec.md)
- [`docs/cli/json-v2-ci-flags-spec.md`](../docs/cli/json-v2-ci-flags-spec.md)
- [`docs/cli/json-error-language-spec.md`](../docs/cli/json-error-language-spec.md)
- [`docs/cli/cli-experience-spec.md`](../docs/cli/cli-experience-spec.md)

**Predecessor audits:**
- [`audits/ARCH_ENGINE_BASELINE_COMPARISON_IMPLEMENTATION_AUDIT.md`](./ARCH_ENGINE_BASELINE_COMPARISON_IMPLEMENTATION_AUDIT.md)
- [`audits/ARCH_ENGINE_GITHUB_ACTIONS_BASELINE_WORKFLOW_DEMO_AUDIT.md`](./ARCH_ENGINE_GITHUB_ACTIONS_BASELINE_WORKFLOW_DEMO_AUDIT.md)
- [`audits/release/ARCH_ENGINE_V1_2_0_MINOR_RELEASE_PREFLIGHT.md`](./release/ARCH_ENGINE_V1_2_0_MINOR_RELEASE_PREFLIGHT.md)

---

## 1. Executive Verdict

**`MULTI_ADAPTER_SURFACE_SPEC_READY_FOR_IMPLEMENTATION`**

The adapter expansion contract is locked at
[`docs/adapters/multi-adapter-surface-spec.md`](../docs/adapters/multi-adapter-surface-spec.md).
The spec is **deterministic, additive, and freeze-safe** on top
of the v1.2.0 surface:

- **One new internal interface** (`ArchitectureAdapter`) that
  every workspace adapter implements. Internal only — does NOT
  widen the v1.x public freeze.
- **One new additive JSON v2 sub-object** (`data.adapter`) under
  every command's `--json --json-schema=v2` output. JSON v1
  default unchanged.
- **One new public package per pass:**
  - Pass 2: `@arch-engine/adapter-pnpm@0.1.0` (publishable
    additive package; not a peer dependency).
  - Pass 3: `@arch-engine/adapter-yarn-pnp@0.1.0` (deferred).
- **Six new `ARCH_ENGINE_*` error codes** (vocabulary grows
  additively from 16 → 22):
  `ARCH_ENGINE_ADAPTER_CONFLICT`,
  `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE`,
  `ARCH_ENGINE_WORKSPACE_GLOBS_INVALID`,
  `ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED`,
  `ARCH_ENGINE_LOCKFILE_UNSUPPORTED`,
  `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED`.
- **Determinism rules** carry forward verbatim from v1.0–v1.2:
  no wall-clock, no network, no installation, no mutation,
  stable sorts, stable hashing, relative paths only.
- **`@arch-engine/adapter-monorepo`'s public API is preserved
  byte-identical.** Internal refactor implements the new
  contract; thin wrappers keep `runMonorepoExtraction(cwd)` and
  `classifyAuthorityDomain(route)` byte-stable.
- **`graphSurfaceVersion: "1.0.0"` carries forward.** v1.2.0
  baselines remain comparable across adapter implementations as
  long as the same `(nodes, edges)` pair is extracted.

JSON v1 is untouched. The five-command surface is unchanged. No
existing JSON keys removed or renamed. No AGP dependency
introduced. The spec covers both the pnpm MVP (first
implementation target) and the Yarn PnP MVP (deferred to a
separate pass).

No open questions block implementation. Four deliberate deferrals
(`catalog:` resolution, `.pnp.cjs` execution, `--adapter <name>`
override, `.archengine/adapter.yml` config) are documented in
§9.4, §10.5, §16.5 of the spec as reserved-for-future
opt-ins.

---

## 2. Scope

**Spec / design pass only. No code changes.**

This pass produced two files:

1. `docs/adapters/multi-adapter-surface-spec.md` — the v1.3+
   adapter expansion contract (16 sections, ~1100 lines).
2. `audits/ARCH_ENGINE_MULTI_ADAPTER_SURFACE_SPECIFICATION_AUDIT.md`
   — this audit.

No source code, no package.json, no test file, no workflow, no
README cross-link was modified in this pass. The future
implementation pass (separate mission) will produce the source
code and tests that this spec drives.

---

## 3. Current Adapter Surface Reviewed

### 3.1 Released adapter package (as of HEAD = `1b52581`)

`@arch-engine/adapter-monorepo@1.2.0` is the only adapter. Surface
inspected in spec §4:

| Symbol | Form |
| --- | --- |
| `runMonorepoExtraction(cwd: string): MonorepoExtractionResult` | function (sole entry point) |
| `classifyAuthorityDomain(route: string): AuthorityDomain` | function (heuristic path classifier) |
| `MonorepoExtractionResult` | interface (`adjacencyMap`, `routeServiceMap`, `metadata`, `authorityCrossings`, `edgesByAdapter`) |
| `ExtractionMetadata` | interface (`coverage`, `connectivity`, `topologyConfidence`, `detectedNodes`, `connectedNodes`, `expectedNodes`, `warnings`, `workspaceType`, `extractionMode`) |
| `AuthorityDomain` | union of 6 strings |

There is **no `ArchitectureAdapter` interface** today. The CLI's
runner-bridge loads the package by name (`loadMonorepoAdapter()`)
and assumes its function signature.

### 3.2 Detection coverage today (binary, no confidence)

```
exists("pnpm-workspace.yaml")             → "pnpm",      structured
exists("package.json") && pkg.workspaces  → "yarn-npm",  structured
otherwise                                  → "single",    fallback_directory_scan
```

No confidence score. No conflict handling. No diagnostic when
both signals exist.

### 3.3 Known coverage gaps (justifying the v1.3+ pass)

| Repo shape | Status today |
| --- | --- |
| pnpm workspace with simple `packages: [...]` array | ✅ Detected; line-based YAML parser handles the simple case. |
| pnpm workspace with object shape (`packages: { include, exclude }`) | ⚠️ Detection succeeds; parsing returns empty `packages` (skips object form). |
| pnpm `catalog:` / `catalogs:` | ❌ Ignored; no diagnostic. |
| pnpm exclusion globs (`!apps/internal`) | ❌ Not honoured. |
| Yarn Berry / Yarn PnP repo (`.pnp.cjs` present) | ❌ Falls through to "single" fallback. |
| npm workspaces object shape | ❌ Not parsed. |
| `workspace:*` / `workspace:^` protocol | ⚠️ Coincidentally works (edge intersected with internal nodes) but protocol semantics aren't understood. |
| `optionalDependencies` | ❌ Ignored. |
| Workspace package without `name` | ⚠️ Silently skipped (no diagnostic). |

### 3.4 Where package-manager semantics are inferred today

Inferred in exactly one place — `runMonorepoExtraction()` lines
70-86 of `packages/adapter-monorepo/src/index.ts`. All inference
is from filesystem presence; nothing reads lockfiles, `.npmrc`,
or `package.json#packageManager`.

### 3.5 Runner-bridge coupling

The CLI's runner-bridge imports `@arch-engine/adapter-monorepo`
by hard reference. To support multiple adapters the runner-bridge
will need a new selection step that dispatches per detection
confidence (spec §7).

---

## 4. Main Design Decisions

### 4.1 One contract, many adapters

The v1.3+ surface introduces a single shared `ArchitectureAdapter`
interface (spec §6.1) that every workspace adapter implements.
Selection is automatic and explainable (spec §7). The interface
is **internal** — exposed only to the runner-bridge — so we don't
widen the v1.x public freeze.

**Rejected alternative:** a public, third-party-pluggable
"AdapterRegistry" surface that lets arbitrary npm packages
register adapters. Reasons for rejection:

- Security: arbitrary npm packages with topology-extraction
  capability would have full read access to the user's repo.
- Determinism: third-party adapters could violate the
  no-network / no-mutation rules without recourse.
- Surface size: a public registry is a non-trivial design
  question (versioning, signing, conformance) that doesn't need
  to be answered before any second adapter exists.

The internal contract preserves the option of widening later.

### 4.2 Selection algorithm

Locked in spec §7.1. Deterministic, finite, explainable:

1. Run `detect()` on every installed candidate adapter (in
   declared precedence order).
2. Among `detected: true` results, pick highest-precedence at
   the highest-confidence tier.
3. Emit `ARCH_ENGINE_ADAPTER_CONFLICT` (WARNING / exit 0) when
   ≥2 adapters tie at HIGH.
4. Emit `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE` when only LOW-tier
   detections succeeded.
5. Fall back to the existing single-package scan if no adapter
   detected at all.

Pinned precedence: explicit config (future) → pnpm → yarn-pnp →
monorepo → built-in fallback.

### 4.3 Adapter metadata as a sibling of topology

`data.adapter` lives at the same level as `data.topology` (spec
§12.1). This reflects the actual relationship: the adapter is
the **producer** of the topology, not a sub-field of it.

**Rejected alternative:** `data.topology.adapter`. Cleaner from a
parsing-tree perspective but conflates two concepts.

### 4.4 Internal evolution preserves the v1.x public freeze

The existing `@arch-engine/adapter-monorepo` is refactored
**internally** to implement the new contract while keeping its
public API byte-identical (spec §11). The freeze is preserved:

- `runMonorepoExtraction(cwd)` still works (now a thin wrapper).
- `classifyAuthorityDomain(route)` unchanged.
- `MonorepoExtractionResult` / `ExtractionMetadata` /
  `AuthorityDomain` types unchanged.

Shared utilities (workspace-glob resolution, package.json edge
extraction, deterministic sort, hash) live as **private
internals** (spec §11.3) — not exported, not in any
`package.json#exports` map, not a new public package.

### 4.5 New adapter packages are additive, not peer dependencies

`@arch-engine/adapter-pnpm` and `@arch-engine/adapter-yarn-pnp`
are **separate npm packages** consumers install alongside the
CLI (same pattern as `@arch-engine/adapter-monorepo` today).
They are NOT bundled into `@arch-engine/cli`; they are NOT
required dependencies.

The CLI tries to load each one lazily via dynamic import; if not
present, the adapter is silently skipped during selection. This
mirrors the v1.x convention where `@arch-engine/adapter-monorepo`
is a peer dependency.

### 4.6 Determinism rules carry forward verbatim

Spec §8 locks the same nine determinism invariants v1.0–v1.2
have enforced: no wall-clock, no network, no installation, no
mutation, stable sorting, stable hashing, relative paths only,
clear low-signal diagnostics, no repo-code execution. The Yarn
PnP MVP's no-execution rule (§10.3) is a sharpening of this for
the security-sensitive case.

A **shared adapter-conformance test harness** (spec §14.2)
runs the same battery against every adapter so the rules are
enforced uniformly.

---

## 5. pnpm Decision

**Ship pnpm adapter first**, as a standalone
`@arch-engine/adapter-pnpm@0.1.0` package.

Rationale:

- More common than Yarn Berry in modern public OSS repos.
- Cleaner semantics — a single workspace YAML file rather than
  the multi-file PnP surface.
- No security concerns about executing repo code.
- The existing line-based YAML parser already detects
  `pnpm-workspace.yaml` but mishandles object-shape, catalogs,
  and exclusion globs. The proper YAML library (already a dep)
  fixes all three.

### 5.1 MVP scope (spec §9.3 MUST-HANDLE)

- Array-form `packages: [...]` with full glob support including
  exclusion (`!apps/internal`) and brace expansion
  (`apps/{api,web}`).
- Object-form `packages: { include, exclude }`.
- YAML comments + multi-line strings.
- Nested workspace packages.
- Missing `package.json#name` → `ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED`
  warning + package skipped.
- `workspace:*` / `workspace:^` / `workspace:~` /
  `workspace:<range>` / `workspace:../path` protocol awareness.
- All four dependency kinds tagged in `adapterMetadata`:
  `dependencies` → `kind:"prod"`, `devDependencies` →
  `kind:"dev"`, `peerDependencies` → `kind:"peer"`,
  `optionalDependencies` → `kind:"optional"`.

### 5.2 MVP non-scope (spec §9.4 DEFERRED)

- `catalog:` / `catalogs:` resolution — diagnostic
  `ARCH_ENGINE_LOCKFILE_UNSUPPORTED` emitted; package versions
  resolve as opaque strings.
- Deep `pnpm-lock.yaml` analysis.
- External-package nodes.
- `pnpm` CLI execution.

These deferred features have a clear "we know what to do, but
v0.1.0 doesn't need it" framing. v0.2.0 can revisit if real
user demand surfaces.

### 5.3 Topology hash compatibility with the monorepo adapter

The pnpm adapter and the monorepo adapter MUST produce
byte-identical `graphSurfaceHash` for the same logical pnpm
workspace, as long as the same `(nodes, edges)` pair gets
extracted. This guarantees baseline drift comparison works
when a team migrates between adapter packages without changing
their topology.

**Verified by fixture:** spec §16.2 requires a fixture-level
test that runs a known pnpm workspace through both adapters and
asserts identical canonical output.

---

## 6. Yarn PnP Decision

**Defer to a separate implementation pass after pnpm lands**
(spec §15.3 = Pass 3).

### 6.1 Why defer

1. The pnpm pass exercises the new contract + selection + JSON
   v2 metadata + new error codes end-to-end. Adding yarn-pnp
   simultaneously would conflate "does the contract work?" with
   "does the yarn-pnp shape parse?".
2. The MVP yarn-pnp adapter is package.json-based — conceptually
   identical to the existing monorepo adapter. Once the contract
   lands, yarn-pnp is small incremental work.
3. Yarn Berry's PnP file format is less stable across major
   versions than pnpm-workspace.yaml. Locking the contract before
   adding it lets us iterate yarn-pnp behind the contract without
   re-doing infrastructure work.

### 6.2 Locked decision: NEVER execute `.pnp.cjs`

The MVP yarn-pnp adapter MUST NOT `require()` or `import()` the
repo's `.pnp.cjs` (spec §10.3). Rationale:

1. **Security:** `.pnp.cjs` is repo-controlled JavaScript. Executing
   it inside the Arch-Engine process opens a code-execution
   channel from arbitrary repos.
2. **Determinism:** `.pnp.cjs` can read filesystem state, env
   vars, and side-effect `require.cache`. Non-deterministic by
   construction.
3. **Coupling:** executing `.pnp.cjs` couples Arch-Engine to
   whichever Yarn Berry version produced it. A v0.1.0 adapter
   shouldn't carry that surface.

The MVP derives topology from `package.json#workspaces` plus
per-workspace `package.json` files — same approach as the pnpm
adapter — and surfaces `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED`
(WARNING / exit 0) on every Yarn PnP run to set expectation that
v0.1.0 is partial coverage.

Full PnP resolution stays deferred to a future hardening pass
(spec §10.5), and may eventually use static parsing of the
`PACKAGE_REGISTRY` blob rather than execution.

### 6.3 What MUST work in v0.1.0 (spec §10.4)

- Yarn Berry workspaces declared via `package.json#workspaces`
  (array or object form with `nohoist`).
- `workspace:*` protocol.
- `portal:` and `link:` protocols (Yarn Berry-specific).
- `npm:` protocol prefix (e.g. `"foo": "npm:bar@^1"`) resolves to
  target package name.
- `file:` protocol.

### 6.4 Detection precedence

`.pnp.cjs` OR `.pnp.loader.mjs` is the primary signal. HIGH
confidence requires the PnP file + `yarn.lock` (or
`package.json#packageManager: "yarn@..."`). MEDIUM if only one
signal. The yarn-pnp adapter sits BETWEEN pnpm and monorepo in
the precedence ladder (spec §7.2): pnpm → yarn-pnp → monorepo.

---

## 7. Adapter Selection Decision

Locked in spec §7.

### 7.1 Algorithm summary

Run every installed adapter's `detect()` in declared precedence
order. Pick the highest-precedence adapter at the highest
confidence tier. Emit `ARCH_ENGINE_ADAPTER_CONFLICT` on ties at
HIGH; emit `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE` when only LOW
detections succeeded. Fall back to the existing single-package
scan if no adapter detected.

### 7.2 No CLI flag in v1.3+

`--adapter <name>` override is **reserved but out of scope**.
Adapter selection is fully automatic. Users who want a specific
adapter install only that adapter.

Rationale: introducing a public flag for adapter selection adds a
contract — once shipped, the flag must work for every future
adapter, plus the validation matrix (flag value vs. installed
adapters) grows. A v1.4+ implementation pass can revisit if a
real use case emerges (e.g., a CI workflow that has multiple
adapters installed but wants to force a specific one).

### 7.3 `doctor` surfaces the selection

`doctor` gains two new lines in human mode (spec §7.5):

```
Workspace shape:        pnpm-workspace
Adapter:                @arch-engine/adapter-pnpm@0.1.0 (HIGH confidence)
```

And a third "Also detected: ..." line when multiple adapters
match. The same fields land in JSON v2's `data.adapter` block.

### 7.4 Behaviour-preserving fallback

If a user installs `@arch-engine/cli@1.3.0` WITHOUT installing
`@arch-engine/adapter-pnpm`, the runner-bridge falls back to the
existing `@arch-engine/adapter-monorepo`'s pnpm handling
(current limitations) and emits
`ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE` recommending the user
install the new adapter (spec §11.4).

This is the **minimum upgrade prompt** — never silent. Existing
v1.2.0 users get an actionable hint without their CI breaking.

---

## 8. JSON/Diagnostics Decision

### 8.1 JSON v2 placement: `data.adapter`

Top-level under `data.*`, sibling to `data.topology` (spec §12.1
+ §12.2). The shape:

```jsonc
{
  "data": {
    "adapter": {
      "name": "@arch-engine/adapter-pnpm",
      "version": "0.1.0",
      "packageManager": "pnpm",
      "workspaceKind": "pnpm-workspace",
      "confidence": "HIGH",
      "reasons": [ ... ],
      "warnings": [ ... ],
      "alsoDetected": [ { name, version, confidence, reasons } ],
      "metadata": { /* free-form adapter-specific */ }
    }
  }
}
```

Same block in every command (doctor / inspect / analyze / check /
explain). JSON v1 unaffected. `graphSurfaceHash` unaffected.

### 8.2 Six new ARCH_ENGINE_* error codes

| Code | Severity | Exit |
| --- | --- | --- |
| `ARCH_ENGINE_ADAPTER_CONFLICT` | WARNING | 0 |
| `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE` | WARNING | 0 |
| `ARCH_ENGINE_WORKSPACE_GLOBS_INVALID` | ERROR | 2 |
| `ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED` | WARNING | 0 |
| `ARCH_ENGINE_LOCKFILE_UNSUPPORTED` | INFO | 0 |
| `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` | WARNING | 0 |

Vocabulary grows additively from 16 (after v1.2.0) → 22. The
v1.0.3 11-code floor and v1.2.0 5-code addition are preserved in
declaration order.

### 8.3 Exit-code contract preserved

No change to the v1.0.3 exit-code contract:

- 0 = pass / informational
- 1 = blocking architecture violation
- 2 = invalid input or configuration (`ARCH_ENGINE_WORKSPACE_GLOBS_INVALID`)
- 3 = adapter / workspace failure (no adapter could extract anything)
- 5 = internal invariant failure

Low-confidence adapter detection is a WARNING, never an error.

### 8.4 Forward-compatible `data.adapter.metadata`

The `metadata` sub-object is intentionally free-form. Each
adapter populates per-package-manager keys (`pnpm.*`,
`yarn-pnp.*`, `monorepo.*`). Consumers treat unknown keys as
opaque pass-through. This lets future adapter versions add detail
without changing the canonical envelope.

---

## 9. Open Questions

None blocking implementation. Four minor design questions to
revisit during the future v1.3+ implementation pass:

### 9.1 Should adapter packages be true npm peer dependencies?

The spec leans toward "consumer installs them like
`@arch-engine/adapter-monorepo` today" — i.e. as a recommended
dependency, not a strict peer. The CLI loads them lazily and
treats absence as an adapter not being installed.

**Trade-off:** strict peer dependency catches missing-install
mistakes early; recommended dependency keeps the CLI usable
without all adapters installed. The current monorepo pattern
suggests recommended is correct, but the spec leaves a sentence
in §11.4 calling this out for revisit.

### 9.2 `data.adapter.metadata.edges.<id>` storage

The spec puts per-edge protocol/kind info under
`adapterMetadata.edges.<id>.{kind, protocol}` (spec §9.5). This
denormalises edge data: the canonical `data.topology.canonical.edges[]`
has the IDs, the adapter metadata has the protocol/kind per ID.

**Alternative:** extend `data.topology.canonical.edges[].{kind, protocol}`
directly. **Rejected** because that would change the canonical
shape and hence the graphSurfaceHash for every existing baseline.

The denormalised form preserves backward compatibility. Slight
parser awkwardness for consumers; acceptable for v0.1.0.

### 9.3 Shared utilities location

The spec proposes "private internals of whatever package they end
up in" (spec §11.3). Two reasonable homes:

- `packages/cli/src/shared-adapter-utils.ts` — co-located with
  the runner-bridge; not exported.
- A new private package `@arch-engine/adapter-toolkit` —
  publishable, but not in `package.json#exports` of any public
  package.

**Recommendation for the implementation pass:** start with
`packages/cli/src/shared-adapter-utils.ts` (zero new packages).
Promote to a private package only if multiple external adapters
(community-contributed?) need the utilities.

### 9.4 Catalog vs. lockfile resolution

`catalog:` resolution is deferred to v0.2.0+ (spec §9.4). The
implementation pass should decide whether v0.2.0 reads
`pnpm-lock.yaml` or stays pure-`pnpm-workspace.yaml`.
**Recommendation:** stay pure-workspace-file for v0.2.0; if
lockfile parsing ever becomes necessary (e.g. for
`catalog:` referencing real external versions), it's a v1.4.0
feature.

---

## 10. Recommended Implementation Order

The v1.3+ adapter expansion lands as a sequence of focused
passes (spec §15). Each pass is independently shippable.

1. **Pass 1 — Adapter contract internals + monorepo refactor.**
   Land the `ArchitectureAdapter` interface as internal types.
   Refactor `@arch-engine/adapter-monorepo` to implement it while
   keeping its public API byte-identical. Add the shared internal
   utilities. Add the selection algorithm in the runner-bridge.
   No public-facing change yet (no JSON v2 changes, no new
   adapter packages). Could ship as part of a v1.2.x patch or
   batch into Pass 2.

2. **Pass 2 — pnpm adapter MVP.** Publish
   `@arch-engine/adapter-pnpm@0.1.0`. Wire selection. Land the
   `data.adapter` JSON v2 block. Add the six new error codes.
   Add pnpm fixtures + conformance tests + Phase H integration
   tests. Bump `@arch-engine/cli` to v1.3.0 (new JSON v2 surface
   + new vocabulary codes = minor bump). Update CHANGELOG.

3. **Pass 3 — yarn-pnp adapter MVP.** Publish
   `@arch-engine/adapter-yarn-pnp@0.1.0`. Wire selection
   precedence. Yarn-pnp fixtures + conformance tests.
   `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` on every yarn-pnp run.
   Bump `@arch-engine/cli` to v1.3.x patch (additive adapter
   coverage; data.adapter contract already exists from Pass 2).

4. **Pass 4 — Real-repo trial pass.** Run Arch-Engine against
   10-20 real OSS repos across all supported shapes. File
   issues for any failed extractions. Optional: update GitHub
   Actions templates to mention the new adapter packages.

**First implementation target: Pass 1 + Pass 2 = pnpm-only
milestone.** Yarn PnP follows in a separate pass.

Estimated effort:

- Pass 1: ~600 lines source + ~200 lines tests; touches
  runner-bridge + monorepo adapter. Comparable to the v1.0.3
  implementation pass.
- Pass 2: ~1200 lines source + ~600 lines tests + new package
  scaffold. Comparable to the v1.1.0 implementation pass
  (similar scope to the JSON v2 envelope work).
- Pass 3: ~800 lines source + ~400 lines tests. Comparable to a
  small minor.
- Pass 4: ~0 source; ~documentation. Half-day pass.

---

## 11. Commands Run

Inspection commands executed during this pass:

```
git status --short
git branch --show-current
git remote -v
git log --oneline --decorate -n 25
git tag --list "arch-engine-v1.2.0"
git ls-remote --tags origin "arch-engine-v1.2.0"

ls packages/adapter-monorepo/
ls packages/adapter-monorepo/src/
wc -l packages/adapter-monorepo/package.json packages/adapter-monorepo/src/*.ts

# Implicit reads via Read tool:
# packages/adapter-monorepo/src/index.ts (176 lines)
# (already-known from prior sessions: docs/cli/* specs, cli source)

ls docs/
mkdir -p docs/adapters
ls docs/adapters/

# Post-write hygiene:
git status --short
git diff --stat
grep -R "@arch-governance/runtime\|@arch-governance/architecture-profile" package.json packages/*/package.json
```

No write commands beyond creating the two new docs files. No
source edits. No `package.json` mutations. No dependency
additions. No commits.

---

*End of audit.*
