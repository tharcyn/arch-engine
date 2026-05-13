# Arch-Engine README Commercial Positioning Audit

## 1. Executive Verdict

**`README_COMMERCIAL_POSITIONING_READY`**

The root `README.md` has been rewritten end-to-end to lead with **product value** (catch architecture drift before merge), explain the **outcome** (deterministic CI evidence + AGP roadmap) before the implementation, and accurately reflect the **shipped status** of every package — public stable, public preview, and private experimental — without overclaiming AGP. Quickstart is accurate against `cli@1.4.0`. All linked docs exist; all flags work end-to-end. No source / runtime / package changes.

## 2. Scope

Documentation and positioning pass on `README.md` (the GitHub landing page). No runtime, package, source, or version changes. One new audit file under `audits/`.

## 3. Main Positioning Change

| Aspect | Before | After |
| --- | --- | --- |
| Hero line | "Architecture governance runtime for real codebases." | "**Catch architecture drift before merge.**" (matches the tagline already shipped in `arch-engine --help`) |
| What it is | "extracts structural relationships … enables enforcement of architectural rules via policy packs — automatically, deterministically." | "deterministic architecture evidence engine … extracts workspace topology … surfaces structural drift in CI … evolving toward verifiable AGP evidence bundles." |
| Pipeline | `Code → Graph Extraction → Capability Adapters → Policy Packs → Diagnostics` (internal vocabulary) | `repo → deterministic topology → drift report → CI evidence → AGP bundle` (outcome vocabulary) |
| AGP messaging | "AGP integration (upcoming) … Arch-Engine v1.0.x does not yet emit AGP records … AGP emitter integration is planned" | A full **AGP evidence track** section: status (private/experimental), bundle shape, design properties, real-repo trial evidence (24/24, 60/60, 9/9), pointer to the next mission (CLI integration spec) |
| Comparison framing | "Operates on … Purpose" — sets Arch-Engine *against* ESLint / OPA / Bazel | "Main job … What Arch-Engine adds" — sets Arch-Engine *complementary* to ESLint / Nx-Turborepo / dependency-cruiser / OPA / Bazel |
| Jargon early in document | "authority crossings", "federation overlays", "closureGraphHash", "capability adapters" appear in lines 1–60 | Removed from the first 100 lines; kept in deeper docs links for readers who want them |

## 4. Sections Rewritten

| # | Section | Status |
| --- | --- | --- |
| 1 | Hero | rewritten |
| 2 | Why this exists | new |
| 3 | What it does today | new (replaces ambient "extracts structural relationships…" intro) |
| 4 | Quickstart | rewritten with full 4-adapter install + JSON v2 + markdown + baseline drift |
| 5 | CI workflow | rewritten, table format, all 4 GitHub Actions templates |
| 6 | AGP evidence track | new (replaces "AGP integration (upcoming)") — includes real trial evidence table |
| 7 | Use cases | new |
| 8 | How Arch-Engine differs | rewritten, expanded to 5 tools, complementary framing |
| 9 | Current maturity | new (Stable / Preview / Experimental) |
| 10 | Packages | restructured into Public / Private-experimental |
| 11 | Out of scope today | refreshed and trimmed |
| 12 | Upcoming | new (replaces vague "Status" footer) |
| 13 | Examples | preserved, slimmed |
| 14 | Documentation | preserved, refreshed with AGP and v1.4.0 entries |
| 15 | Status | shortened |

Removed entirely:
- "Provider Adapter Architecture (preview, not yet released)" — internal note about unreleased GitHub/GitLab adapters; was confusing on the landing page.
- "Architecture layering" diagram — implementation detail, not landing-page material.
- "Snapshot replay and determinism" — contracted into the hero "deterministic" claim with a docs link.
- "Export surface" — internal package API table; not landing-page material.
- "Repository structure" — derivable from the file tree; not high-signal for a new visitor.

## 5. Claims Added

All claims grounded in shipped status:

