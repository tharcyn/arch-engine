# Arch-Engine Multi-Adapter Surface Specification

> **Status:** Design pass. This document locks the contract for
> Arch-Engine's workspace-adapter expansion strategy. **No code
> changes accompany this pass** — it is the design specification
> that drives the future v1.3+ adapter implementation pass.

---

## 1. Status

| Field | Value |
| --- | --- |
| Spec version | 1.0 |
| Target releases | `@arch-engine/adapter-pnpm@0.1.0` (new package) plus an additive `@arch-engine/cli@1.3.0`-class release that ships adapter selection. The `@arch-engine/adapter-yarn-pnp` package is scoped here but deferred to a separate implementation pass after pnpm lands. |
| Author | Claude Opus 4.7 (1M context) |
| Date | 2026-05-13 |
| Predecessor docs | [`cli-experience-spec.md`](../cli/cli-experience-spec.md), [`json-v2-ci-flags-spec.md`](../cli/json-v2-ci-flags-spec.md), [`baseline-comparison-spec.md`](../cli/baseline-comparison-spec.md) |
| Implementation status | **Not yet implemented.** Code lands in a future v1.3.0-class implementation pass. |

---

## 2. Purpose

Arch-Engine's product surface — JSON v2 envelope, markdown reports,
baseline comparison, GitHub Actions workflows — is now stable. The
next adoption bottleneck is **repo coverage**: how many real
JavaScript/TypeScript repositories does Arch-Engine understand
deterministically on first run?

Today the answer is "the ones whose workspace layout
`@arch-engine/adapter-monorepo` can detect", which today means:

- pnpm workspaces with a flat `packages: [...]` list (line-based
  YAML, no `yaml` library, no exclusion globs, no
  `catalog` keys).
- npm / yarn-classic workspaces declared as an array under
  `package.json#workspaces`.
- Single-package repos via a fallback directory scan.

This excludes:

- pnpm repos with object-shape `pnpm-workspace.yaml` (`packages:`
  + `catalog:` + exclude globs).
- Yarn Berry / Yarn PnP repos.
- npm `workspaces` declared as an object (`{ packages: [...],
  nohoist: [...] }`).
- Any repo whose dependency edges live under `workspace:*` /
  `portal:` / `link:` protocols (currently merged blindly with
  semver deps).

The v1.3+ adapter expansion improves first-run success on those
shapes without breaking the v1.0–v1.2 contract.

---

## 3. Product Goal

**One sentence:** "When a user runs `arch-engine doctor` in a real
repo, they should get a confident, deterministic, actionable
answer — even if their repo uses pnpm, Yarn Berry, or a less
common workspace layout."

Concretely:

- **Improve first-run success** on real JS/TS repos. The
  `examples/demo-drift` fixture currently demonstrates the v1.x
  flow in a yarn-style workspace; real users have pnpm and Yarn
  Berry.
- **Preserve deterministic topology extraction.** Every adapter
  emits the same canonical-topology shape locked by
  `baseline-comparison-spec.md` §11.2. Re-running on the same
  source produces a byte-identical `graphSurfaceHash`.
- **Preserve `graphSurfaceVersion: "1.0.0"` compatibility** so
  v1.2.0 baselines remain comparable across adapter changes
  unless the surface itself evolves.
- **Preserve JSON v1/v2 compatibility.** New adapter metadata
  lands additively under JSON v2's `data.*`; v1 default output
  is unchanged.
- **Preserve baseline drift semantics.** Drift detection works
  identically regardless of which adapter produced the
  baseline, because both adapters emit the same canonical
  shape.
- **Avoid false confidence** when adapter signal is weak. A
  `LOW` confidence detection is surfaced as a structured
  diagnostic, not as a green success.
- **Make unsupported workspace shapes actionable.** When no
  adapter detects HIGH-confidence, the diagnostic explains which
  files were inspected, what would have triggered each adapter,
  and which adapter the user could install.

### 3.1 Product framing carried forward

The v1.x product promise — **"Catch architecture drift before
merge"** — extends in v1.3+ to **"Catch drift in any modern
JavaScript workspace"**.

---

## 4. Current Adapter Surface

`@arch-engine/adapter-monorepo@1.2.0` is the only adapter. Its
public surface (`packages/adapter-monorepo/src/index.ts`, 176
lines):

| Symbol | Shape | Notes |
| --- | --- | --- |
| `runMonorepoExtraction(cwd: string): MonorepoExtractionResult` | function | Sole entry point invoked by `runner-bridge.ts`. |
| `classifyAuthorityDomain(route: string): AuthorityDomain` | function | Path-prefix heuristic: `apps/` → `APPLICATION`, `services/` → `SERVICE`, `packages/`/`pkg/` → `LIBRARY`, `lib/`/`libs/` → `FOUNDATION`, `infra/`/`scripts/`/`config/`/`action/` → `INFRASTRUCTURE`. |
| `MonorepoExtractionResult` interface | `{ metadata, adjacencyMap, routeServiceMap, authorityCrossings, edgesByAdapter }` | Returned by `runMonorepoExtraction`. |
| `ExtractionMetadata` interface | `{ coverage, connectivity, topologyConfidence, detectedNodes, connectedNodes, expectedNodes, warnings, workspaceType, extractionMode }` | Drives the `data.topology.*` fields in JSON v2. |
| `AuthorityDomain` type | `'APPLICATION' \| 'SERVICE' \| 'LIBRARY' \| 'FOUNDATION' \| 'INFRASTRUCTURE' \| 'UNCLASSIFIED'` | Locked. |

There is **no `ArchitectureAdapter` interface today** — adapter
identity is implicit (the single package name). The CLI's
runner-bridge loads `@arch-engine/adapter-monorepo` by hard import
and assumes its result shape.

