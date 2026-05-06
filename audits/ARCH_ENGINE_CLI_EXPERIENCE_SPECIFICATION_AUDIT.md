# Arch-Engine CLI Experience Specification Audit

**Audit date:** 2026-05-06
**Auditor:** Claude Opus 4.7 (1M context), spec-only design pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**HEAD:** `351365c` (`docs(agp): add emitter contract specification`)
**Tag:** `arch-engine-v1.0.1` at `1dd2f26`
**Predecessor specs:**
- [docs/contracts/cli-surface-contract.md](../docs/contracts/cli-surface-contract.md)
- [docs/contracts/agp-emitter-contract.md](../docs/contracts/agp-emitter-contract.md)
- [docs/contracts/determinism-contract.md](../docs/contracts/determinism-contract.md)
- [docs/contracts/public-surface-contract.md](../docs/contracts/public-surface-contract.md)
- [docs/cli/cli-readiness-matrix.md](../docs/cli/cli-readiness-matrix.md)

**Predecessor audits:**
- [audits/ARCH_ENGINE_V1_REPO_AND_AGP_EMITTER_READINESS_AUDIT.md](./ARCH_ENGINE_V1_REPO_AND_AGP_EMITTER_READINESS_AUDIT.md)
- [audits/ARCH_ENGINE_V1_0_1_PUBLIC_CONTRACT_STABILIZATION_AUDIT.md](./ARCH_ENGINE_V1_0_1_PUBLIC_CONTRACT_STABILIZATION_AUDIT.md)
- [audits/ARCH_ENGINE_V1_0_1_EXPORT_FREEZE_REPAIR_AUDIT.md](./ARCH_ENGINE_V1_0_1_EXPORT_FREEZE_REPAIR_AUDIT.md)
- [audits/release/ARCH_ENGINE_V1_0_1_PATCH_RELEASE_PREFLIGHT.md](./release/ARCH_ENGINE_V1_0_1_PATCH_RELEASE_PREFLIGHT.md)
- [audits/ARCH_ENGINE_AGP_EMITTER_CONTRACT_SPECIFICATION_AUDIT.md](./ARCH_ENGINE_AGP_EMITTER_CONTRACT_SPECIFICATION_AUDIT.md)

---

## 1. Executive Verdict

**`CLI_EXPERIENCE_SPEC_READY_FOR_IMPLEMENTATION`**

The specification pinpoints concrete UX bugs in the v1.0.1 CLI (most importantly the `Stability Score: CRITICAL (0.47)` headline that fires on healthy fixtures with no policy file), defines a 12-principle UX contract, gives byte-shape examples for every command's human and JSON output, defines a single demo "drift detected" output suitable for screenshots and the README, and lists 13 v1.0.x-patch-safe acceptance criteria plus 5 v1.1 minor-release additive criteria. The spec preserves the v1.0.1 frozen public command surface exactly: five commands, identical names, identical install path, no AGP dependency, no version-bumping in this pass.

The next implementation pass — **"Arch-Engine CLI Experience MVP Implementation Pass"** — can begin immediately under §16.1 of the spec. No human-decision gate is required, although the JSON envelope question (Path A vs. Path B in spec §14.1) is flagged as a deliberate design choice the implementation pass should ratify before writing tests.

This pass produced **two documentation files**, no code, no dependency, no version change, no CLI behavior change, no published artifact, no tag, no commit.

---

## 2. Scope

Specification only. **No implementation.**

- No CLI source modified (`packages/cli/src/**` untouched).
- No core source modified (`packages/core/src/**` untouched).
- No `package.json` modified, no `package-lock.json` modified.
- No `@arch-governance/runtime` or `@arch-governance/architecture-profile` added as a dependency anywhere.
- No public CLI flag added.
- No freeze snapshot updated.
- No npm publish.
- No git tag.
- No git commit.
- No README rewrite (mission rule).
- No new packages.

The single product deliverable is `docs/cli/cli-experience-spec.md`, plus this audit.