- **"Catch architecture drift before merge."** — matches the tagline already in `arch-engine --help` (`packages/cli/dist/bin.js --help`).
- **Three workspace adapters** — npm/yarn-classic, pnpm, Yarn PnP — all installable at the versions stated.
- **Multiple output formats** — confirmed by smoke-test of `inspect --json --json-schema=v2 --output …` and `check --ci --format markdown --output …`.
- **Baseline comparison** — confirmed by `check --baseline <file>` flag presence in `--help`.
- **GitHub Actions templates** — all four `.yml` files present in `examples/github-actions/`.
- **Exit codes** — match the published `check --help` output (`0`, `1`, `2`, `3`, `5`).
- **AGP bundle real-repo trial evidence** — sourced directly from `audits/ARCH_ENGINE_AGP_VERIFIER_REAL_REPO_TRIAL_AUDIT.md`: 24/24 bundles `valid`, 60/60 tamper cases detected, 9/9 determinism replays, 0 path leaks, 0 source mutations, 0 P0/P1/P2/P3 issues.
- **AGP packages are private** — confirmed via `node` script reading `packages/agp-emitter/package.json` and `packages/agp-verifier/package.json` (`private: true`).

## 6. Claims Removed or Softened

| Removed / softened | Why |
| --- | --- |
| "AGP emitter integration is planned as a separate, opt-in package (e.g. `@arch-engine/agp-emitter`)" | The emitter **exists** in this repo. The new section says so honestly. |
| "Arch-Engine v1.0.x does not yet emit AGP records" | We're on v1.4.0, not v1.0.x, and the emitter does exist (private). |
| Provider GitHub / GitLab adapter mention with link to `docs/architecture/adapters.md` | Confusing on landing; the adapters are not part of the published surface. The link stays in the deeper docs index. |
| "Architecture enforcement, boundary governance" — definitive language about Arch-Engine's purpose | Replaced with the more accurate "deterministic architecture evidence engine" — enforcement is *one* use case, not the totality. |
| "closureGraphHash" + "federation overlays" + "registry routing path" in hero/quickstart vicinity | Implementation jargon; moved deep into docs links. |
| All marketing-style claims (none added) | No fake users / stars / companies / benchmarks / SLSA / Sigstore / adoption claims. |

## 7. AGP Status Accuracy

The new "AGP evidence track" section explicitly states:

- **`@arch-engine/agp-emitter@0.1.0`** — `private: true`, not on npm.
- **`@arch-engine/agp-verifier@0.1.0`** — `private: true`, not on npm.
- **Neither is wired into the main `arch-engine` CLI** (no `arch-engine emit-agp`, no `arch-engine verify-agp` exists yet).
- The protocol spec, JSON schemas, and conformance corpus **are** in-tree and stable.
- Public CLI integration is **spec-pending** (next mission), targeting a future `@arch-engine/cli@1.5.0` minor release.

References to `arch-engine emit-agp` / `arch-engine verify-agp` exist in three places in the README — every one is wrapped with a label like "spec-pending", "not yet released", or "Out of scope today". They are positioned as the *next* mission, never as a current capability.

## 8. Commercial Viability Improvements

1. **Outcome before implementation.** The first 15 lines answer "what does this do for me?" instead of "how is it built?".
2. **Use-case framing.** A dedicated "Use cases" section maps Arch-Engine to seven concrete CI / monorepo / release workflows.
3. **Honest maturity ladder.** "Stable / Preview / Experimental" lets a buyer or platform-eng lead pick a depth of integration that matches their risk tolerance.
4. **Quantitative AGP evidence.** Concrete trial numbers (24/24, 60/60, 9/9, 0 leaks) replace vague "planned" language — readers see the protocol is *real* and validated, even when the public surface is not.
5. **Complementary positioning, not combative.** The comparison table positions Arch-Engine alongside ESLint / Nx / Bazel / OPA / dependency-cruiser instead of dunking on them.
6. **No fake adoption signals.** Zero invented users, stars, companies, benchmarks, security certifications, or SLSA / Sigstore badges.
7. **GitHub Actions table** with permission / fork-PR matrix → a platform engineer can decide which template to copy in 30 seconds.
8. **Top tagline matches the binary.** "Catch architecture drift before merge." appears identically in `arch-engine --help` and at the top of the README — consistent voice across documentation surfaces.