### 4.1 Current detection logic (binary, no confidence)

```
if (exists "pnpm-workspace.yaml") → workspaceType = "pnpm",   mode = "structured"
else if (exists "package.json" && pkg.workspaces) → workspaceType = "yarn-npm", mode = "structured"
else → workspaceType = "single", mode = "fallback_directory_scan"
```

No confidence score. No conflict handling (the file order is
implicit priority). No diagnostic when both signals exist.

### 4.2 Current edge extraction

For each detected package's `package.json`:

```
edges = keys(pkg.dependencies ∪ pkg.devDependencies ∪ pkg.peerDependencies)
edges = edges ∩ {ids of detected internal packages}
```

- All three dependency kinds are merged. No distinction is
  preserved.
- `optionalDependencies` is **not** included.
- `peerDependenciesMeta`, `bundledDependencies`, and
  `overrides`/`resolutions` are ignored.
- The `workspace:*` protocol prefix (e.g.
  `"@foo/bar": "workspace:*"`) is treated as a string-matching
  semver. It happens to work today because the edge is
  intersected with internal-node IDs, but the protocol
  semantics are not understood.

### 4.3 Current YAML parsing

The `pnpm-workspace.yaml` is parsed line-by-line — `packages:`
header followed by indented `- glob` lines. This breaks on:

- Block-scalar / flow-sequence YAML
- Object-shape `pnpm-workspace.yaml` (`packages: { include: [...],
  exclude: [...] }`)
- `catalog:` and `catalogs:` keys
- YAML comments inline with values
- Multi-line strings

### 4.4 Current glob support

Only `dir/*` patterns. **Not supported:**

- `dir/**` (recursive)
- `!dir/skip` (exclusion)
- `apps/{foo,bar}` (brace expansion)
- `**/integration/*` (deep wildcards)

### 4.5 Where current package-manager semantics are inferred

| Signal | Inferred semantic | Location |
| --- | --- | --- |
| `pnpm-workspace.yaml` exists | This is a pnpm workspace | `detectWorkspace()`, `runMonorepoExtraction()` |
| `package.json#workspaces` is array | This is npm/yarn-classic | same |
| Nothing matches | Single-package fallback scan | same |

**No package-manager-specific edge extraction yet** — every
detected workspace uses the same `dependencies ∪ devDependencies
∪ peerDependencies` rule.

---

## 5. Non-Goals

The v1.3+ adapter expansion is bounded. Out of scope:

- **AGP emitter integration.** Adapter expansion ships orthogonally
  to the AGP track.
- **SaaS / cloud / dashboard surfaces.** No remote adapter
  registry, no telemetry, no upload.
- **Universal language parser.** Adapters remain
  JavaScript/TypeScript-workspace-shaped. Python, Go, Rust, Java
  are explicitly NOT in scope.
- **Static type analysis.** Edges are derived from package
  manifests, not from import statements or `tsc` output.
- **Runtime dependency analysis.** No bundler execution, no
  module-loader execution, no `require()` graph walking.
- **Auto-fix / suggestion engines.** Adapter output is read-only;
  Arch-Engine never proposes `package.json` edits.
- **Lockfile security scanning.** Lockfile parsing (when introduced
  for pnpm) is for workspace topology only — not for vulnerability
  surfaces.
- **`.pnp.cjs` execution.** The Yarn PnP MVP must not execute
  repo code (see §10.3).
- **Bun / Deno / Lerna adapters.** Future passes may add these;
  v1.3+ targets pnpm primarily, Yarn PnP secondarily.
- **`@arch-engine/adapter-monorepo` rename / split.** The existing
  public package keeps its name and contract (see §11).

---

## 6. Adapter Contract

The v1.3+ adapter contract introduces a single shared interface
that every workspace adapter implements. It is **internal** —
exposed only to the runner-bridge for selection and invocation —
unless and until a future minor release widens the public export
surface.

### 6.1 The `ArchitectureAdapter` interface

```typescript
export interface ArchitectureAdapter {
  /** Stable name. Mirrors the npm package name when possible. */
  readonly adapterName: string;

  /** Semver string matching the adapter package's version. */
  readonly adapterVersion: string;

  /** Cheap, side-effect-free probe. Returns confidence + reasons. */
  detect(context: AdapterContext): AdapterDetectionResult;

  /** Full topology extraction. Called when detect() returns a winning result. */
  extractTopology(context: AdapterContext): AdapterTopologyResult;

  /** Optional self-description for `arch-engine doctor --verbose` and JSON v2 metadata. */
  explain?(): AdapterCapabilitySummary;
}
```

`AdapterContext` carries the inputs every adapter needs:

```typescript
export interface AdapterContext {
  /** Absolute path to the repository root. */
  readonly cwd: string;
  /** Pre-resolved file existence map for cheap detection. */
  readonly fileExists: (relPath: string) => boolean;
  /** Pre-resolved file reader (UTF-8). Returns null if not present. */
  readonly readFile: (relPath: string) => string | null;
  /** Pre-resolved directory listing helper. */
  readonly readDir: (relPath: string) => ReadonlyArray<string>;
  /** Adapter-private storage for cross-step state (e.g. detect → extract). */
  readonly cache: Map<string, unknown>;
}
```

The context is **read-only**. Adapters must not mutate the cwd,
write files, fork processes, or open network sockets.

### 6.2 `AdapterDetectionResult`

```typescript
export interface AdapterDetectionResult {
  readonly detected: boolean;
  readonly confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Canonical workspace shape this adapter would handle. */
  readonly workspaceKind: string;
  /** Inferred package manager. */
  readonly packageManager: 'pnpm' | 'yarn' | 'npm' | 'yarn-pnp' | 'unknown';
  /** Human-friendly reasons (file paths checked, decisions made). */
  readonly reasons: ReadonlyArray<string>;
  /** Soft warnings — present at HIGH confidence too. */
  readonly warnings: ReadonlyArray<string>;
  /** Structured diagnostics (mappable to ARCH_ENGINE_* codes). */
  readonly diagnostics: ReadonlyArray<AdapterDiagnostic>;
}
```