---

## 3. Repository State

| Field | Value |
| --- | --- |
| Branch | `main` |
| Working tree (pre-pass) | clean |
| HEAD | `351365c docs(agp): add emitter contract specification` |
| Tag at v1.0.1 | `arch-engine-v1.0.1` (`1dd2f26`) |
| origin/main | in sync |
| Public-surface freeze | green (357 freeze tests pass; full suite 1890/1890) |

Working tree post-pass: only the two new doc files are added; no source change, no manifest change.

---

## 4. Current CLI Output Reviewed

CLI rebuilt from source (`npm run build` → success) and exercised against `examples/sample-monorepo` (a tempdir copy, cleaned up):

| Command | Human-mode output (summary) | `--json` shape | Exit |
| --- | --- | --- | --- |
| `--help` | `cac` default; lists 5 commands + global options; **no examples, no exit-code reference, no docs link** | n/a | 0 |
| `--version` | `arch-engine/1.0.1 darwin-arm64 node-v25.2.1` ✓ | n/a | 0 |
| `doctor` | echoes `arch-engine doctor` on line 1; prints **hardcoded `Arch Engine CLI v1.0.0`** and **`Schema runtime v1.0.0`** strings; ✔ list of workspace facts; ends `⚠ No policy file detected` with a soft hint | flat object: `environment`, `extractionMode`, `topologyConfidence`, `domainDistribution`, `domainIntegrity`, `warnings`, `autoInitialized`, `hasPolicyFile` | 0 |
| `inspect` | structured table of counts; "Domain Distribution"; "Adapters active: adapter-monorepo" | flat object: `nodes`, `edges`, `crossings`, …, `adaptersActive` | 0 |
| `analyze` | **`Stability Score: CRITICAL (0.47)`** on a healthy 4-package fixture; writes artifact at absolute tempdir path | flat object: `score`, `classification`, `stabilityTier`, `components`, `blast_radius`, `executionMetrics` | 0 |
| `check` | identical "CRITICAL" classification *and* `✔ Verification complete. No blocking violations.` in the same screen — **contradictory**; absolute artifact path | flat object: `score`, `classification`, `stabilityTier`, `blockerCrossings`, `artifactPath` (absolute) | 0 |
| `explain regression` | `✔ No regression detected` (succinct; ok) | `regressionSeverity: null, regressionConfidence: null, regression: null, ...` — **80% null fields** | 0 |
| (no command) | `cac`-default error + help | n/a | 1 |
| `arch-engine gibberish` | error + help | n/a | 1 |

JSON outputs are populated and structured but **lack a top-level envelope**: no `command`, no `version`, no `status`, no `exitCode`, no `summary`, no `nextActions`, no `artifacts` array. The artifact path appears as an absolute system path inside the JSON payload.

All five commands exit `0` on the happy path. Even `analyze` returning `CRITICAL` exits `0` (correct under §9 of the spec; informational).

---

## 5. Main UX Problems Found

Numbered for cross-reference from the spec:

