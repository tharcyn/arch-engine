# Arch-Engine JSON v2 / CI Flags Specification Audit

**Audit date:** 2026-05-08
**Auditor:** Claude Opus 4.7 (1M context), spec/design pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**Pre-pass HEAD:** `314c5ab (tag: arch-engine-v1.0.3) chore(release): prepare arch-engine v1.0.3`
**Spec produced:** [`docs/cli/json-v2-ci-flags-spec.md`](../docs/cli/json-v2-ci-flags-spec.md)

**Predecessor specs:**
- [`docs/cli/cli-experience-spec.md`](../docs/cli/cli-experience-spec.md)
- [`docs/cli/json-error-language-spec.md`](../docs/cli/json-error-language-spec.md)
- [`docs/cli/cli-readiness-matrix.md`](../docs/cli/cli-readiness-matrix.md)

**Predecessor audits:**
- [`audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_SPECIFICATION_AUDIT.md`](./ARCH_ENGINE_JSON_ERROR_LANGUAGE_SPECIFICATION_AUDIT.md)
- [`audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_IMPLEMENTATION_AUDIT.md`](./ARCH_ENGINE_JSON_ERROR_LANGUAGE_IMPLEMENTATION_AUDIT.md)
- [`audits/release/ARCH_ENGINE_V1_0_3_PATCH_RELEASE_PREFLIGHT.md`](./release/ARCH_ENGINE_V1_0_3_PATCH_RELEASE_PREFLIGHT.md)

---

## 1. Executive Verdict

**`JSON_V2_CI_FLAGS_SPEC_READY_FOR_IMPLEMENTATION`**

The v1.1.0 contract is complete:

- A single 16-section spec at
  [`docs/cli/json-v2-ci-flags-spec.md`](../docs/cli/json-v2-ci-flags-spec.md)
  defines:
  - The opt-in JSON v2 envelope shape (`schemaVersion`, `command`,
    `archEngineVersion`, `emittedAt`, `status`, `summary`, `data`,
    `diagnostics`, `artifacts`, `nextActions`, `exitCode`).
  - Per-command `data.*` payloads for all five v1.0.x verbs.
  - Six new flags (`--json-schema`, `--ci`, `--format`, `--output`,
    `--verbose`, `--quiet`) with conflict / precedence rules.
  - A markdown output contract for `check`, `analyze`, `doctor`.
  - A CI usage model anchored on `--ci`.
  - A migration policy through v2.0.0 / v2.1.0.
  - A test plan with 9 test files and ~60 named cases.
  - 20 acceptance gates for the implementation pass.
- The spec preserves v1.0.3 byte-for-byte under default flags.
- The spec rules out AGP emitter, JSON v2 default flip, exit-code
  changes, and command-surface changes.
- The spec is implementable as **net-additive code** — no v1 path
  changes hands.

The implementation pass can proceed against this contract without
further design clarification.

---

## 2. Scope

**Spec only.** No source code, no tests, no `package.json`, no
version bump, no publish, no tag.

The spec passes design judgement — it does not yet land any working
code. The future v1.1.0 implementation pass owns code, tests, and
release.

---

## 3. Repository State

| Property | Value |
| --- | --- |
| Branch | `main` |
| Working tree before this pass | clean |
| HEAD | `314c5ab chore(release): prepare arch-engine v1.0.3` |
| Local tag `arch-engine-v1.0.3` | exists at `314c5ab` |
| Remote tag `arch-engine-v1.0.3` | exists at `314c5ab` (`origin`) |
| Existing v1.0.3 spec docs | present and stable |

This pass adds two new files:

- `docs/cli/json-v2-ci-flags-spec.md`
- `audits/ARCH_ENGINE_JSON_V2_CI_FLAGS_SPECIFICATION_AUDIT.md` (this
  file)

No existing file is modified.

---

## 4. Current v1.0.3 Behavior Reviewed

For accuracy, every v1.0.3 JSON shape was captured live from the
shipped CLI before authoring the spec. The captured key sets are
locked into the spec at §5.

