# Arch-Engine v1.0.0 Repository & AGP Emitter Readiness Audit

**Audit date:** 2026-05-04
**Auditor:** Claude Opus 4.7 (1M context), audit-only pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**HEAD:** `ff924b5` on `main`
**Latest npm release:** `@arch-engine/*@1.0.0` (published 2026-04-14)
**External AGP packages now public:** `@arch-governance/runtime@1.7.0`, `@arch-governance/architecture-profile@0.1.0` (published 2026-05-04)

---

## 1. Executive Verdict

**`READY_WITH_REPO_DELTAS`**

The published `@arch-engine/*@1.0.0` surface on npm is real, installable, and structurally coherent — and the Arch-Engine `TopologyGraph` shape is the right input substrate for an AGP emitter. **However**, the local working tree has drifted significantly past the v1.0.0 build that was published. The current source no longer builds end-to-end (`@arch-engine/sdk` is referenced but not a workspace member), several published commands are runtime-broken (`analyze`, `check`, `explain` all fail with `"edges is not iterable"`), the README contains stale claims, and the binary embedded in the published `@arch-engine/cli@1.0.0` self-reports as `1.0.0-rc.3`. None of these are fatal blockers for an AGP emitter contract pass — the v1.0.0 contract on npm is the only thing the emitter must protect, and that contract is pinned and inspectable. But before any *implementation* of the emitter, the contract pass should explicitly enumerate what the emitter is forbidden from breaking, and the repo deltas listed in §15 should be recorded as known liabilities so they don't get rolled into emitter scope.

Proceed to the **AGP Emitter Contract Specification Pass**, treating v1.0.0 as a frozen external surface and the local source as a divergent workshop branch.

---

## 2. Scope

This is an **audit-only** pass. Per mission constraints:

- No emitter implementation.
- No `@arch-governance` dependencies added.
- No source edits, refactors, version bumps, or publishes.
- No CLI command changes, no export changes, no README rewrite, no deletions.
- No SaaS, dashboard, registry, or federation product work.

The single artifact produced is this document.

---

## 3. Repository State

| Field | Value |
| --- | --- |
| Branch | `main` |
| Remote | `https://github.com/tharcyn/arch-engine.git` |
| Working tree | Clean |
| HEAD | `ff924b5 feat: extract architecture governance protocol into standalone ecosystem surface` |
| `origin/main` | `bf39ac7` |
| Local position | **53 commits ahead** of `origin/main`, 0 behind |
| Distance from `v1.0.0` tag | **66 commits ahead** of `v1.0.0` (`84215b4 chore: launch surface polish`) |
| Tags | `v1.0.0`, `v1.0.0-rc.3`, `v1.0.0-rc.1`, `v0.1.0-preview`, `v0.1.0-preview-patch1` |

**Implication:** Significant unpushed and unreleased work exists locally — primarily the AGP / kernel / capsule / certification packages. None of this is on the published v1.0.0 surface.

---

## 4. npm Package Surface

### 4.1 Local declared surface

Root `package.json` is **`private: true`**, name `arch-engine@1.0.0`. It is a yarn-style workspaces monorepo with **11 declared workspaces**. The `bin` entry points at `./packages/cli/dist/bin.js`; the `files` array enlists workspace `dist/` outputs.

Workspaces declared:

```
packages/schema, packages/core, packages/cli,
packages/governance-pack-rest-contract,
packages/governance-pack-authority,
packages/governance-pack-journey,
packages/adapter-monorepo,
packages/adapters/{shared, conformance, github, gitlab}
```

### 4.2 Published surface (npm registry)

| Package | `latest` | `rc` | Public? | Notes |
| --- | --- | --- | --- | --- |
| `@arch-engine/schema` | 1.0.0 | 1.0.0-rc.3 | yes | exports `.` and `./schemas/*` |
| `@arch-engine/core` | 1.0.0 | 1.0.0-rc.3 | yes | exports `.`, `./analysis`, `./parsers` |
| `@arch-engine/cli` | 1.0.0 | 1.0.0-rc.3 | yes | bin `arch-engine`, peer-optional `@arch-engine/adapter-monorepo` |
| `@arch-engine/adapter-monorepo` | 1.0.0 | 1.0.0-rc.4 | yes | dep on `@arch-engine/core` |
| `@arch-engine/governance-pack-rest-contract` | 1.0.0 | 1.0.0-rc.4 | yes | |
| `@arch-engine/governance-pack-authority` | 1.0.0 | 1.0.0-rc.4 | yes | |
| `@arch-engine/governance-pack-journey` | 1.0.0 | 1.0.0-rc.4 | yes | |
| `@arch-engine/adapter-shared` | — | — | **404** | private workspace |
| `@arch-engine/adapter-conformance` | — | — | **404** | private workspace |
| `@arch-engine/adapter-github` | — | — | **404** | private workspace, but referenced in README as "Complete" |
| `@arch-engine/adapter-gitlab` | — | — | **404** | private workspace, "Planned next" per README |
| `arch-engine` (root) | — | — | **404** | `private: true` |

All published packages were minted on `2026-04-14`. License: MIT. Engines: `node >=18`. Maintainer: `tharcyn <thaasyn@gmail.com>`.

### 4.3 Published-vs-local divergence