| # | Problem | Severity | Spec §reference |
| --- | --- | --- | --- |
| U1 | `Stability Score: CRITICAL (0.47)` on a healthy no-policy fixture | **highest** | §5.3 (analyze headline must use `low-information` tier when no policy is present); §16.1 #3 |
| U2 | Hardcoded `Arch Engine CLI v1.0.0` and `Schema runtime v1.0.0` strings inside `doctor` output | high | §5.1 banned list; §16.1 #2 |
| U3 | `check` shows `CRITICAL` and `No blocking violations` in the same screen | high | §5.4 banned list; §16.1 #4 |
| U4 | `doctor` echoes the literal `arch-engine doctor` on line 1 | medium | §5.1 banned list; §16.1 #1 |
| U5 | No "next step" sentence in any command's human output | medium | §5 (every command requires a single `Next:` / `Fix:` / `Exit N:` final line); §16.1 #5 |
| U6 | Heavy jargon ("authority crossings", "extraction mode", "topology confidence", "trust-weighted confidence") in default human output | medium | §6 style guide; §4 P1 |
| U7 | Domain distribution shows `25% UNCLASSIFIED` with no remediation hint | medium | §6.13 (unknown-domain hint format) |
| U8 | Absolute paths leak in `artifactPath` JSON and human output | medium | §6.16, §7.1 (separate `relativePath`/`absolutePath`); §16.1 #7 |
| U9 | JSON outputs lack a top-level envelope | medium | §7.1 (envelope contract); §16.1 #6 + §14.1 |
| U10 | `explain regression --json` returns mostly `null` keys | medium | §5.5 banned list; §16.1 #8 |
| U11 | Per-command `--help` is bare: no examples, no exit codes, no docs link | medium | §16.1 #9 |
| U12 | No documented `explain <target>` vocabulary in `--help` | medium | §5.5 vocabulary table; §13.1 patch-safe scope |
| U13 | No `--ci`, `--format`, `--output`, `--verbose`, `--quiet` flags | low (needed for v1.1 not v1.0.x) | §11.4, §13.2, §16.2 |
| U14 | No demo-worthy "drift detected" output to screenshot | low (not blocking, but blocks marketing) | §12 (`examples/demo-drift/` fixture); §16.1 #10 |
| U15 | Internal stack traces would be visible by default if anything threw (current `Fatal: …` line in `cli.ts`) | low | §8.5 (stack traces off by default) |

The single problem that matters most for first-impression product quality is **U1**: a healthy repo being labelled `CRITICAL` because the score collapses under "no policy" conditions. Everything else is texture; this one is a credibility risk.

---

## 6. Specification Created

**File:** [`docs/cli/cli-experience-spec.md`](../docs/cli/cli-experience-spec.md)

**Size:** ~1280 lines, specification-grade.

**Sections (16 total, matching the mission template):**

1. **Status** — Draft v0.1, target v1.0.x for non-breaking, v1.1 for additive.
2. **Product Promise** — single-sentence anchor: *"Arch-Engine catches architecture drift before merge."*
3. **Current CLI Surface (v1.0.1)** — frozen 5-command surface, observed v1.0.1 baseline.
4. **CLI Experience Principles** — 12 principles (P1–P12), each with a single sentence and rationale.
5. **Command Contracts** — `doctor`, `inspect`, `analyze`, `check`, `explain` each with: purpose, must-answer, ideal sections, three example outputs covering happy / fix / first-run / unknown-target / pass-with-warnings / blocked, banned patterns, exit-code policy.
6. **Human Output Style Guide** — 16 sub-sections covering headings, status symbols, emoji policy (none), color, tables, line length, path formatting, plural grammar, confidence display, score display, missing-policy display, no-violations display, unknown-domain display, low-signal display, CI mode, artifact-path display.
7. **JSON Output Contract** — top-level envelope with `schemaVersion`, `command`, `version`, `emittedAt`, `status`, `exitCode`, `summary`, `data`, `artifacts`, `diagnostics`, `nextActions`. Per-command `data` shape with examples. Forbidden patterns enumerated.
8. **Error Language Contract** — 11-row error envelope (`code`, `title`, `message`, `cause`, `fix`, `severity`, `exitCode`, `ciBlocking`, `docsHint`); 11 `ARCH_ENGINE_*` codes with severity/exit/meaning; tone rules; stack-trace policy.
9. **Exit Code Contract** — 6 stable codes (0–5); current v1.0.1 behavior; migration plan distinguishing patch-safe additive changes from v1.1 breakings.
10. **First-Run Onboarding Flow** — six-step ideal journey; ten scenario subsections (no-policy, single-package, monorepo, no-adapter, low-signal, unknown domains, no edges, no violations, invalid config, init-as-v1.1+).
11. **CI Usage Model** — `check` as primary CI command; PR log output; machine output; future `--ci` / `--format` / `--output` / `--baseline` / `--upload` flags table; constraints (no interactive prompts, deterministic).
12. **Demo Output Target** — single canonical "drift detected" output suitable for README/landing page/sales demo; reproducible from `examples/demo-drift/` fixture. Three variants (Pass, Pass with warnings, multi-violation).
13. **v1.0.x Compatibility Rules** — what stays frozen; classification of patch-safe vs. v1.1 candidate vs. deferred.
14. **v1.1 Candidate Improvements (consolidated)** — 9-row table; the JSON envelope Path A vs. Path B decision flagged.
15. **Deferred / Non-Goals** — explicit anti-list (dashboard, SaaS, registry, federation, multi-language, auto-fix, telemetry, plugin system, env-var config).
16. **Acceptance Criteria for Implementation Pass** — 13 v1.0.x-patch criteria + 5 v1.1 criteria; each with a verifiable artifact.