**Five public CLI verbs** (frozen): `doctor`, `inspect`, `analyze`,
`check`, `explain <target>`.

**Existing flags** (all carry forward unchanged in v1.1.0):

- `--json` (root)
- `--no-color` (root)
- `--min-coverage <0..1>` (`check` only)
- `--sync` (`check` only)
- `--help` / `-h`
- `--version` / `-v`

**v1.0.3 JSON v1 top-level keys** (per command, per live capture):

| Command | Key count | Notable additive (v1.0.3) keys |
| --- | --- | --- |
| `doctor --json` | 17 | `diagnostics` |
| `inspect --json` | 14 | `diagnostics` |
| `analyze --json` | 18 | `diagnostics`, plus Phase A's `policyConfigured`, `headlineKind` |
| `check --json` | 18 | `diagnostics`, `violations`, `artifactRelativePath`, plus Phase A's `policyConfigured`, `headlineKind` |
| `explain regression --json` | 13 | `diagnostics` |

**v1.0.3 frozen subshapes** (carried forward into v2 unchanged):

- `diagnostics[i]` — `{ code, severity, title, message, ciBlocking,
  fix?, path?, details?, docsHint? }`.
- `violations[i]` — `{ id, ruleId, edge: {from, to, type}, severity,
  ciBlocking, category, code }`.

**v1.0.3 exit-code contract** (frozen): `0` / `1` / `2` / `3` / `5`.

**v1.0.3 stack-trace policy** (frozen): hidden by default; re-enabled
by `DEBUG=arch-engine:*`.

The spec preserves all of the above byte-for-byte under default
flags.

---

## 5. Main Design Decisions

### 5.1 JSON v2 lives **inside** an envelope; v1 stays flat

The v1.0.3 patch landed structured fields (`diagnostics`,
`violations`, `artifactRelativePath`) by adding them at the top level
because patch-safety required leaving v1 keys verbatim. v1.1.0 makes
the structural separation explicit:

- v1 stays flat-and-additive forever in the v1.x line.
- v2 nests the v1 payload under `data:` and exposes
  envelope-level metadata (`schemaVersion`, `archEngineVersion`,
  `emittedAt`, `status`, `summary`).