## 9. Remaining Deltas

| Severity | Item | Notes |
| --- | --- | --- |
| **BLOCKER** | — | None |
| **HIGH** | — | None |
| **MEDIUM** | — | None |
| **LOW** | No screenshots or animated demo | The mission explicitly forbade inventing screenshots; could be added in a future media pass once the public CLI integration lands. |
| **LOW** | "Examples" table mentions `signed-policy-pack` directory deletion compared to pre-rewrite | The old `signed-policy-pack` example was removed from the examples list because it implied cryptographic enforcement capabilities that are spec-pending. The example directory remains in-repo for those who navigate to it directly. |
| **MICRO** | The AGP section uses the term "spec-pending" | Slightly ambiguous; could be tightened to "design-pending" or "integration-pending" in a future polish. |
| **MICRO** | No demo GIF / asciinema link | Out of scope for this pass. |

No P0/P1/P2/P3 issues. No misleading or unsubstantiated claim ships in the new README.

## 10. Validation / Accuracy Checks

All validated against the live repo at commit `e668703`:

| Check | Result |
| --- | --- |
| Public package versions match README | `cli@1.4.0`, `adapter-monorepo@1.3.1`, `adapter-pnpm@0.1.1`, `adapter-yarn-pnp@0.1.0` — all ✓ |
| Private package boundaries | `agp-emitter@0.1.0 private=true`, `agp-verifier@0.1.0 private=true` — ✓ |
| No `arch-engine emit-agp` / `verify-agp` claimed as existing | All 3 mentions explicitly wrapped with "spec-pending" / "not yet released" / "Out of scope" labels — ✓ |
| Quickstart `inspect --json --json-schema=v2 --output report.json` smoke test | exit 0, valid JSON v2 envelope written ✓ |
| Quickstart `check --ci --format markdown --output report.md` smoke test | exit 0, valid markdown report written ✓ |
| All `docs/*` links exist | 11/11 ✓ |
| All `examples/*` links exist | 6/6 (demo-drift, github-actions, reference-policy-pack, multi-policy-composition, federation-overlay, snapshot-replay-certification) ✓ |
| All `packages/*` links exist | 7/7 (cli, adapter-monorepo, adapter-pnpm, adapter-yarn-pnp, 3 governance packs) ✓ |
| All 4 GitHub Actions templates exist on disk | 4/4 ✓ |
| AGP trial audit referenced exists | `audits/ARCH_ENGINE_AGP_VERIFIER_REAL_REPO_TRIAL_AUDIT.md` ✓ |
| No source / runtime / package changes | confirmed by `git status` (only README + audit changed) ✓ |
| No fake metrics, users, stars, or adoption claims | hand-audited ✓ |
| No fake security / signing / attestation claims | hand-audited ✓ |

## 11. Recommended Next Mission

**`ARCH_ENGINE_AGP_CLI_INTEGRATION_SPEC_PASS`**

Now that the README accurately positions Arch-Engine with the AGP track honestly framed as "private + trial-validated, public CLI spec-pending", the natural next step is to design the public CLI integration surface:

- `arch-engine emit-agp --from <report> --output <dir>`
- `arch-engine verify-agp --bundle <dir>`
- Peer-dependency gating model (mirror the `@arch-engine/adapter-yarn-pnp` lazy-load pattern from `runner-bridge.ts`).
- Exit-code semantics matching the private CLIs' codes.
- `@arch-engine/cli@1.5.0` minor-release pre-flight outline.

Alternate next mission if a marketing / media polish is wanted first: a screenshots-and-asciinema pass to add visuals to the new README without changing copy.

— end —