- The published `@arch-engine/cli@1.0.0` `dependencies` list does **not** include `@arch-engine/adapter-github` / `adapter-gitlab`. The local `packages/cli/package.json` *has been edited post-1.0.0* to add them as deps. The published surface is fine; the local file would break a re-publish.
- The published `@arch-engine/cli@1.0.0` `dist/bin.js` carries `cli.version("1.0.0-rc.3")` — the binary self-reports as the RC even though `package.json.version === "1.0.0"`. This is a versioning defect frozen into the published artifact (see §9 / §15).

---

## 5. Public Install Smoke

Tempdir: `mktemp -d`, fresh `npm init -y`, then:

```
npm install --no-audit --no-fund @arch-engine/cli@1.0.0
```

Result: **13 packages installed in 7 s, no errors.**

| Step | Result |
| --- | --- |
| `npx arch-engine --version` | `arch-engine/1.0.0-rc.3 darwin-arm64 node-v25.2.1` (binary version-string drift) |
| `npx arch-engine --help` | Lists 5 commands: `doctor`, `inspect`, `analyze`, `check`, `explain <target>` |
| `npx arch-engine doctor` (no adapter) | Fatal: `This command requires @arch-engine/adapter-monorepo.` |
| `npm install @arch-engine/adapter-monorepo@1.0.0` | OK |
| `npx arch-engine doctor` (with adapter) | Pass — emits domain distribution, coverage 100%, "single" workspace |
| `npx arch-engine doctor --json` | Pass — emits structured CLI-output-contract JSON |
| `npx arch-engine inspect` | Pass |
| `npx arch-engine analyze` | **Fail:** `Fatal: edges is not iterable` |
| `npx arch-engine check` | **Fail:** `Topology extraction failed: edges is not iterable` |
| `npx arch-engine explain TARGET` | **Fail:** `Fatal: edges is not iterable` |

**Public install works.** **Three of five commands are runtime-broken on the published v1.0.0** even on a trivial single-package fixture. `doctor` and `inspect` are the only two reliably useful published commands today.

Tempdir cleanup: confirmed.

---

## 6. CLI Surface (Published v1.0.0)

```
arch-engine <command> [options]

Commands
  doctor                      Diagnose environment readiness and existing adapter usage
  inspect                     Output canonical topology summary without executing violations
  analyze                     Emit stability score, conflict ratios, and blast radius summary  [BROKEN]
  check                       Execute architecture pipeline and evaluate boundaries           [BROKEN]
    --min-coverage <pct>      Require minimum topology coverage (0.0–1.0)
    --sync                    Emit SaaS synchronization session locally
  explain <target>            Explain WHY a violation or HOW confidence propagated            [BROKEN]

Global options
  --json                      Output results as JSON
  --no-color                  Disable colorized output
  -h, --help                  Display help
  -v, --version               Display version
```

Per-command `--help` (e.g. `arch-engine github --help`) currently falls back to root help output rather than showing command-specific help — a `cac` routing artifact.

CLI output contract is schemafied at `schemas/cli-output-contract.json` (`$id: schemas.arch-engine.dev/cli-output-contract.json`, `schemaVersion: R0-v1`) and covers `doctor`, `inspect`, `check`. JSON keys observed in `doctor --json`: `environment`, `extractionMode`, `topologyConfidence`, `topologyConfidenceLabel`, `confidenceDescription`, `detectedNodes`, `expectedNodes`, `connectedNodes`, `coverage`, `connectivity`, `crossings`, `domainDistribution`, `domainIntegrity`, `warnings`, `autoInitialized`, `hasPolicyFile`.

CI behavior: not formalized. Exit codes are not documented; commands print to stderr on failure and exit non-zero, but no SARIF / GitHub Annotations / GitHub Action wrapper is wired into the public CLI. (A GitHub Action exists at `action/` but it builds locally only.)

The local `dist/bin.js` (rebuilt post-1.0.0) adds two more commands — `github create-policy-pr [file]` and `gitlab create-policy-mr [file]` — but **these are not in the published v1.0.0**. The local source `cli.ts` registers 324 `.command(...)` calls (federation, registry, bundle, pack, capability, ecosystem, etc.) which have never been built and are not part of the published contract.

---

## 7. Code Architecture Inventory

### 7.1 In-workspace (part of v1.0.0 surface)

```
packages/
  schema/                 — JSON schemas + TS types (entity, dependency, contract, invariant indices, R0-v1 schema)
  core/                   — TopologyGraph runtime, EngineRunner, policy evaluation, snapshots, capabilities, federation overlays
    src/topology/         — TopologyGraph, TopologyNode, TopologyEdge, snapshot, policy-pack runner, completeness heatmap, dataset format router, schema compatibility gate
    src/runner/           — EngineRunner (single file)
    src/sdk/              — Adapter contract types (ArchitectureAdapter, AdapterPack, AdapterContext)
    src/manifest/         — manifest-loader, validateAdapterCompatibility
    src/adapters/         — capability-registry, trust-ranking, adapter-priority, blast-radius
    src/composition/      — overlay merge algebra, conflict resolver, precedence, mirror substitution, tier resolver
    src/policy/, src/protocol/, src/confidence/, src/reconciliation/, src/provenance/, src/traversal/, ...
  cli/                    — CLI wrapper around core; published surface is 5 commands; src has 324 unbuilt commands
  adapter-monorepo/       — Single-file workspace topology extractor (npm/yarn/pnpm); 153 LOC
  governance-pack-rest-contract/, governance-pack-authority/, governance-pack-journey/  — Three published policy packs
  adapters/{shared,conformance,github,gitlab}/  — Private workspaces (not on npm)
```