This matches Path B from the CLI Experience Spec §14.1 ("two-version
overlap, default flip at v2.0.0, hard removal at v2.1.0").

### 5.2 `summary` is an **object**, not a string

The earlier v1.0.3 §9 envelope sketch had `summary` as a one-sentence
string. v1.1.0 promotes it to an object:

```jsonc
"summary": {
  "headline": "Blocked: 1 architecture violation.",
  "verdict": "blocked",
  "score": 0.47,
  "violations": 1,
  "warnings": 0,
  "diagnostics": 2
}
```

`headline` carries the one-sentence form (still useful for log
scrapers); the additional counter fields let CI tools render badges
without parsing the full payload. This is net-additive — the v1.0.3
sketch's string-form is lost, but no v1.0.3 caller relies on it
(v1.0.3 does not emit any envelope today).

### 5.3 `status` enum split: `not_enforced` separate from `passed`

CI consumers asked the same question repeatedly: "did the check pass
because rules ran clean, or because no rules were configured?" The
v1.0.3 patch answered this via Phase A's `policyConfigured: false` and
`headlineKind: "no-policy"` fields, but those were derived. v2
promotes the answer to a first-class `status` token:
`not_enforced`. The other tokens (`passed`, `blocked`, `warning`,
`error`, `internal_error`) are direct mappings from exit code +
diagnostic severity.

### 5.4 Path leakage tightened in v2

v1 emits absolute paths (`artifactPath`) for backward-compat. v2
**omits** absolute paths by default and includes them only when
`--verbose` is set. Machine consumers parsing v2 are path-safe by
construction. This is a v2-only rule; v1 keeps its absolute-path
behavior.

### 5.5 Six new flags, not eight

The CLI Experience Spec §13.2 originally proposed eight flags
(`--ci`, `--format`, `--output`, `--verbose`, `--quiet`, `--baseline`,
`--emit-agp`, `--json-schema`). The v1.1.0 spec drops two from scope:

- `--baseline <path>` deferred (separate spec; needs design beyond
  flags).
- `--emit-agp` deferred (separate AGP emitter mission).

Six is enough to cover the JSON v2 + CI consolidation goal and stays
implementable in one minor release.

### 5.6 `--ci` does NOT imply `--json`

CI is presentation, JSON is format. They compose orthogonally. A user
who wants both writes `--ci --json --json-schema=v2`. Implicit
implication is rejected because (a) CI gates often run in human mode
and grep the verdict line, and (b) implicit format switches surprise
consumers.

### 5.7 `--format json` aliases `--json`, not the reverse

`--json` is the v1 ergonomic surface that survives. `--format` is the
proper extensible knob. They reduce to the same code path; users may
write either; passing both must agree (else exit 2).

### 5.8 Markdown ships for `check`, `analyze`, `doctor` only

`inspect` and `explain` get a thin markdown wrapper (single-section)
because their content does not benefit from the verdict / violations /
diagnostics structure. Locking five distinct templates would be more
spec surface than the use case warrants. Future spec passes can
expand if data shows demand.

### 5.9 Exit codes frozen

No v1.1.0 flag changes any exit code. v1.0.2's lock holds: `0` / `1`
/ `2` / `3` / `5`. New flag misuse fires `ARCH_ENGINE_INVALID_CONFIG`
(exit 2) — the existing code, no new code.

### 5.10 No JSON Schema v7 documents yet

Considered worth shipping but deferred to a v1.1.1 patch. The prose
contract in this spec is the source of truth for v1.1.0.
Implementations may write JSON Schema files internally for testing,
but they are not part of the v1.1.0 public artifacts.

---

## 6. JSON v2 Decision

The v2 envelope is summarized at spec §6.1; the full reasoning:

**Top-level shape (alphabetical key order):**

```jsonc
{
  "archEngineVersion": "1.1.0",
  "artifacts": [],
  "command": "check",
  "data": { ... },
  "diagnostics": [],
  "emittedAt": "2026-05-08T07:42:00Z",
  "exitCode": 0,
  "nextActions": [],
  "schemaVersion": "arch-engine.cli.v2",
  "status": "passed",
  "summary": { "headline": "...", "verdict": "passed", ... }
}
```

**Required fields:** every top-level key above.
**Optional fields:** none at top level. All extension lives under
`data.*` or `summary.*`.
**Forbidden:** any top-level key not listed above.

**Determinism:**

- Top-level alphabetical (matches above).
- `data.*` keys alphabetized recursively.
- `diagnostics[]` sorted by `(severity desc, code asc, message asc)`.
- `data.violations[]` (under `check`) sorted by `id` asc (already
  deterministic via sha256-truncated hash).
- `artifacts[]` sorted by `(kind asc, relativePath asc)`.
- `nextActions[]` preserves human-output display order.

**Path policy:**

- Repo-relative POSIX everywhere by default.
- `artifacts[].absolutePath` omitted by default; included only with
  `--verbose`.
- External paths render as `…/<basename>`.

**Backward-compat:**

- v1 `--json` output unchanged when `--json-schema=v2` is not passed.
- v2 envelope is purely opt-in.
- Implementations MAY compute the v1 payload and wrap it under
  `data:` to satisfy v2 (preferred minimal-surface approach).

**Per-command `data` shapes:** locked at spec §7. Each shape groups
existing v1 keys into named sub-objects (`workspace`, `topology`,
`stability`, `domains`, `executionMetrics`, …) so future fields land
cleanly.

---

## 7. Flag Contract Decision

| Flag | Type | Default | Key rule |
| --- | --- | --- | --- |
| `--json-schema=v1\|v2` | enum | `v1` | Valid only with `--json` or `--format json`; invalid with markdown/human. |
| `--ci` | bool | off | Forces no-color, deterministic output, no decorative separators, full repo-relative paths, machine-quotable `Exit N:` line. Does NOT imply `--json`. |
| `--format human\|json\|markdown` | enum | `human` | `json` aliases `--json`; `human`/`markdown` conflict with `--json`. |
| `--output <path>` | string | unset | Writes formatted output to file; creates parent dirs; overwrites; UTF-8 LF. Trailing slash → exit 2. |
| `--verbose` | bool | off | Adds detail; shows `INTERNAL` stack traces; includes `artifacts[].absolutePath` in v2. Never leaks secrets. |
| `--quiet` | bool | off | Suppresses non-essential human output; preserves errors and machine output. `--quiet` wins over `--verbose`. |

The full §9 interaction matrix lists every cross-flag combination,
allowed/forbidden, with expected behavior or exit code. Forbidden
combinations all exit 2 with `ARCH_ENGINE_INVALID_CONFIG`.

---

## 8. Patch vs Minor Decision

**v1.1.0, not v1.0.4. Locked.**

Reasons:

1. **New public flags.** v1.1.0 adds six user-visible flags. The
   "patch-release-safe" rules in CLI Experience Spec §13.1
   permit additive JSON keys but explicitly require a minor bump for
   new flags. Adding flags as a patch would set a precedent that
   expands the v1.0.x flag surface silently — undesirable.
2. **New JSON envelope shape.** Even though `--json-schema=v2` is
   opt-in and the default stays `v1`, the existence of a documented
   second envelope is a contract that consumers will pin to. It needs
   the visibility of a minor release.
3. **New markdown output channel.** `--format markdown` is a brand-new
   output type. Patches don't ship new output formats.
4. **New CI behavior knobs.** `--ci`, `--quiet`, `--verbose` lock new
   stdout/stderr semantics. Patches don't lock new I/O semantics.
5. **Future migration runway.** v1.1.0 sets up the v2-default flip at
   v2.0.0. SemVer requires the introduction of v2 (even opt-in) be a
   minor.

A patch (v1.0.4) was considered briefly for `--json-schema=v2` only
(no other flags). That sub-scope would compress to one flag and one
envelope but would force a second minor release shortly after for the
remaining flags. A single v1.1.0 covering the whole consolidation is
cleaner and matches Option A as scoped.

---

## 9. Open Questions

These are deliberately left to the implementation pass. Each has a
recommended default in the spec; the implementation may revisit if
testing reveals constraints.

| # | Question | Spec default | Notes |
| --- | --- | --- | --- |
| 1 | Should `--quiet` silence `WARNING`-severity diagnostics on stderr? | No — only suppresses non-essential **human** output; warnings still surface. | Revisit if CI users complain about noise. |
| 2 | Should `--output` reject existing files (no overwrite by default)? | No — overwrite is permitted. | A `--no-overwrite` flag is deferred. |
| 3 | Should `--verbose` include `details` in v2 `diagnostics[i]` for non-INTERNAL severity? | Yes — `details` field already exists in v1.0.3; verbose populates it more aggressively. | No new field needed. |
| 4 | Should the markdown report cap (50 violations / 25 diagnostics / 250 KB) be configurable? | No — fixed in v1.1.0 to keep determinism simple. | Revisit if PR comment limits push back. |
| 5 | Should `--ci` add a `--ci` marker line to stdout (e.g., `# arch-engine ci-mode`)? | No — `--ci` changes presentation, not content. CI tools detect by absence of ANSI, not by markers. | |
| 6 | Should `--json-schema=v2` emit JSON Schema v7 documents under `.arch-engine/schemas/`? | No — JSON Schema files deferred to v1.1.1. Prose contract is source of truth. | |
| 7 | Should `--format markdown` accept a template path (`--markdown-template <file>`) for branding? | No — keep markdown deterministic. Branding is a downstream concern. | |
| 8 | When `--output` write fails mid-run (disk full), what state is left? | The file content is whatever was buffered before the write call. The CLI exits 2; the user may have a partial file. | OS-level partial-write semantics; no special handling. |
| 9 | Should `--verbose` activate downstream `DEBUG` output from third-party libs? | No — `--verbose` is engine-internal. `DEBUG=*` remains the third-party knob. | |

None of these are blockers. The implementation pass can lock them at
the proposed defaults.

---

## 10. Recommended Implementation Order

The 14-phase implementation roadmap (suggested for the next mission):

1. **Phase 1 — Confirm repo state.** v1.0.3 baseline; spec docs
   present; clean working tree.
2. **Phase 2 — Spec read-through.** Re-read this audit and the spec
   doc; confirm all contracts.
3. **Phase 3 — Internal flag plumbing.** Extend the `cac` setup in
   `cli.ts` to register the six new flags. No behavior yet — just
   parser surface.
4. **Phase 4 — `--ci` minimal behavior.** Force `--no-color`, drop
   spinners, full repo-relative paths. No markdown, no v2 yet.
5. **Phase 5 — `--format human|json|markdown` parser.** Wire up the
   alias for `--json`; reject conflicts with exit 2.
6. **Phase 6 — JSON v2 envelope renderer.** A single
   `renderV2Envelope(command, v1Payload, ctx)` function that wraps the
   existing v1 payload into the v2 envelope. All five commands
   funnel through it when `--json-schema=v2` is set.
7. **Phase 7 — Per-command `data.*` reshape.** Restructure each v1
   payload into the §7 sub-objects under `data`. v1 path stays
   identical.
8. **Phase 8 — Markdown renderer.** `renderMarkdown(command,
   v2Envelope, ctx)` for `check`, `analyze`, `doctor`. Determinism
   guards.
9. **Phase 9 — `--output <path>` writer.** mkdir-p, UTF-8 LF write,
   ANSI strip for human-mode files, exit 2 on write failure.
10. **Phase 10 — `--verbose` / `--quiet` semantics.** Separate the
    "human-mode rendering" from the "machine-mode rendering" so quiet
    only affects human; verbose adds details to both.
11. **Phase 11 — Flag interaction matrix tests.** Matrix from spec
    §9. Every forbidden combo exits 2.
12. **Phase 12 — JSON v2 envelope shape tests.** Snapshot per command
    against the §7 templates.
13. **Phase 13 — Markdown snapshot tests.** §10.2 / §10.3 / §10.4
    snapshots.
14. **Phase 14 — Validation, audit, release prep.** Build, typecheck,
    test, freeze, pack dry-run; write implementation audit; bump
    versions to v1.1.0 (separate release-prep pass).

Estimated effort: ~3–5 days of focused implementation work. The spec
does the design heavy lifting; the implementation is mostly plumbing
and snapshots.

---

## 11. Commands Run

```bash
# Phase 1
git status --short
git branch --show-current
git remote -v
git log --oneline --decorate -n 15
git tag --list "arch-engine-v1.0.3"
git ls-remote --tags origin "arch-engine-v1.0.3"

# Phase 2
ls -la docs/cli/ audits/release/
wc -l docs/cli/*.md audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_*.md \
      audits/release/ARCH_ENGINE_V1_0_3_*.md
grep -n "^## " docs/cli/json-error-language-spec.md
npm run build
node packages/cli/dist/bin.js doctor --json   # in tempdir consumer
node packages/cli/dist/bin.js inspect --json
node packages/cli/dist/bin.js analyze --json
node packages/cli/dist/bin.js check --json
node packages/cli/dist/bin.js check --json    # in demo-drift consumer
node packages/cli/dist/bin.js explain regression --json
node packages/cli/dist/bin.js explain unknown-target --json

# Phase 14
git status --short
git diff --stat
git diff --name-status
grep -R "@arch-governance/runtime\|@arch-governance/architecture-profile" \
     package.json packages/*/package.json
```

No source files modified. No `package.json` modified. No tests run
beyond the build verification. No publish, no tag, no commit attempted
yet (commit is left for the human, per mission constraints).

---

*End of JSON v2 / CI Flags Specification Audit.*