Confidence semantics:

| Tier | Meaning | Example trigger |
| --- | --- | --- |
| `HIGH` | Multiple converging signals; no ambiguity. | `pnpm-workspace.yaml` AND `pnpm-lock.yaml` AND `packageManager: "pnpm@..."` in root `package.json`. |
| `MEDIUM` | Single strong signal; some uncertainty. | Only `pnpm-workspace.yaml` (no lockfile, no `packageManager` field). |
| `LOW` | Weak heuristic; adapter would still run but caller should treat as a guess. | A `package.json` has `engines.pnpm` but no workspace file. |

A `detected: false` result returns `confidence: 'LOW'` for
completeness; the selector ignores `detected: false` regardless.

### 6.3 `AdapterTopologyResult`

Mirrors `data.topology.canonical` from
`baseline-comparison-spec.md` §11.2 plus a small amount of
adapter-level metadata:

```typescript
export interface AdapterTopologyResult {
  readonly graphSurfaceVersion: '1.0.0';
  readonly graphSurfaceHash: string;     // 64-hex sha256
  readonly nodes: ReadonlyArray<CanonicalNode>;
  readonly edges: ReadonlyArray<CanonicalEdge>;
  /** Coverage signal — fraction of workspace packages whose package.json had a name. */
  readonly coverage: number;
  /** Confidence carried forward from detect(); the extract step may downgrade it. */
  readonly confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Relative paths of every file the adapter read (for reproducibility / debugging). */
  readonly sourceFiles: ReadonlyArray<string>;
  /** Adapter-private metadata. Surfaces in JSON v2 `data.adapter.metadata`. */
  readonly adapterMetadata: Record<string, unknown>;
  /** Structured diagnostics emitted during extraction. */
  readonly diagnostics: ReadonlyArray<AdapterDiagnostic>;
}
```

Node and edge shape is locked by the canonical topology spec.
Adapters DO NOT extend it. Edge **type** strings remain
`workspace_dependency` for now — protocol distinctions (`workspace:`,
`portal:`, `link:`) live in `adapterMetadata` so the
graphSurfaceHash stays stable across adapters.

### 6.4 `AdapterDiagnostic`

Diagnostics emitted by adapters are mapped to
`ARCH_ENGINE_*` codes by the CLI before they land in
`diagnostics[]`. The adapter-side shape is intentionally narrower
than `CliDiagnostic` so adapters need not depend on
`@arch-engine/cli`:

```typescript
export interface AdapterDiagnostic {
  /** Canonical code; the CLI maps these to ARCH_ENGINE_* codes. */
  readonly code: string;
  /** Severity hint; the CLI may upgrade/downgrade based on context. */
  readonly severity: 'INFO' | 'WARNING' | 'ERROR';
  /** Per-occurrence message. */
  readonly message: string;
  /** Optional path the diagnostic relates to (relative, POSIX). */
  readonly path?: string;
  /** Optional structured context (sorted keys for determinism). */
  readonly details?: Record<string, unknown>;
}
```

---

## 7. Detection and Selection

The runner-bridge becomes adapter-aware in v1.3+. The selection
algorithm is deterministic, finite, and explainable.

### 7.1 Selection algorithm

```
1. Build a list of CANDIDATE adapters (current install).
2. For each candidate (in declared precedence order, see §7.2):
     result = adapter.detect(context)
     keep result if detected === true
3. Among the kept results:
     a. If at least one HIGH-confidence result exists,
        select the HIGHEST-precedence HIGH-confidence adapter.
     b. Otherwise, if at least one MEDIUM-confidence result exists,
        select the HIGHEST-precedence MEDIUM-confidence adapter.
     c. Otherwise, select the HIGHEST-precedence LOW-confidence
        adapter and emit ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE.
4. If MULTIPLE HIGH-confidence results exist:
     - Pick the first by precedence.
     - Emit ARCH_ENGINE_ADAPTER_CONFLICT diagnostic listing the
       other candidates and the path inputs that fired each.
5. If NO adapter detected:
     - Fall back to the existing single-package directory scan
       (current behaviour).
     - Emit ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL.
```

### 7.2 Declared precedence (locked)

```
1. Explicit adapter config         (future; not in v1.3+)
2. @arch-engine/adapter-pnpm        — if pnpm-workspace.yaml present
3. @arch-engine/adapter-yarn-pnp    — if .pnp.cjs or .pnp.loader.mjs present
4. @arch-engine/adapter-monorepo    — generic npm/yarn workspaces + single
5. (built-in fallback)              — directory scan, low signal
```

Position #1 is reserved for a future
`.archengine/adapter.yml` override (out of v1.3 scope).

### 7.3 Conflict handling

A "conflict" is two adapters reaching `HIGH` confidence on the
same repo. Real cases:

- A pnpm workspace whose root `package.json#workspaces` also has
  a stale entry from a yarn migration. Both pnpm and monorepo
  adapters detect.
- A Yarn Berry repo with both `.pnp.cjs` AND `package.json#workspaces`
  declared as an array (legacy). Both yarn-pnp and monorepo
  adapters detect.

In both cases:

1. The **higher-precedence** adapter wins per §7.2 (pnpm beats
   monorepo; yarn-pnp beats monorepo).
2. `ARCH_ENGINE_ADAPTER_CONFLICT` (WARNING / exit 0) is emitted
   listing the conflicting adapter names and the file signals
   that fired each.