### 7.2 Non-workspace (post-v1.0.0 experimentation, not built, not published)

42 directories under `packages/` are **not** in the workspaces array and are not part of the published or compiled surface. These include:

```
agents, agp-foundation, agp-spec, agl, approval, assurance, assurance-orchestrator,
benchmarking, capsule, certification, continuous-assurance, controller, copilot,
dataset-exchange, discovery, ecosystem-kit, exchange, interoperability, kernel,
maturity, migration, observability, ontology, operator-sdk, platform-interface,
plugins, policy-apps, productization, proofs, recommendation-graph, reference-node,
registry-network, scorecard, sdk, semantic-compatibility, service, spec-portal,
standards, testing, transparency-explorer, transparency-ledger, trust-federation,
verifier-sdk, workflows
```

Plus top-level extension directories: `agp/`, `compatibility/`, `registry/`, `spec/`, `spec-export/`, `portal-export/`, `deploy/`, `site/`, `.tmp-site/`.

These represent ~66 commits of post-1.0.0 work. **None of them is on npm.** They form a useful inventory of where AGP-flavored thinking has been prototyped, but they are not part of the contract and should not be conflated with v1.0.0.

### 7.3 Other artifacts in repo root

- 8 `.tgz` build outputs from RC iterations (e.g. `arch-engine-1.0.0.tgz`, `arch-engine-cli-1.0.0-rc.3.tgz`) — pre-publish proof artifacts left behind
- `scratch.mjs`, `scratch.ts`, `scratch2.ts`, `scratch3.ts`, `update_refusals.js`, `vitest.out` — disposable / ad-hoc; not publish-clean
- `.arch-engine/policy-lock.json` — auto-created lockfile

---

## 8. Current Capability Map

What v1.0.0 can do today, on npm, with the working command pair (`doctor`, `inspect`):

| Capability | State | Where |
| --- | --- | --- |
| Detect workspace type (npm/yarn/pnpm/single) | Working | `@arch-engine/adapter-monorepo` |
| Extract node list from package manifests | Working | adapter-monorepo + core ingestion |
| Build adjacency map | Working | adapter-monorepo |
| Authority domain classification | Working | adapter-monorepo (`APPLICATION/SERVICE/LIBRARY/FOUNDATION/INFRASTRUCTURE/UNCLASSIFIED`) |
| Coverage / connectivity metrics | Working | core |
| Topology confidence label | Working | core |
| `closureGraphHash` deterministic identity | Designed | core; not exercised by published CLI |
| `TopologyGraph` schema (`graphSurfaceVersion: "1.0.0"`, `graphSurfaceHash`) | Defined | `packages/core/src/topology/TopologyGraph.ts` |
| Policy-pack execution (authority/rest-contract/journey) | Defined, plumbed | three published packs |
| Policy evaluation in CI | **Broken** | `check` errors |
| Stability scoring / blast radius | **Broken** | `analyze` errors |
| Reasoning explain trace | **Broken** | `explain` errors |
| Snapshot replay / lineage | Designed | not reached via public CLI |
| GitHub / GitLab PR emission | Local-only | not in published CLI |
| Federation overlay merge | Designed | not reached via public CLI |

Topology contract types (used by the future emitter):

```ts
interface TopologyGraph {
  readonly graphSurfaceVersion: "1.0.0";
  readonly graphSurfaceHash: string;
  readonly nodes: readonly TopologyNode[];
  readonly edges: readonly TopologyEdge[];
}
interface TopologyNode { readonly id: string; readonly type: string; readonly metadata?: Record<string, unknown>; }
interface TopologyEdge { readonly from: string; readonly to: string; readonly type: string; readonly metadata?: Record<string, unknown>; }
```

Test coverage: 351 test files / 1218 tests passed at v1.0.0 (per prior `vitest.out`); 641/662 files and 1881/1890 tests pass currently.

---

## 9. Build/Test/Pack Results

| Command | Status | Detail |
| --- | --- | --- |
| `npm config get registry` | ok | `https://registry.npmjs.org/` |
| `npm whoami` | ok | `tharcyn` |
| `npm run` | ok | scripts: `build`, `prepack`, `test`, `test:watch`, `typecheck`, `clean` |
| `npm run typecheck` | **misleading pass** | root `tsconfig.json` has `files:[]` and project references but no `--build`, so `tsc --noEmit` checks zero files |
| `npx tsc -p packages/cli/tsconfig.json --noEmit` | **fail** | hundreds of errors: missing `@arch-engine/sdk`, `@arch-engine/agents`, `@arch-engine/agp-spec`, missing core exports (`loadTopologyDataset`, `loadPolicyPack`), arity mismatches in policy patch commands |
| `npm test` | **9 / 1890 fail, 21 / 662 files fail** | 5 snapshot mismatches + 4 obsolete; failures touch validator topology projection, root barrel boundary, dataset ingestion pipeline, executable local policy-pack surface, runner execution substrate |
| `npm run build` | **fail** | tsup builds adapters successfully, then the `@arch-engine/cli` build dies on `Could not resolve "@arch-engine/sdk"` (referenced in `commands/pack/init.ts` and `commands/pack/validate.ts`) |
| `npm pack --dry-run` | **fail (via prepack)** | runs `npm run build`, which fails as above; no tarball produced |