---

## 7. Compatibility Decision

The spec preserves v1.0.1 byte-for-byte:

- **Five commands stay** (`doctor`, `inspect`, `analyze`, `check`, `explain`). Names, semantics, exit-code intent unchanged.
- **Install path stays** (`npm install --save-dev @arch-engine/cli @arch-engine/adapter-monorepo`).
- **Package identity stays** — `@arch-engine/cli`, `@arch-engine/core`, `@arch-engine/adapter-monorepo`, three governance packs.
- **No default AGP output.** AGP integration is opt-in via a future `--emit-agp` flag.
- **No required AGP dependency** in any v1.0.x package.
- **JSON envelope addition is opt-in** via `--json-schema=v2` (Path B in §14.1) — the existing `--json` shape stays the default through the v1.x line.
- **Exit-code migrations** distinguish additive (patch-safe) changes from breaking ones (v1.1+ only).

In short: every behavioral fix in §16.1 is shippable in a v1.0.2 patch; every new flag or command is a v1.1 addition.

---

## 8. Recommended Implementation Order

Phased so each phase is independently shippable. Each phase ends with a release artifact.

| Phase | Title | Releases | Spec criteria |
| --- | --- | --- | --- |
| **A** | Output grammar cleanup — fix the four contradictory v1.0.1 outputs | v1.0.2 | §16.1 #1, #2, #3, #4 |
| **B** | First-run guidance + next-action policy | v1.0.2 | §16.1 #5, plus §10 onboarding scenarios |
| **C** | Per-command `--help` enrichment + `explain` target vocabulary | v1.0.2 or v1.0.3 | §16.1 #9 |
| **D** | JSON contract hardening — additive keys + path normalization | v1.0.3 | §16.1 #6 (envelope behind `--json-schema=v2`), #7, #8 |
| **E** | Error language refit — `ARCH_ENGINE_*` codes, `Fix:` lines, no stack traces by default | v1.0.3 | §8 vocabulary, §16.1 #5 |
| **F** | Demo fixture + screenshot reproducibility | v1.0.3 | §16.1 #10 |
| **G** | `examples/demo-drift/` lands; README adopts the canonical screenshot | v1.0.3 (docs-only follow-up) | §12 |
| **H** | v1.1 additive flags: `--ci`, `--format`, `--output`, `--verbose`, `--quiet`, `init` | v1.1.0 | §16.2 #14, #15 |
| **I** | AGP emitter package + `--emit-agp` flag | v1.1.0 (alongside `@arch-engine/agp-emitter@0.1.0`) | §16.2 #18 |
| **J** | Default JSON envelope flip + v1 schema deprecation window | v1.2.0 | §14.1, §16.2 #16 |

Phases A–G are non-breaking and can land as a v1.0.2 / v1.0.3 patch sequence. Phases H–J need a minor or major bump.

---

## 9. Open Questions