3. `doctor` surfaces the conflict in human output with a
   "Workspace shape: <chosen-adapter> (also detected by:
   <other>)" line.

### 7.4 CLI flag

**No new CLI flag in v1.3+.** Selection is fully automatic. A
future `--adapter <name>` override is reserved but out of scope.

### 7.5 `doctor` integration

`doctor` already surfaces workspace metadata. In v1.3+ it gains
two new lines in human mode (and the same fields in JSON v2):

```
Workspace shape:        pnpm-workspace
Adapter:                @arch-engine/adapter-pnpm@0.1.0 (HIGH confidence)
```

When multiple adapters detected, a third line:

```
Also detected:          @arch-engine/adapter-monorepo (MEDIUM)
                        (pnpm-workspace.yaml takes precedence over package.json#workspaces)
```

---

## 8. Determinism Rules

Every adapter must obey the following invariants. These are
verified by the shared adapter-conformance test harness (see
§14.2).

| Rule | Enforcement |
| --- | --- |
| **No wall-clock.** No use of `Date.now()`, `new Date()` (except as a derived display string in diagnostics, never in identity). | Manual code review; conformance test runs adapter twice and diffs outputs. |
| **No network.** Adapter must not open sockets, fetch URLs, or call `child_process` with network-capable binaries. | Conformance test runs in a sandbox without network. |
| **No installation.** Adapter must not invoke `npm install`, `pnpm install`, `yarn install`, or any equivalent. | Conformance test: the adapter is run on a fixture with no `node_modules/` present; the output must be identical when `node_modules/` is added. |
| **No mutation.** Adapter must not write to cwd, set env vars, or modify the user's repo in any way. | Conformance test: file checksums before/after run must match. |
| **Stable sorting.** All output arrays (nodes, edges, sourceFiles, diagnostics) sorted by canonical keys. | Conformance test: two runs produce byte-identical output. |
| **Stable hashing.** `graphSurfaceHash` derives only from sorted canonical inputs. | Conformance test: graphSurfaceHash matches a stored fixture value. |
| **Relative paths only.** No absolute paths in node ids, edge data, or `sourceFiles`. | Static check in conformance test. |
| **Clear low-signal diagnostics.** When detection confidence is anything other than `HIGH`, the adapter MUST emit a structured diagnostic explaining what's missing. | Conformance test: low-confidence fixtures must produce a corresponding diagnostic. |
| **No repo-code execution.** Adapter must not `require()` or `import()` files from cwd. (See §10.3 for the Yarn PnP exception case.) | Conformance test: adapter is run with `--inspect` and traced for unexpected module loads. |

### 8.1 Forward-compatibility hooks

Adapters MAY include additional fields in `adapterMetadata`
that are not yet part of the canonical surface. The CLI emits
them verbatim under `data.adapter.metadata` so consumers can
opt into adapter-specific details (e.g. `pnpm.catalog`,
`yarn-pnp.linkProtocolEdges`) without the canonical topology
hash changing.

---

## 9. pnpm Adapter Contract

### 9.1 Package identity

```
@arch-engine/adapter-pnpm@0.1.0   (new, public, MIT, additive)
```

Same npm scope as the existing adapter; same MIT licence; same
ESM-only target node 18+. No `bin` entry; the adapter is a
library consumed by the CLI.

### 9.2 Detection inputs

The adapter inspects (relative paths from cwd):

| File | Required? | Signal weight |
| --- | --- | --- |
| `pnpm-workspace.yaml` | Yes — primary | If absent, `detected: false`. |
| `package.json` | Yes — for workspace root metadata | If absent, `detected: false`. |
| `pnpm-lock.yaml` | No — strengthens confidence | Present → HIGH; absent → MEDIUM. |
| `.npmrc` containing `package-manager-strict=true` or `auto-install-peers` | No — informational | Surfaced in `adapterMetadata`. |
| `package.json#packageManager` field starting with `pnpm@` | No — strengthens confidence | Present → HIGH. |

### 9.3 What MUST be handled

| Feature | v0.1.0 behaviour |
| --- | --- |
| `packages: [...]` array form | Full glob support including `apps/*`, `packages/**`, `services/**/*`, brace expansion `apps/{api,web}`. |
| Exclusion globs (`!path/to/skip`) | Honoured. Implementation note: applied after expansion. |
| Object-shape `pnpm-workspace.yaml` (`packages: { include: [...], exclude: [...] }`) | Detected and parsed; treated as if exclusion globs. |
| `pnpm-workspace.yaml` with YAML comments | Skipped during parse. |
| Nested workspace packages (`apps/foo/services/bar`) | Each `package.json` with a `name` becomes a node. |
| Missing `package.json#name` | Diagnostic `ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED` (WARNING, exit 0). Package excluded from topology. |
| Private packages (`"private": true`) | Included as nodes (private is a publishing concern, not a topology concern). |
| Dependency edges from `dependencies` | Emitted as `workspace_dependency` edge type. Edge metadata in `adapterMetadata.edges.<id>.protocol = "semver"` when not a `workspace:` protocol. |
| Dependency edges from `devDependencies` | Same shape; `adapterMetadata.edges.<id>.kind = "dev"`. |
| Dependency edges from `peerDependencies` | Same shape; `kind = "peer"`. |
| Dependency edges from `optionalDependencies` | Same shape; `kind = "optional"`. |
| `workspace:*` protocol | Detected; node-by-id matches internal package. `adapterMetadata.edges.<id>.protocol = "workspace"`. |
| `workspace:^` / `workspace:~` / `workspace:<range>` | Same as `workspace:*` for topology. |
| `workspace:../path` (relative) | Resolved to the target package's name via path lookup. |

### 9.4 What is DEFERRED (v1.4+)