The published v1.0.0 was minted from an earlier source state; the current local source can no longer reproduce that build cleanly.

---

## 10. Documentation / README Conversion Audit

**README.md (`README.md`, 260 lines) — what's clear:**

- Crisp opening sentence: *"Architecture governance runtime for real codebases."*
- Pipeline diagram (`Code → Graph Extraction → Capability Adapters → Policy Packs → Diagnostics`)
- Side-by-side comparison table vs. ESLint, OPA, Bazel
- CLI command table for the 5 public commands
- Package map with role descriptions
- Architecture-layering ASCII diagram
- Policy-pack table
- Examples table

**README — stale, misleading, or broken claims:**

| # | Claim | Reality |
| --- | --- | --- |
| 1 | Coverage badge: `tests-915%20passed` | Current: **1881 passing**. Badge is from an old build. |
| 2 | Quickstart `npm install @arch-engine/cli && npx arch-engine doctor` | First run fails with `This command requires @arch-engine/adapter-monorepo`. The quickstart is broken; the user must install adapter-monorepo too. |
| 3 | "**GitHub Adapter** (`@arch-engine/adapter-github`) — Complete and fully operational." | `@arch-engine/adapter-github` returns 404 on npm. It's a private workspace. |
| 4 | "**GitLab Adapter** (`@arch-engine/adapter-gitlab`) — Planned next." | Same — private workspace, 404 on npm; locally implemented but unpublished. |
| 5 | Pipe example: `arch-engine policies emit-policy-pr --json \| arch-engine github create-policy-pr --execute` | `policies emit-policy-pr` does not exist in the published CLI; `github create-policy-pr` is in the local dist but not on npm. |
| 6 | "All commands support `--json` for machine-readable CI integration. Exit codes reflect diagnostic status." | Exit codes are not documented anywhere; `analyze`/`check`/`explain` exit non-zero with `Fatal: edges is not iterable` regardless of fixture. |
| 7 | "Architecture layering" diagram positions `adapter` as **optional** | Functionally required: `doctor` refuses to run without `@arch-engine/adapter-monorepo`. |
| 8 | "`closureGraphHash` provides a cryptographic fingerprint of the full topology evaluation" | True in core, but the public CLI never surfaces it. Determinism story is invisible to a stranger using the CLI. |
| 9 | Repo structure block lists 7 directories under `packages/` | Real count is **53**; the repository is dramatically larger than the README implies. (This is fine, since post-v1.0.0 dirs aren't part of the contract — but the omission obscures the divergence.) |

**README — what's missing for the AGP era:**

- **Zero AGP positioning.** Neither `AGP`, `Architecture Governance Protocol`, `@arch-governance/architecture-profile`, nor `@arch-governance/runtime` appears in the README. The shipped `docs/contracts/agp-*.md` files exist but are deeply abstract ("the Stewardship Runtime defines the cryptographic boundaries of protocol evolution") and not linked from the README.
- No "first 60 seconds" framing of *what AGP is* and *how Arch-Engine plugs into it*.
- No CI example (no GitHub Actions YAML snippet showing `arch-engine doctor` gating a PR).
- No example of a real `--json` payload diff between two runs (the determinism pitch).
- No demo repo link.
- No badge for `@arch-engine/core` install count or `@arch-governance/architecture-profile` compatibility.

**Other docs:**

- Tone is highly formal and adverb-dense. Example from `docs/ecosystem-positioning.md`: *"Policy-pack portability guarantees: Secures ecosystem verification safely dynamically gracefully reliably smoothly confidently perfectly appropriately elegantly solidly. (Writing cleanly)."* — that line is in the shipped doc.
- `docs/contracts/agp-public-specification-portal.md`, `agp-foundation-charter.md`, `agp-specification-runtime.md`, `agp-v1-public-specification.md` all exist on disk but reference internal "Stewardship Runtime", "GIRIS", and "Capsule Runtime" concepts that have no public package mapping and aren't linked from README.
- No stale `@agp/runtime` or `@agp/architecture-profile` references found anywhere in repo (good — never used the old scope).

**Audit grep:**

```
grep -RE "@agp/|@arch-governance/" --include="*.md" --include="*.ts" --include="*.json" .
  → 0 matches outside node_modules
```

---

## 11. AGP Integration Readiness

Strong yes on substrate, weak yes on packaging hygiene.

**What makes the substrate ready:**

- `TopologyGraph` is a normalized, immutable, hash-stable shape. It's already the canonical input every `EngineRunner` execution produces, and every governance pack consumes. This is exactly the "normalized topology graph" the emitter needs.
- `closureGraphHash` semantics align with AGP's `evaluateClosureGraphHashBindingContractV1` (aliased over `SnapshotHashBindingContract`). The terminology and mental model already match.
- The published `@arch-governance/architecture-profile@0.1.0` exposes architecture-domain aliases over `@arch-governance/runtime`'s generic dataset primitives. The records the emitter must emit are well-typed:
  - `TopologySnapshotRecord` (alias of `SnapshotRecord`)
  - `ArchitectureFederationParticipantRecord`
  - `AuthorityDelegationRecord` (alias of `CapabilityDelegationRecord`)
  - `ArchitectureLifecycleTransitionRecord`
  - `ClosureGraphHashBindingRecord`
  - `ProducerAttestationRecord`
  - `ProducerKeyRegistryRecord`
- `PROFILE_VERSION` constant: `"agp_architecture_profile.v0.1"` — single anchor for compatibility checks.

**What's not ready:**

- The current source can't build, so an emitter that lives inside this monorepo can't ride the existing CI until §15-R1 is fixed.
- `analyze`/`check`/`explain` runtime defects sit on the same code paths the emitter would consume (the iteration over `edges`). The emitter contract should *avoid* invoking those paths until the bug is fixed; lean on `inspect`-shaped output instead.
- Schemas authority (`schemas.arch-engine.dev`) and AGP schemas (`PROFILE_VERSION` strings) need an explicit mapping. None exists today.

---

## 12. Recommended Emitter Location

**`packages/agp-emitter/`** — a new top-level workspace named `@arch-engine/agp-emitter`, added to the `workspaces` array in the root `package.json`.

Justification:

- **Mirrors existing layout.** Every published package today is `packages/<name>/` and scoped `@arch-engine/<name>`. A new sibling fits naturally.
- **Avoids polluting `core`.** `@arch-engine/core` has a sealed export surface (`.`, `./analysis`, `./parsers`) and a "Public Surface Contract" that explicitly forbids deep imports. Adding an AGP-shaped subpath like `@arch-engine/core/agp` would either widen the contract or violate it.
- **Avoids the unpublished sandbox.** `packages/agp-foundation/`, `packages/agp-spec/`, and the top-level `agp/` directory are all post-v1.0.0 experiments outside the workspace set and the build graph. The emitter must NOT live there — it would inherit the build-broken parent.
- **Single-purpose, single-dependency.** The emitter has one job: take a `TopologyGraph` (or `EngineExecutionResult`) and emit AGP records. It should not own ingestion, scanning, or policy logic.

Forbidden alternatives (and why):

- `src/agp/` — repo doesn't have a top-level `src/`; would require restructuring.
- `src/emitter/` — same.
- `packages/emitter/` — name leaks "emitter" without naming the protocol; any future second emitter (e.g. SARIF) would conflict.
- `packages/agp-foundation/` (existing) — outside workspaces, not built, full of post-1.0 experimentation.
- `packages/arch-engine-emitter/` — duplicates `arch-engine` in the package name; the scope already gives that.

---

## 13. Contract Requirements for the Next Mission

The following must be specified by the **AGP Emitter Contract Specification Pass** (no implementation, just the contract):

**Dependency rules**

- **Allowed runtime dep:** `@arch-governance/architecture-profile` (exact version pin, e.g. `^0.1.0`) — this is the *only* permitted external AGP dependency.
- **Forbidden runtime deps:**
  - `@arch-governance/runtime`
  - `@arch-governance/runtime/*`
  - `@arch-governance/architecture-profile/*` deep imports (only `.` is permitted)
  - any local copy or paraphrase of AGP runtime types
  - any duplicate locally-defined `agp_architecture_profile.*` constants
- **Allowed dev dep:** `@arch-engine/core` for typings of `TopologyGraph`/`EngineExecutionResult`.
- **Public surface contract:** the emitter must export only `.` and not introduce subpath exports until v0.2.

**Input shape**

- Primary input: `TopologyGraph` (`graphSurfaceVersion: "1.0.0"`, `graphSurfaceHash: string`, `readonly nodes: readonly TopologyNode[]`, `readonly edges: readonly TopologyEdge[]`).
- Optional secondary input: `EngineExecutionResult` (when downstream needs lifecycle / federation participation records).
- Inputs must be treated as readonly. The emitter must not mutate the input graph.

**Output shape**

- Emit AGP-native records using the aliased types from `@arch-governance/architecture-profile`:
  - `TopologySnapshotRecord` from each `TopologyGraph`
  - `ClosureGraphHashBindingRecord` derived from `closureGraphHash` ↔ snapshot identity
  - `AuthorityDelegationRecord[]` for adapter→domain authority crossings
  - `ArchitectureFederationParticipantRecord[]` for multi-source extraction (when federation overlay is invoked; out of v1 scope is acceptable)
  - `ArchitectureLifecycleTransitionRecord[]` for diff events between two snapshots (optional in v1)
- `PROFILE_VERSION` must be the package's own constant — never re-declare locally.

**Determinism**

- For identical input (same `graphSurfaceHash`), output records must be byte-identical.
- Stable ordering: nodes/edges/records sorted by canonical id (string comparison).
- Stable IDs: derive deterministic record IDs from input hashes (`closureGraphHash` + record-kind salt), never timestamps or randomness.
- No `Date.now()`, `crypto.randomUUID()`, or environment lookups in the emitter hot path.

**Report integration**

- Define how a future `arch-engine agp-emit` (or extension to `inspect --agp`) surfaces records in JSON.
- Define Markdown rendering shape for human consumption (table of records by kind).
- The contract must specify whether the emitter is invoked synchronously inside `inspect`/`check`, or as a separate command. **Recommendation: separate command first**, to keep v1.0.0 CLI bytes unchanged.

**CI behavior**

- `agp-emit` must have a fail mode (`--fail-on-violations`) and a warn mode.
- Exit code 0 on clean emission; 1 on emission failure; 2 on AGP contract violations (per AGP error-code constants).

**Compatibility**

- v1.0.0 CLI surface (`doctor`, `inspect`, `analyze`, `check`, `explain`) **must not change**.
- v1.0.0 JSON schemas (`cli-output-contract.json`) **must not change**.
- `@arch-engine/core` exports **must not change**.
- AGP-emitter records must be additive, never replacing existing CLI output.

**Schema authority**

- The contract must state whether AGP records carry `schemas.arch-engine.dev` URIs or `schemas.agp-protocol.dev` URIs (or both). Default recommendation: AGP authority for AGP records, Arch-Engine authority for everything else.

---

## 14. Non-Goals

The emitter contract pass and any subsequent implementation pass MUST NOT:

- Implement the emitter (this audit is contract-prep only).
- Ship a hosted dashboard, SaaS console, or web app.
- Build an AGP registry, federation node, or trust ledger.
- Add a new top-level CLI verb that overlaps with `doctor`/`inspect`/`check`/`analyze`/`explain`.
- Modify `@arch-governance/runtime` or `@arch-governance/architecture-profile`.
- Change the AGP `PROFILE_VERSION`.
- Add multi-language scanners (Python/Go/Rust adapters).
- Change v1.0.0 published CLI commands or flags.
- Bump `@arch-engine/*` to v1.1.0 or v2.0.0 yet.
- Republish v1.0.0.

---

## 15. Risks

**R1 — Breaking v1.0.0 users.** The emitter must ship as a new package or new CLI verb. Any change to the existing 5-command surface, the JSON output schema, or the `@arch-engine/core` exports is a v1 breakage. The emitter package version starts fresh (e.g. `0.1.0`) and stays orthogonal.

**R2 — Confusing AGP and Arch-Engine scopes.** Two scopes, two product surfaces:
- `@arch-engine/*` = Arch-Engine product (CLI, scanner, governance packs)
- `@arch-governance/*` = AGP protocol (runtime + architecture-profile)
The emitter is the only legitimate bridge. Documentation that conflates the two will confuse adopters and erode the protocol's neutrality.

**R3 — Over-abstract docs.** The existing `docs/contracts/agp-*.md` files are dense, adverb-laden, and don't onboard a stranger. If the contract pass produces docs in the same register, no one will read them. The emitter contract must be specifiable in plain English with concrete examples.

**R4 — Insufficient first-run CLI experience.** The README quickstart is currently broken (missing adapter-monorepo) and 3 of 5 commands error on real fixtures. Bolting an `agp-emit` command on top of a fragile public CLI risks every emitter bug being indistinguishable from the underlying defect. Either fix the v1 defects first (R7), or scope the emitter to consume `inspect` output (which works) rather than the broken paths.

**R5 — False positive architecture checks.** AGP architecture-profile error codes (e.g. `dataset_pipeline_input_invalid`, `mutation_pipeline_namespace_violation`) will fire on the emitter's records. The contract must specify expected error-code behavior on a known-good fixture so we don't ship a noisy emitter.

**R6 — Adding AGP dependency too early.** Once `@arch-engine/agp-emitter` depends on `@arch-governance/architecture-profile`, every Arch-Engine-on-CI install pulls AGP. The emitter must remain an **opt-in installable** — not a transitive dep of `@arch-engine/cli` or `@arch-engine/core`.

**R7 — Local source rot.** The current source can't build (`@arch-engine/sdk` missing), can't pack (prepack runs build), and the cli typecheck fails with hundreds of errors. The emitter contract pass should not try to land its package inside this monorepo until R7 is at least partially resolved — otherwise the emitter PR will sit blocked on unrelated CI failures. A targeted "Repo Hygiene Pass" (separate mission) can quarantine the unpublished sandbox packages and restore a green build.

**R8 — Binary version-string drift.** Published `@arch-engine/cli@1.0.0` reports itself as `1.0.0-rc.3` from `--version`. If the emitter contract pass adds version-aware logic (e.g. "only emit AGP records when CLI ≥ x.y.z"), the embedded mismatch will produce false negatives. Either fix v1 (republish patch) or have the emitter trust `package.json` over CLI self-report.

**R9 — README claims unpublished adapters are real.** README markets `@arch-engine/adapter-github` and `@arch-engine/adapter-gitlab` as "Complete" and "Planned"; both 404 on npm. Anyone trying to install them today fails. Not an emitter concern, but a credibility tax on the same surface the emitter rides.

---

## 16. Immediate Next Step

**Recommended next mission:** **Arch-Engine AGP Emitter Contract Specification Pass.**

Rationale: the v1.0.0 contract on npm is real and stable; the AGP packages are real and stable; the substrate (TopologyGraph + closureGraphHash) is the right input shape; the emitter scope is small and well-bounded. The contract pass is unblocked.

If the team would rather stabilize the v1 surface first, the alternative mission is **"Arch-Engine v1.0.0 Repo Hygiene Pass"** — quarantine the 42 non-workspace packages, fix the `@arch-engine/sdk` import in `commands/pack/{init,validate}.ts`, repair the `edges is not iterable` defect, refresh the README badges and quickstart, and either republish a `1.0.1` patch or document the binary version-string drift. The contract pass can run in parallel with that hygiene pass without conflict, because the contract pass produces only a doc.

**Default recommendation: do the contract pass next.** Repo hygiene is real but is not on the critical path for an AGP emitter contract.

---

## 17. Appendix A — Commands Run

| # | Command | Result |
| --- | --- | --- |
| 1 | `git status --short` | clean |
| 2 | `git branch --show-current` | `main` |
| 3 | `git remote -v` | `origin https://github.com/tharcyn/arch-engine.git` |
| 4 | `git log --oneline -n 20` | latest commit `ff924b5 feat: extract architecture governance protocol into standalone ecosystem surface` |
| 5 | `git tag --sort=-creatordate \| head -20` | `v1.0.0`, `v1.0.0-rc.3`, `v1.0.0-rc.1`, `v0.1.0-preview`, `v0.1.0-preview-patch1` |
| 6 | `git fetch origin --tags` | up-to-date |
| 7 | `git rev-list --count HEAD..origin/main` | `0` |
| 8 | `git rev-list --count origin/main..HEAD` | `53` |
| 9 | `git rev-list --count v1.0.0..HEAD` | `66` |
| 10 | `git show v1.0.0 --stat --no-patch` | tag points at `84215b4 chore: launch surface polish` |
| 11 | `node -e "..." (package metadata)` | name `arch-engine`, version `1.0.0`, private, 11 workspaces, bin `arch-engine`, deps: `semver` |
| 12 | `npm config get registry` | `https://registry.npmjs.org/` |
| 13 | `npm whoami` | `tharcyn` |
| 14 | `npm view arch-engine` | 404 (private) |
| 15 | `npm view @arch-engine/cli` | latest `1.0.0`, rc `1.0.0-rc.3` |
| 16 | `npm view @arch-engine/core` | latest `1.0.0`, exports `.`, `./analysis`, `./parsers` |
| 17 | `npm view @arch-engine/schema` | latest `1.0.0` |
| 18 | `npm view @arch-engine/governance-pack-rest-contract` | latest `1.0.0` |
| 19 | `npm view @arch-engine/governance-pack-authority` | latest `1.0.0` |
| 20 | `npm view @arch-engine/governance-pack-journey` | latest `1.0.0` |
| 21 | `npm view @arch-engine/adapter-monorepo` | latest `1.0.0` |
| 22 | `npm view @arch-engine/adapter-shared` | 404 (private) |
| 23 | `npm view @arch-engine/adapter-github` | 404 (private) |
| 24 | `npm view @arch-engine/adapter-gitlab` | 404 (private) |
| 25 | `npm view @arch-engine/adapter-conformance` | 404 (private) |
| 26 | `find . -maxdepth 2 -type f` | full root inventory; 8 RC `.tgz` artifacts present |
| 27 | `ls packages/ \| wc -l` | 53 |
| 28 | `node packages/cli/dist/bin.js --help` | 7 commands locally (post-1.0 rebuild) |
| 29 | `node packages/cli/dist/bin.js --version` | `arch-engine/1.0.0 darwin-arm64 node-v25.2.1` |
| 30 | `node packages/cli/dist/bin.js doctor` | pass |
| 31 | `node packages/cli/dist/bin.js inspect` | pass |
| 32 | `node packages/cli/dist/bin.js analyze` | **fail** — `Fatal: edges is not iterable` |
| 33 | `node packages/cli/dist/bin.js check` | **fail** — `Topology extraction failed: edges is not iterable` |
| 34 | `node packages/cli/dist/bin.js explain TARGET` | **fail** — `Fatal: edges is not iterable` |
| 35 | `(cd examples/sample-monorepo && node ../../packages/cli/dist/bin.js doctor)` | pass; auto-creates `.arch-engine/session.json` (cleaned up) |
| 36 | `(cd examples/sample-monorepo && node ../../packages/cli/dist/bin.js analyze)` | fail (same defect) |
| 37 | `npm run typecheck` | pass (misleading — root tsconfig has empty `files`) |
| 38 | `npx tsc -p packages/cli/tsconfig.json --noEmit` | **fail** — hundreds of errors; missing modules and bad arities |
| 39 | `npm test` | 1881 / 1890 tests pass; 21 / 662 files fail |
| 40 | `npm pack --dry-run` | **fail** — prepack runs build; tsup cannot resolve `@arch-engine/sdk` |
| 41 | `mktemp -d -t arch-engine-public-smoke` + `npm install @arch-engine/cli@1.0.0` | 13 packages installed, 7 s |
| 42 | `npx arch-engine --help` (public) | 5 commands |
| 43 | `npx arch-engine --version` (public) | `arch-engine/1.0.0-rc.3 ...` (binary version drift) |
| 44 | `npx arch-engine doctor` (public, no adapter) | fail — `requires @arch-engine/adapter-monorepo` |
| 45 | `npm install @arch-engine/adapter-monorepo@1.0.0` (public) | pass |
| 46 | `npx arch-engine doctor` (public, with adapter) | pass |
| 47 | `npx arch-engine analyze / check` (public) | **fail** — `edges is not iterable` |
| 48 | `rm -rf "$TMPDIR"` | clean |
| 49 | `grep -RE "@agp/\|@arch-governance/" --include="*.md" --include="*.ts" --include="*.json" .` | 0 matches |
| 50 | `npm view @arch-governance/architecture-profile` | latest `0.1.0`, exports `.`, license Apache-2.0, repo `agp-protocol/agp` |
| 51 | `npm view @arch-governance/runtime` | latest `1.7.0`, exports `.`, license Apache-2.0 |
| 52 | tempdir install of `@arch-governance/architecture-profile@0.1.0` + import probe | `PROFILE_VERSION === "agp_architecture_profile.v0.1"`, exposes `evaluate*Pipeline`, `evaluate*Contract`, error-code constants |

---

## 18. Appendix B — Public Surface Snapshot

### Root `package.json` (relevant fields)

```json
{
  "name": "arch-engine",
  "version": "1.0.0",
  "private": true,
  "homepage": "https://arch-engine.dev",
  "license": "MIT",
  "repository": { "type": "git", "url": "https://github.com/tharcyn/arch-engine.git" },
  "bugs": { "url": "https://github.com/tharcyn/arch-engine/issues" },
  "engines": { "node": ">=20.0.0" },
  "bin": { "arch-engine": "./packages/cli/dist/bin.js" },
  "workspaces": [
    "packages/schema", "packages/core", "packages/cli",
    "packages/governance-pack-rest-contract",
    "packages/governance-pack-authority",
    "packages/governance-pack-journey",
    "packages/adapter-monorepo",
    "packages/adapters/shared", "packages/adapters/conformance",
    "packages/adapters/github", "packages/adapters/gitlab"
  ],
  "scripts": {
    "build": "npm run build --workspaces && cd action && npm run build",
    "prepack": "npm run build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit --project tsconfig.json"
  },
  "dependencies": { "semver": "^7.7.4" },
  "devDependencies": { "@types/node": "^22.0.0", "ajv": "^8.18.0", "tsup": "^8.5.1", "typescript": "^5.7.0", "vitest": "^3.1.0" }
}
```

### Published `@arch-engine/cli@1.0.0` (npm registry)

```json
{
  "name": "@arch-engine/cli",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "engines": { "node": ">=18.0.0" },
  "bin": { "arch-engine": "dist/bin.js" },
  "exports": { ".": "./dist/bin.js" },
  "dependencies": {
    "@arch-engine/core": "^1.0.0",
    "@arch-engine/schema": "^1.0.0",
    "cac": "^6.7.14",
    "picocolors": "^1.0.0",
    "cli-table3": "^0.6.3",
    "yaml": "^2.3.4"
  },
  "peerDependencies": { "@arch-engine/adapter-monorepo": "^1.0.0" },
  "peerDependenciesMeta": { "@arch-engine/adapter-monorepo": { "optional": true } },
  "files": ["dist", "README.md", "LICENSE"]
}
```

### Published `@arch-engine/core@1.0.0` exports

```
.            → { types: ./dist/index.d.ts, import: ./dist/index.js, require: ./dist/index.cjs }
./analysis   → { types: ./dist/analysis.d.ts, import: ./dist/analysis.js, require: ./dist/analysis.cjs }
./parsers    → { types: ./dist/parsers.d.ts, import: ./dist/parsers.js, require: ./dist/parsers.cjs }
```

### Published v1.0.0 CLI help (verbatim, from public install)

```
arch-engine/1.0.0-rc.3

Usage:
  $ arch-engine <command> [options]

Commands:
  doctor            Diagnose environment readiness and existing adapter usage
  inspect           Output canonical topology summary without executing violations
  analyze           Emit stability score, conflict ratios, and blast radius summary
  check             Execute architecture pipeline and evaluate boundaries
  explain <target>  Explain WHY a violation occurred or HOW confidence propagated

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
```

### `@arch-governance/architecture-profile@0.1.0` (published 2026-05-04)

```
PROFILE_VERSION = "agp_architecture_profile.v0.1"

evaluateArchitectureArtifactPipeline      = evaluateDatasetPipeline
evaluateAgentMutationBoundaryPipeline     = evaluateDatasetMutationPipeline
evaluateActorAuthorityPipeline            = evaluateDatasetCapabilityPipeline
evaluateTopologySnapshotPipeline          = evaluateDatasetSnapshotPipeline
evaluateArchitectureFederationPipeline    = evaluateDatasetFederationPipeline
evaluateArchitectureTrustPolicyPipeline   = evaluateDatasetTrustPolicyPipeline
evaluateAuthorityDelegationContractV1     = evaluateCapabilityContractV2
evaluateArchitectureLifecycleContractV1   = evaluateDatasetLifecycleContractV1
evaluateArchitectureReleaseContractV1     = evaluateDatasetReleaseContractV1
evaluateTopologySnapshotContractV1        = evaluateSnapshotContractV1
evaluateClosureGraphHashBindingContractV1 = evaluateSnapshotHashBindingContractV1
evaluateProducerAttestationContractV1     = evaluateSnapshotSignatureContractV1
evaluateProducerKeyRegistryContractV1     = evaluateKeyRegistryContractV1

Records (type aliases):
  TopologySnapshotRecord            (= SnapshotRecord)
  ArchitectureFederationParticipantRecord
  AuthorityDelegationRecord         (= CapabilityDelegationRecord)
  ArchitectureLifecycleTransitionRecord
  ClosureGraphHashBindingRecord
  ProducerAttestationRecord
  ProducerKeyRegistryRecord

License: Apache-2.0
Repo:    agp-protocol/agp
```

---

*End of audit.*