| # | Question | Spec default | Material? |
| --- | --- | --- | --- |
| Q1 | JSON envelope rollout: Path A (additive nesting, breaks v1 consumers) vs. Path B (opt-in `--json-schema=v2`, v1 stays default through v1.x). | **Path B** | yes — affects v1.1 release scope |
| Q2 | Should `analyze` rename `CRITICAL` to `low-information` in the *number* tier, or only in the *headline*? | Headline only; numeric `score` field unchanged | small |
| Q3 | Should `arch-engine init` be in v1.1 or deferred further? | v1.1 candidate | small |
| Q4 | Should `--ci` force monochrome, or just imply it via `NO_COLOR`? | Force monochrome (more deterministic) | small |
| Q5 | Should `--format markdown` produce GitHub-flavored markdown, or strict CommonMark? | GFM (matches PR-comment use case) | small |
| Q6 | Should the v1.0.x patch include a `--quiet` flag? | No — v1.1 only (avoid expanding flag surface in patches) | small |
| Q7 | Should `analyze`'s headline unify with `check`'s headline? (Both say "Pass." / "Blocked.") | No — `analyze` is informational, never blocks. Different verbs (`Topology captured.`, `Architecture stability: warning.`) emphasize the difference. | small |
| Q8 | Demo fixture fixture should ship under `examples/demo-drift/` or under a new `fixtures/` directory? | `examples/demo-drift/` (consistent with existing `examples/sample-monorepo/`) | small |

Q1 is the only material one; everything else is implementation discretion under the spec defaults.

---

## 10. Commands Run

| # | Command | Purpose |
| --- | --- | --- |
| 1 | `git status --short` | confirm clean tree |
| 2 | `git branch --show-current` → `main` | confirm branch |
| 3 | `git log --oneline -n 12` | confirm v1.0.1 + emitter contract at HEAD |
| 4 | `git tag --list "arch-engine-v1.0.1"` | confirm release tag |
| 5 | `npm run build` | rebuild CLI dist |
| 6 | `node packages/cli/dist/bin.js --help` | capture global help |
| 7 | `node packages/cli/dist/bin.js --version` | capture version |
| 8 | `node packages/cli/dist/bin.js {doctor\|inspect\|analyze\|check\|explain} --help` | capture per-command help (×5) |
| 9 | `mktemp -d` + copy of `examples/sample-monorepo` | create controlled fixture |
| 10 | `node packages/cli/dist/bin.js doctor` (in fixture) | capture human-mode output |
| 11 | `node packages/cli/dist/bin.js inspect` (in fixture) | capture human-mode output |
| 12 | `node packages/cli/dist/bin.js analyze` (in fixture) | capture human-mode output — observed `CRITICAL (0.47)` |
| 13 | `node packages/cli/dist/bin.js check` (in fixture) | capture human-mode output — observed contradiction |
| 14 | `node packages/cli/dist/bin.js explain regression` (in fixture) | capture human-mode output |
| 15 | All five commands with `--json` (in fixture) | capture JSON shapes |
| 16 | All five commands with stdout discarded; capture `$?` | confirm exit codes |
| 17 | `node packages/cli/dist/bin.js explain unknown-target` | confirm exit code on bad target |
| 18 | `node packages/cli/dist/bin.js` (no args) | confirm exit code |
| 19 | `node packages/cli/dist/bin.js gibberish` | confirm exit code |
| 20 | `rm -rf $SMOKE` | tempdir cleaned |
| 21 | `mkdir -p docs/cli && ls docs/cli/` | confirm spec destination |
| 22 | Write `docs/cli/cli-experience-spec.md` | create deliverable |
| 23 | Write `audits/ARCH_ENGINE_CLI_EXPERIENCE_SPECIFICATION_AUDIT.md` | create this audit |
| 24 | `git status --short` (post-pass) | confirm only docs added |
| 25 | `git diff --stat` | confirm no source changes |
| 26 | `grep -R "@arch-governance/runtime\|@arch-governance/architecture-profile" package.json packages/*/package.json` | confirm no dependency added |

Working tree post-pass: two new untracked files under `docs/cli/` and `audits/`. No source code, no `package.json`, no lockfile changed.

---

*End of CLI experience specification audit.*