| Feature | Deferral rationale |
| --- | --- |
| `catalog:` / `catalogs:` keys in `pnpm-workspace.yaml` | New pnpm feature; resolution is non-trivial. Diagnostic `ARCH_ENGINE_LOCKFILE_UNSUPPORTED` (INFO, exit 0) emitted when present; package versions referencing `catalog:` resolve as opaque strings for v0.1.0. |
| Deep `pnpm-lock.yaml` analysis | Lockfile parsing for topology is unnecessary — package.json edges suffice. Lockfile diagnostics may surface in v1.4+ if a real use case emerges. |
| External-package nodes | Current monorepo adapter does not emit external-package nodes either; preserving parity. |
| `pnpm` CLI execution | Adapter is pure-fs read; no shelling out. |
| `package-manager` hints in `.npmrc` for cross-workspace resolution | Out of v0.1.0 scope. |

### 9.5 Output

`AdapterTopologyResult` per §6.3. Fields specific to pnpm:

```jsonc
{
  "adapterMetadata": {
    "pnpm": {
      "workspaceFile": "pnpm-workspace.yaml",
      "packageManagerVersion": "pnpm@9.0.0",    // from package.json#packageManager if set
      "lockfilePresent": true,
      "catalogsDetected": false,
      "excludedGlobs": ["!apps/internal-tools"]
    },
    "edges": {
      "e_<hex8>": {
        "kind": "dev",
        "protocol": "workspace"
      }
    }
  }
}
```

### 9.6 Determinism

- Workspace globs sorted lexicographically before resolution.
- Resolved package paths sorted lexicographically before scan.
- Edges sorted by canonical id (sha256-truncated 8-char).
- `graphSurfaceHash` is computed from the canonical
  `(sorted_nodes, sorted_edges)` pair only — `adapterMetadata`
  does NOT affect it. This guarantees baseline drift comparison
  works across adapter versions that add metadata.

---

## 10. Yarn PnP Adapter Contract

### 10.1 Package identity

```
@arch-engine/adapter-yarn-pnp@0.1.0   (new, public, MIT, additive)
```

**Deferred to a separate implementation pass after the pnpm
adapter lands.** This section locks the contract so the pnpm pass
can be designed without painting yarn-pnp into a corner.

### 10.2 Detection inputs

| File | Required? | Signal weight |
| --- | --- | --- |
| `.pnp.cjs` or `.pnp.loader.mjs` | Yes — primary | If absent, `detected: false`. |
| `package.json#workspaces` | No — provides edge data | If absent and only `.pnp.cjs` is present, MEDIUM confidence with a "no workspaces declared" diagnostic. |
| `yarn.lock` | No — strengthens confidence | Present → HIGH; absent + only `.pnp.cjs` → MEDIUM. |
| `.yarnrc.yml` | No — informational | Surfaced in `adapterMetadata`. |
| `package.json#packageManager` field starting with `yarn@` | No — strengthens confidence | Present → HIGH. |

### 10.3 What MUST NOT happen

**The adapter MUST NOT execute `.pnp.cjs` or `.pnp.loader.mjs`.**
These files are repository-controlled JavaScript that get
`require()`d when the runner resolves modules. Executing them
inside Arch-Engine would:

1. Open a code-execution channel from a repo's PnP file into the
   Arch-Engine process.
2. Make Arch-Engine non-deterministic — `.pnp.cjs` can read
   filesystem state, env vars, and side-effect on `require.cache`.
3. Couple Arch-Engine's runtime to whichever Yarn Berry version
   produced the PnP file.

Instead, the MVP adapter:

- Detects the presence of `.pnp.cjs` / `.pnp.loader.mjs`.
- Derives the workspace topology from `package.json#workspaces`
  plus per-workspace `package.json` files (same approach as the
  pnpm adapter).
- Surfaces `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` (WARNING, exit 0)
  to flag that full PnP resolution is not part of v0.1.0.

### 10.4 What MUST be handled

| Feature | v0.1.0 behaviour |
| --- | --- |
| `package.json#workspaces` as array | Same parse as adapter-monorepo. |
| `package.json#workspaces` as object (`{ packages: [...], nohoist: [...] }`) | Both forms supported. `nohoist` recorded in `adapterMetadata`. |
| `workspace:*` protocol | Same as pnpm adapter. |
| `portal:` protocol (Yarn Berry-specific) | Detected; treated as internal edge if target maps to a known workspace. `adapterMetadata.edges.<id>.protocol = "portal"`. |
| `link:` protocol | Same as portal; `protocol = "link"`. |
| `npm:` protocol prefix (e.g. `"foo": "npm:bar@^1"`) | Resolved to target package name `bar` for topology purposes. |
| `file:` protocol | Edge tagged with `protocol = "file"`. Topology connects only when target package's `package.json#name` is known. |

### 10.5 What is DEFERRED

| Feature | Deferral rationale |
| --- | --- |
| Full PnP resolution (executing `.pnp.cjs`) | Security; see §10.3. |
| Static `.pnp.cjs` parsing (regex extraction of `PACKAGE_REGISTRY` blob) | Future hardening pass. Yarn Berry's `.pnp.cjs` format is documented but not stable across major versions. |
| `yarn workspaces foreach` parity | Out of scope. |
| Yarn 1 / classic workspaces | Handled by `@arch-engine/adapter-monorepo` (existing). |
| Plug'n'Play hoisting / dependency-trees from yarn.lock | Deferred to v0.2.0+ if a real use case emerges. |

### 10.6 Implementation order vs pnpm

The yarn-pnp adapter lands in a **separate** implementation pass
after pnpm is shipped and validated. Rationale:

1. pnpm has clearer workspace semantics (a single YAML file vs.
   `.pnp.cjs` + workspaces).
2. pnpm is more common in current public repositories.
3. The pnpm adapter exercises the new adapter-contract +
   selection logic end-to-end; yarn-pnp inherits that
   infrastructure for free.
