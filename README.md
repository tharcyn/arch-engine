# Arch-Engine

[![npm version](https://img.shields.io/npm/v/@arch-engine/cli.svg)](https://www.npmjs.com/package/@arch-engine/cli)
[![Build Status](https://github.com/tharcyn/arch-engine/actions/workflows/test.yml/badge.svg)](https://github.com/tharcyn/arch-engine/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/tharcyn/arch-engine/blob/main/LICENSE)

**Catch architecture drift before merge.**

Arch-Engine is a deterministic architecture evidence engine for JavaScript/TypeScript repositories. It extracts workspace topology from a real repo, surfaces structural drift in CI, and is evolving toward verifiable **AGP evidence bundles** for audit-grade architecture governance.

```text
repo  →  deterministic topology  →  drift report  →  CI evidence  →  AGP bundle
```

> **Safe by design.** Read-only. Offline. Adapters never execute `npm`, `pnpm`, `yarn`, or `.pnp.cjs`. No source mutation. A local `.arch-engine/` cache directory is created on first run.

---

## Why this exists

Architecture drift is **invisible in pull requests**. Workspace boundaries get redrawn, packages quietly start depending on packages they shouldn't, lockfile edits ripple through the graph — and the only signal a reviewer gets is a `package.json` diff that takes ten files of context to interpret.

Arch-Engine turns the structural state of your repository into a **deterministic, diffable artifact**: a topology report you can post on every PR, gate CI on, store as evidence, and (with the upcoming AGP track) independently verify.

---

## What it does today

- **Extracts deterministic workspace topology** from real repos — packages, dependency edges, workspace boundaries.
- **Three workspace adapters**, all read-only:
  - `@arch-engine/adapter-monorepo` — npm / yarn-classic workspaces + single-package fallback.
  - `@arch-engine/adapter-pnpm` — `pnpm-workspace.yaml`, `workspace:*` protocols.
  - `@arch-engine/adapter-yarn-pnp` — Yarn Berry / Plug'n'Play (preview MVP).
- **Multiple output formats:** human, JSON v1/v2, markdown.
- **Baseline comparison:** diff this PR's topology against `main` and surface what changed.
- **GitHub Actions templates** for PR markdown reports and sticky drift comments.
- **Exit codes that drive CI:** `0` clean, `1` blocking violation, `2` invalid input, `3` adapter failure, `5` internal invariant.
- **Offline. Hermetic.** No network calls. No package-manager execution. No source mutation.

---

## Quickstart

Install the CLI alongside the adapter(s) for your workspace shape:

```bash
# Pick the adapter(s) that match your repo. Installing all three is safe;
# the CLI picks the one with highest detection confidence.
npm install --save-dev \
  @arch-engine/cli@1.4.0 \
  @arch-engine/adapter-monorepo@1.3.1 \
  @arch-engine/adapter-pnpm@0.1.1 \
  @arch-engine/adapter-yarn-pnp@0.1.0
```

Then walk the five commands:

```bash
npx arch-engine doctor    # workspace readiness + adapter signal
npx arch-engine inspect   # extracted topology summary
npx arch-engine analyze   # signal / risk scoring (informational)
npx arch-engine check     # policy enforcement (CI-gating)
npx arch-engine explain   # human-readable reasoning for any target
```

**JSON output for CI / tooling:**

```bash
npx arch-engine inspect --json --json-schema=v2 --output arch-engine-report.json
```

**Markdown for PR reports:**

```bash
npx arch-engine check --ci --format markdown --output arch-engine-report.md
```

**Baseline drift report:**

```bash
# 1) Generate baseline from your default branch.
npx arch-engine check --ci --json --json-schema=v2 --output arch-engine-baseline.json

# 2) On a PR, diff this branch against the baseline.
npx arch-engine check --ci --baseline arch-engine-baseline.json \
  --format markdown --output arch-engine-report.md
```

**First-run expectations**
- A `.arch-engine/` cache directory is created in the repo root (small JSON files; safe to `.gitignore`).
- No source files are modified.
- No package manager is invoked by any adapter.

---

## CI workflow

Arch-Engine ships ready-to-copy GitHub Actions workflow templates that post a deterministic architecture report on every pull request — either as a downloadable artifact (safe on every PR, even from forks) or as a sticky PR comment that updates in place.

| Template | What it does | Works on fork PRs? |
| --- | --- | --- |
| `arch-engine-pr-report.yml` | Markdown report uploaded as build artifact. | Yes |
| `arch-engine-pr-comment.yml` | Sticky PR comment + artifact. | Artifact on every PR; comment on internal PRs only. |
| `arch-engine-pr-baseline-report.yml` | Diff vs base branch; drift-aware report as artifact. | Yes |
| `arch-engine-pr-baseline-comment.yml` | Drift sticky comment + artifact. | Same as above. |

```bash
# Drop a template into your repo:
curl -fsSL https://raw.githubusercontent.com/tharcyn/arch-engine/main/examples/github-actions/arch-engine-pr-baseline-report.yml \
  -o .github/workflows/arch-engine-pr-baseline-report.yml
```

All four templates fail the job (`exit 1`) on a blocking violation, so they slot into branch-protection required checks directly. See [`examples/github-actions/`](examples/github-actions/) for permissions, fork limitations, and troubleshooting.

---

## AGP evidence track

**AGP** (*Architecture Governance Protocol*) is the next-generation evidence format Arch-Engine is evolving toward: a canonical, content-addressed, independently verifiable bundle of architecture facts.

> **Status: private / experimental.** Two workspace packages — `@arch-engine/agp-emitter` and `@arch-engine/agp-verifier` — exist in this repo as `private: true`, are **not** published to npm, and are **not** wired into the main `arch-engine` CLI yet. They are evolving behind real-repo trials before a public surface lands.

A bundle is just two files on disk:

```text
agp/
  snapshot.json          ← manifest + counts + snapshotDigest
  records.ndjson         ← sorted record stream, one record per line
```

Designed to be:

- **Deterministic** — same input → byte-identical output, byte-identical digest.
- **Schema-valid** — every record validates against the [v1 JSON Schemas](docs/agp/schemas/v1/).
- **Hash-linked** — every record carries a `b3:<64-hex>` BLAKE3 payload hash; the snapshot carries a `sha256:<64-hex>` digest projection.
- **Independently verifiable** — the verifier never trusts the emitter; it recomputes every hash from the canonical projection.
- **CI / release-evidence-ready** — small, diffable, archivable.

**Real-repo trial evidence (private verifier trial):**

| Signal | Result |
| --- | --- |
| Bundles verified across 8 real OSS repos × 3 commands | **24 / 24 `valid`** |
| Controlled tamper cases detected (10 tamper classes) | **60 / 60 detected, correct verdict + correct issue code** |
| Determinism replays | **9 / 9 byte-identical** |
| Path-leak issues across 4 705 records | **0** |
| Tracked-file mutations in 8 cloned repos | **0** |
| P0/P1/P2/P3 issues | **0** |

Full audit: [`audits/ARCH_ENGINE_AGP_VERIFIER_REAL_REPO_TRIAL_AUDIT.md`](audits/ARCH_ENGINE_AGP_VERIFIER_REAL_REPO_TRIAL_AUDIT.md).

The next mission is the **public CLI integration spec** (`arch-engine emit-agp` / `arch-engine verify-agp`) targeting a future `@arch-engine/cli@1.5.0` minor release. The protocol itself ([spec](docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md), [schemas](docs/agp/schemas/v1/), [conformance corpus](docs/agp/conformance/v1/)) is in-tree and stable.

---

## Use cases

- **PR architecture drift reports** — every PR carries a markdown diff of what changed structurally.
- **Monorepo boundary checks** — workspace edges classified by kind (`dependency`, `devDependency`, `peerDependency`).
- **Package graph visibility** — packages, edges, protocols (`workspace:`, `portal:`, `link:`) in one deterministic report.
- **CI-gated architecture policies** — composable governance packs that escalate severity and chain provenance.
- **Baseline comparison across branches** — surface added / removed / changed edges and new violations.
- **Architecture evidence for release / audit workflows** — JSON v2 artifacts you can attach to releases today; verifiable AGP bundles when the public CLI integration lands.

---

## How Arch-Engine differs

Arch-Engine is **complementary** to existing tools, not a replacement.

| Tool | Main job | What Arch-Engine adds |
| --- | --- | --- |
| **ESLint** | File / AST rules | Repository-level architecture topology |
| **Nx / Turborepo** | Task graph + build orchestration | Architecture-drift reporting independent of build cache |
| **dependency-cruiser** | Module-level dependency constraints | CI evidence, baseline drift across branches, AGP roadmap |
| **OPA** | General-purpose policy engine | Architecture-specific facts + evidence bundles |
| **Bazel** | Hermetic builds | Architecture evidence layer independent of the build system |

Linters check syntax. Build systems manage output. Arch-Engine governs **structure** — and surfaces structural change in the place it matters: the pull request.

---

## Current maturity

**Stable public surface** (`@arch-engine/cli@1.4.0`):
- `doctor` / `inspect` / `analyze` / `check` / `explain` commands.
- JSON v1 and v2 envelopes; markdown reports; baseline comparison.
- `@arch-engine/adapter-monorepo@1.3.1` (npm / yarn-classic / single-package).
- GitHub Actions PR-report + baseline-drift templates.

**Preview adapters** (`additive, opt-in install`):
- `@arch-engine/adapter-pnpm@0.1.1` — pnpm workspaces.
- `@arch-engine/adapter-yarn-pnp@0.1.0` — Yarn Berry / Plug'n'Play (MVP; never executes `.pnp.cjs`).

**Preview governance packs:**
- `@arch-engine/governance-pack-authority`
- `@arch-engine/governance-pack-rest-contract`
- `@arch-engine/governance-pack-journey`

**Experimental / private** (in-repo, never published):
- `@arch-engine/agp-emitter@0.1.0`
- `@arch-engine/agp-verifier@0.1.0`
- Public CLI integration (`arch-engine emit-agp` / `verify-agp`) is **spec-pending** and not yet released.

---

## Packages

### Public

| Package | Role |
| --- | --- |
| [`@arch-engine/cli@1.4.0`](./packages/cli) | Command-line interface — `doctor`, `inspect`, `analyze`, `check`, `explain`. |
| [`@arch-engine/adapter-monorepo@1.3.1`](./packages/adapter-monorepo) | npm / yarn-classic workspaces + single-package fallback. |
| [`@arch-engine/adapter-pnpm@0.1.1`](./packages/adapter-pnpm) | pnpm workspaces (preview). |
| [`@arch-engine/adapter-yarn-pnp@0.1.0`](./packages/adapter-yarn-pnp) | Yarn Berry / Plug'n'Play (preview MVP). |
| [`@arch-engine/governance-pack-authority`](./packages/governance-pack-authority) | Authority-boundary governance pack. |
| [`@arch-engine/governance-pack-rest-contract`](./packages/governance-pack-rest-contract) | REST contract parity governance pack. |
| [`@arch-engine/governance-pack-journey`](./packages/governance-pack-journey) | Journey-lifecycle governance pack. |
| `@arch-engine/core` / `@arch-engine/schema` | Internal runtime + contracts (pulled in transitively; you rarely depend on them directly). |

### Private / experimental — in-repo only, **never published to npm**

| Package | Role |
| --- | --- |
| `@arch-engine/agp-emitter@0.1.0` *(private)* | Converts a JSON v2 report into a canonical AGP bundle. **Not on npm.** **Not wired into the main CLI.** |
| `@arch-engine/agp-verifier@0.1.0` *(private)* | Independently verifies an AGP bundle. **Not on npm.** **Not wired into the main CLI.** |

---

## Out of scope today

- Production routing enforcement.
- Runtime code execution or source mutation.
- Package-manager invocation (`npm install`, `pnpm install`, `yarn install`) from any adapter.
- Graph-database persistence.
- Public `arch-engine emit-agp` / `arch-engine verify-agp` CLI subcommands.
- Signing / attestation / Sigstore / SLSA / in-toto / DSSE / SPDX / CycloneDX.
- SaaS dashboard.
- Multi-repo federation handshake.

## Upcoming

- AGP CLI integration spec (`emit-agp` / `verify-agp` subcommand surface).
- `@arch-engine/cli@1.5.0` minor release wiring AGP integration via lazy peer-dependency loading (same pattern as `@arch-engine/adapter-yarn-pnp`).
- AGP repo extraction once the protocol surface is battle-tested via CLI integration.

---

## Examples

| Example | Demonstrates |
| --- | --- |
| [demo-drift](examples/demo-drift/) | Tiny topology fixture for a 60-second CLI walkthrough. |
| [GitHub Actions templates](examples/github-actions/) | Four PR-report templates (current state + baseline drift). |
| [Reference Policy Pack](examples/reference-policy-pack/) | Canonical topology specimen + authority-tier enforcement. |
| [Multi-Policy Composition](examples/multi-policy-composition/) | Severity escalation + provenance chains across packs. |
| [Federation Overlay](examples/federation-overlay/) | Cross-registry composition + closure-hash parity. |
| [Snapshot Replay Certification](examples/snapshot-replay-certification/) | Deterministic hash reproducibility + execution identity. |

---

## Documentation

| Document | Scope |
| --- | --- |
| [CLI Surface Contract](docs/cli-surface-contract.md) | Command semantics, exit codes, output format. |
| [CLI Experience Spec](docs/cli/cli-experience-spec.md) | First-run path, error language, ergonomics. |
| [Baseline Comparison Spec](docs/cli/baseline-comparison-spec.md) | `--baseline` semantics + drift report format. |
| [Execution Model](docs/execution-model.md) | Runtime lifecycle, adapter resolution, policy evaluation. |
| [Capability Model](docs/capability-model.md) | Adapter architecture + signal enrichment. |
| [Policy Pack Contract](docs/policy-pack-contract.md) | Pack structure, composition, severity. |
| [Determinism Contract](docs/determinism-contract.md) | Hash stability + snapshot replay guarantees. |
| [Ecosystem Positioning](docs/ecosystem-positioning.md) | Relationship to ESLint / Nx / OPA / Bazel. |
| [AGP Bundle and Emitter MVP Spec](docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md) | Canonical bundle format, hashing, verification model. |
| [AGP v1 JSON Schemas](docs/agp/schemas/v1/) | Schema-level contract for every record family. |
| [AGP v1 Conformance Corpus](docs/agp/conformance/v1/) | Valid + invalid fixture corpus. |
| [Release notes — v1.4.0](docs/releases/v1.4.0.md) | Latest stable release details. |
| [AGP Verifier real-repo trial](audits/ARCH_ENGINE_AGP_VERIFIER_REAL_REPO_TRIAL_AUDIT.md) | Full evidence for the AGP track. |

---

## Status

Arch-Engine follows semantic versioning. v1.x releases maintain CLI compatibility across adapters and governance packs. Preview adapters and the AGP evidence track are additive — installing them is opt-in and never alters the stable v1.x command surface.

## License

[MIT](LICENSE)