4. The Yarn PnP MVP is package.json-based (no `.pnp.cjs`
   execution), which is conceptually identical to the existing
   `@arch-engine/adapter-monorepo` path — relatively small
   incremental work once the contract lands.

---

## 11. Existing Monorepo Adapter Compatibility

### 11.1 Public-package preservation

`@arch-engine/adapter-monorepo` keeps:

- Its current package name.
- Its current `main` / `exports` / `bin` (no `bin`).
- Its current public API: `runMonorepoExtraction(cwd)`,
  `classifyAuthorityDomain(route)`, and the
  `MonorepoExtractionResult` / `ExtractionMetadata` /
  `AuthorityDomain` types.

These are part of the v1.x public freeze. Renaming the package
would be a breaking change and is explicitly out of scope.

### 11.2 Internal evolution

Internally, the monorepo adapter is refactored to **implement the
`ArchitectureAdapter` interface** (§6.1) so the runner-bridge
treats it uniformly with new adapters. The refactor preserves the
existing function signatures as **thin wrappers** over the
internal adapter object.

### 11.3 Shared utilities

Shared concerns (workspace-glob resolution, package.json edge
extraction, deterministic sort, sha256 hash) live in
**internal-only** modules — likely
`packages/cli/src/shared-adapter-utils.ts` (private to the CLI)
or a new private package `@arch-engine/adapter-toolkit` if
extracted. Either way, the v1.x freeze for
`@arch-engine/adapter-monorepo` is preserved.

**Decision (locked):** the shared utilities live as **private
internals** of whatever package they end up in. They are NOT
exported, NOT in any `package.json#exports` map, and NOT
discoverable from the npm registry as a separate package. This
keeps the v1.x public surface stable while enabling code reuse
across adapters.

### 11.4 Workspace detection refactor

The existing `detectWorkspace()` function (lines 41-52 of
`packages/adapter-monorepo/src/index.ts`) becomes the body of the
adapter-monorepo `detect()` method per §6.1. Its precedence:

- `pnpm-workspace.yaml` → declined (let the pnpm adapter win)
- `package.json#workspaces` array → DETECTED, HIGH confidence
- `package.json#workspaces` object → DETECTED, MEDIUM confidence
  (current adapter doesn't parse this shape; treated as
  forward-compat hint)
- single-package fallback → DETECTED, LOW confidence

This means **`@arch-engine/adapter-monorepo` v1.3+ no longer
claims pnpm workspaces by default** — the pnpm adapter takes
that responsibility. Behaviour-preserving fallback: if
`@arch-engine/adapter-pnpm` is NOT installed, the runner-bridge
falls back to the monorepo adapter's existing pnpm-workspace.yaml
handling (current behaviour, current limitations) and emits
`ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE` recommending the user
`npm install --save-dev @arch-engine/adapter-pnpm`.

This is the minimum upgrade prompt — never silent.

---

## 12. JSON v2 Adapter Metadata

### 12.1 Placement decision

Adapter metadata lands at the **top level of `data.*`**:

```jsonc
{
  "data": {
    "adapter": { ... },          // NEW in v1.3+
    "topology": { ... },         // existing
    ...
  }
}
```

**Rejected alternative:** `data.topology.adapter` — would conflate
"which adapter extracted this" with "what is the canonical
topology surface". Keeping `adapter` at the same level as
`topology` reflects the actual relationship: the adapter is a
sibling concept that PRODUCES the topology.

### 12.2 Shape

```jsonc
{
  "data": {
    "adapter": {
      "name": "@arch-engine/adapter-pnpm",
      "version": "0.1.0",
      "packageManager": "pnpm",
      "workspaceKind": "pnpm-workspace",
      "confidence": "HIGH",
      "reasons": [
        "pnpm-workspace.yaml present",
        "pnpm-lock.yaml present",
        "package.json#packageManager starts with pnpm@"
      ],
      "warnings": [],
      "alsoDetected": [
        {
          "name": "@arch-engine/adapter-monorepo",
          "version": "1.2.0",
          "confidence": "MEDIUM",
          "reasons": ["package.json#workspaces is an array (4 entries)"]
        }
      ],
      "metadata": {
        "pnpm": {
          "workspaceFile": "pnpm-workspace.yaml",
          "packageManagerVersion": "pnpm@9.0.0",
          "lockfilePresent": true,
          "catalogsDetected": false,
          "excludedGlobs": []
        }
      }
    }
  }
}
```

### 12.3 Coverage

| Command | `data.adapter` present? |
| --- | --- |
| `doctor` | ✅ Yes |
| `inspect` | ✅ Yes |
| `analyze` | ✅ Yes |
| `check` | ✅ Yes |
| `explain <target>` | ✅ Yes |

`data.adapter` is the SAME block in every command — the adapter
identity does not depend on which CLI verb invoked it.

### 12.4 Backward compatibility

- **JSON v1 unaffected.** `data.adapter` is JSON-v2-only.
- **Existing JSON v2 keys preserved verbatim.** This is an
  additive sibling under `data.*`; no existing key is renamed,
  removed, or retyped.
- **`graphSurfaceHash` unchanged.** Adapter identity does not
  affect the canonical topology hash. A pnpm baseline produced
  by `@arch-engine/adapter-pnpm` MUST compare cleanly against a
  pnpm baseline produced by `@arch-engine/adapter-monorepo`'s
  existing-pnpm-handling fallback path, as long as the same set
  of nodes and edges are extracted.
- **Summary block.** No change to `summary.*`. Adapter identity
  is a `data.adapter` concern; summary stays about verdicts.

### 12.5 Forward compatibility

`data.adapter.metadata` is a free-form sub-object. Adapters MAY
add per-package-manager keys (`pnpm.*`, `yarn-pnp.*`, etc.) in
future versions. Consumers should treat unknown keys as
opaque pass-through, not as errors.

---

## 13. Diagnostics and Error Codes

Six new `ARCH_ENGINE_*` codes added in v1.3+. The 16 existing codes
(11 from v1.0.3 + 5 from v1.2.0) are preserved in declaration
order; v1.3+ appends.

| Code | Severity | Exit | Notes |
| --- | --- | --- | --- |
| `ARCH_ENGINE_ADAPTER_CONFLICT` | WARNING | 0 | Multiple HIGH-confidence detections. Names the chosen adapter and lists the runners-up. |
| `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE` | WARNING | 0 | The only detection was LOW. Names the adapter and recommends installing a more specific one if available. |
| `ARCH_ENGINE_WORKSPACE_GLOBS_INVALID` | ERROR | 2 | Workspace globs failed to parse. Adapter cannot extract; CI-blocking. |
| `ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED` | WARNING | 0 | A `package.json` lacked a `name` field. The package is skipped; topology continues. |
| `ARCH_ENGINE_LOCKFILE_UNSUPPORTED` | INFO | 0 | A lockfile feature (e.g. pnpm catalogs) was detected but not interpreted by the current adapter version. Surfaces as advisory; topology continues. |
| `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` | WARNING | 0 | Yarn PnP `.pnp.cjs` present; the v0.1.0 adapter does NOT execute it. Names the limitation. |

### 13.1 Exit-code preservation

The v1.0.3 exit-code contract is unchanged:

- **0** — pass / informational
- **1** — blocking architecture violation
- **2** — invalid input or configuration (includes
  `ARCH_ENGINE_WORKSPACE_GLOBS_INVALID`)
- **3** — adapter / workspace failure (no adapter could extract
  any topology)
- **5** — internal invariant failure

Adapter low-confidence is a `WARNING`, not an error. The exit
code is NEVER affected by adapter selection unless extraction
is fully impossible (then exit 3).

### 13.2 Human render templates

Each code carries a default title + fix via the existing
`error-codes.ts` metadata table (per `json-error-language-spec.md`
§6.2). Example for `ARCH_ENGINE_ADAPTER_CONFLICT`:

```
Title:    Multiple workspace adapters matched this repository.
Problem:  Both @arch-engine/adapter-pnpm and @arch-engine/adapter-monorepo
          reported HIGH confidence. Chose @arch-engine/adapter-pnpm
          (higher precedence).
Next:     If the chosen adapter is correct, no action needed. Otherwise,
          consider removing the conflicting workspace declaration:
          either pnpm-workspace.yaml or package.json#workspaces.
```

Severity-based rendering (per
`json-error-language-spec.md` §7.1) carries forward: WARNING
diagnostics use the `Fix:` (or `Next:` for INFO) form without an
`Exit N:` line.

---

## 14. Test Fixtures

### 14.1 Fixture directory layout

```
fixtures/adapters/
  pnpm-basic/
    package.json
    pnpm-workspace.yaml
    pnpm-lock.yaml
    apps/api/package.json
    apps/web/package.json
    packages/shared/package.json
    .archengine/expected-topology.json
  pnpm-workspace-protocol/
    ...
  pnpm-nested/
    ...
  pnpm-excluded-glob/
    ...
  yarn-pnp-basic/
    ...
  yarn-berry-workspaces/
    ...
  npm-workspaces-basic/
    ...
  ambiguous-multiple-adapters/
    ...
```

Each fixture directory contains:

- The bare-minimum package manifests to reproduce the shape.
- The workspace file(s) appropriate to the manager.
- A `.archengine/expected-topology.json` snapshot listing:
  - expected adapter name + version + confidence
  - expected canonical nodes (sorted by id)
  - expected canonical edges (sorted by id)
  - expected graphSurfaceHash (frozen)
  - expected diagnostics by code

### 14.2 Shared conformance harness

A `tests/adapter-conformance/` directory holds the cross-adapter
conformance suite. It runs the same battery of tests against
every adapter:

| Test | What it asserts |
| --- | --- |
| `same-fixture-twice-byte-identical` | Two runs against the same fixture produce byte-identical `AdapterTopologyResult` modulo a synthetic `emittedAt`. |
| `no-mutation` | Fixture file checksums before/after match. |
| `no-network` | Adapter run inside a sandbox that fails on socket-open. |
| `no-installation` | Adapter run with `node_modules` absent; output identical when `node_modules` is then added. |
| `low-signal-emits-diagnostic` | A low-signal fixture produces a `LOW`-confidence detection AND a corresponding diagnostic. |
| `graph-surface-hash-stable` | The fixture's frozen graphSurfaceHash matches. |
| `relative-paths-only` | No absolute path appears in any output array. |

### 14.3 Per-adapter test buckets

Each adapter has its own suite that lives in its own package
(`packages/adapter-pnpm/tests/`, `packages/adapter-yarn-pnp/tests/`)
and runs the shared conformance harness over the relevant
fixtures plus adapter-specific tests (workspace-protocol parsing,
exclusion-glob handling, etc.).

### 14.4 CLI-level integration tests

A new `cli-experience-phase-h-adapters.test.ts` test file lands
in `packages/cli/tests/` covering:

- Adapter selection precedence: pnpm beats monorepo when both
  match.
- `ARCH_ENGINE_ADAPTER_CONFLICT` emitted with the right adapter
  pair.
- `data.adapter` JSON v2 block present on every command.
- `data.adapter.alsoDetected[]` populated correctly on
  multi-match.
- JSON v1 unaffected — no `adapter` key at v1 default.
- `doctor` human output names the chosen adapter.

---

## 15. Implementation Order

The v1.3+ adapter expansion lands as a sequence of focused
passes. Each pass is independently shippable; no big-bang rewrite.

### 15.1 Pass 1 — Adapter contract internals + monorepo refactor

Scope:

- Land the `ArchitectureAdapter` interface (§6.1) as **internal**
  types under `packages/cli/src/adapter-contract.ts`.
- Refactor `@arch-engine/adapter-monorepo` to implement the
  interface internally, while keeping its public API
  byte-identical (thin wrappers over the new
  `monorepoAdapter.extractTopology()`).
- Land the shared internal utilities (workspace glob resolution,
  package.json edge extraction, deterministic sort, hash).
- Adapter selection logic in the runner-bridge — even though only
  one adapter exists, the selection algorithm runs through it.

No public API change. No new package. No bump required (could
ship as part of a v1.2.x patch if other small fixes accumulate,
or batch into Pass 2's minor bump).

### 15.2 Pass 2 — pnpm adapter MVP

Scope:

- Publish `@arch-engine/adapter-pnpm@0.1.0` per §9.
- Wire selection in the runner-bridge so pnpm-workspace.yaml
  routes to the new adapter.
- Add `data.adapter` to JSON v2 output (§12).
- Add the four pnpm-related fixture directories + conformance
  tests (§14).
- Bump `@arch-engine/cli` to a new **minor** (likely v1.3.0)
  to reflect the new `data.adapter` JSON v2 surface + the
  new ARCH_ENGINE_* codes (§13).
- Document the new behaviour in CHANGELOG and update the
  GitHub Actions templates to mention pnpm support.

**Recommendation:** ship pnpm-only first. Yarn PnP follows.

### 15.3 Pass 3 — Yarn PnP adapter MVP

Scope:

- Publish `@arch-engine/adapter-yarn-pnp@0.1.0` per §10.
- Selection logic gains yarn-pnp precedence over monorepo (§7.2).
- Yarn-pnp fixtures + conformance tests (§14).
- ARCH_ENGINE_PNP_RESOLUTION_DEFERRED on every Yarn PnP run for
  v0.1.0 honesty.
- Bump `@arch-engine/cli` to a **patch** (v1.3.x) because the
  data.adapter contract from Pass 2 already exists; this is
  additive adapter coverage.

### 15.4 Pass 4 — Real-repo trial pass

Scope:

- Run Arch-Engine against 10-20 real public OSS repositories
  representing each supported workspace shape (pnpm, yarn-pnp,
  npm-workspaces, single).
- Capture `doctor --json --json-schema=v2` output for each.
- File issues for any failed extraction or wrong-adapter
  selection.
- Optionally update the GitHub Actions templates to recommend
  installing the appropriate adapter package.

### 15.5 First implementation target

**Pass 1 + Pass 2 together** = the pnpm-only milestone. Yarn-pnp
(Pass 3) is deliberately deferred so the pnpm pass can validate
the adapter contract, selection logic, and JSON v2 metadata
end-to-end before adding a second adapter with its own complexity.

---

## 16. Acceptance Criteria

The future v1.3+ implementation pass succeeds if and only if:

### 16.1 Adapter contract (Pass 1)

- An internal `ArchitectureAdapter` interface exists with the
  shape locked in §6.1.
- `@arch-engine/adapter-monorepo` implements the interface
  internally and **its public API is byte-identical to v1.2.0**
  (verified by snapshot test).
- The runner-bridge runs adapter selection (§7) even with one
  adapter installed; the selection result is observable in JSON
  v2 (Pass 2 gates the JSON v2 surface).
- All §8 determinism rules pass on the existing fixtures.

### 16.2 pnpm adapter (Pass 2)

- `@arch-engine/adapter-pnpm@0.1.0` published to npm.
- All §9.3 MUST-HANDLE features pass on fixtures.
- All §9.4 DEFERRED features emit appropriate diagnostics
  (`ARCH_ENGINE_LOCKFILE_UNSUPPORTED` etc.) and do not error.
- `data.adapter` block present per §12.
- The six new ARCH_ENGINE_* codes (§13) wired with metadata
  per `json-error-language-spec.md` §6.2.
- JSON v1 byte-identical to v1.2.0 default output (snapshot
  test).
- Phase A-G suites stay green; new Phase H adapter tests added.
- `graphSurfaceHash` for a pnpm fixture matches when the same
  topology is extracted by either `@arch-engine/adapter-pnpm`
  OR `@arch-engine/adapter-monorepo`'s pnpm-fallback (verified
  by fixture).
- `npm pack --dry-run` clean for all seven existing packages
  + the new pnpm adapter package.
- `npm test` + freeze tests green.
- No new public exports widen the v1.x freeze (the
  `ArchitectureAdapter` interface stays internal).
- No `@arch-governance/*` dependency added.

### 16.3 Yarn PnP adapter (Pass 3)

- `@arch-engine/adapter-yarn-pnp@0.1.0` published.
- §10.4 MUST-HANDLE features pass.
- §10.3 MUST-NOT-HAPPEN invariants verified by static analysis
  (no `require()` or `import()` of cwd-relative files in the
  adapter source).
- All Phase A-G + Phase H suites stay green.
- `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` always emitted on
  detection.

### 16.4 Real-repo trial (Pass 4)

- ≥80% of trialled repos produce a HIGH-confidence
  detection on the right adapter.
- Any failures are tracked as v1.4+ adapter-hardening issues,
  not blockers for v1.3 release.

### 16.5 Out of scope for v1.3 implementation passes

- `--adapter <name>` CLI override flag.
- `.archengine/adapter.yml` config file.
- Catalog / lockfile-deep parsing.
- `.pnp.cjs` execution.
- AGP emitter integration.
- Bun / Deno / Lerna adapters.

These remain reserved for future passes.

---

*End of Multi-Adapter Surface Specification.*
