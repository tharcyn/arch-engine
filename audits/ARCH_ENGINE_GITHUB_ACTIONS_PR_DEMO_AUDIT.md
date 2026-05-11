# Arch-Engine GitHub Actions / PR Demo Audit

**Audit date:** 2026-05-11
**Auditor:** Claude Opus 4.7 (1M context), demo/integration pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**Pre-pass HEAD:** `23eba0d chore(release): prepare arch-engine v1.1.0`
**Predecessor audits:**
- [`audits/release/ARCH_ENGINE_V1_1_0_MINOR_RELEASE_PREFLIGHT.md`](./release/ARCH_ENGINE_V1_1_0_MINOR_RELEASE_PREFLIGHT.md)
- [`audits/ARCH_ENGINE_JSON_V2_CI_FLAGS_IMPLEMENTATION_AUDIT.md`](./ARCH_ENGINE_JSON_V2_CI_FLAGS_IMPLEMENTATION_AUDIT.md)

---

## 1. Executive Verdict

**`GITHUB_ACTIONS_PR_DEMO_READY`**

Two ready-to-copy GitHub Actions workflow templates ship under
`examples/github-actions/`:

1. **`arch-engine-pr-report.yml`** — generates the v1.1.0 markdown
   architecture report and uploads it as a build artifact. Safe on
   every PR (internal and fork), requires only `contents: read`.
2. **`arch-engine-pr-comment.yml`** — same plus posts/updates a
   sticky PR comment via `actions/github-script@v7`. Adds
   `pull-requests: write` permission. Gracefully degrades on fork
   PRs (skips the comment with a `::notice::` log line; the
   artifact still uploads).

Neither template uses `pull_request_target`. Neither requires
secrets. Both fail the job (non-zero exit) when Arch-Engine
detects a blocking architecture violation so they can be wired as
required status checks in branch protection.

The main `README.md` now has a "GitHub Actions / PR reports"
section linking to `examples/github-actions/`. The templates
directory has its own `README.md` with quickstart, security
posture, fork limitations, sample output, and a five-item
troubleshooting block.

23 new tests in
`packages/cli/tests/docs/github-actions-templates.snapshot.test.ts`
pin every behavioural and safety contract documented here. Full
repo test suite green at **2086 / 2086** across **658 / 658**
files.

No source code changed in `packages/cli/src/` or any other
runtime package. No version bump. No publish. No tag. No AGP
dependency.

---

## 2. Scope

Strict docs/workflow demo pass. **No runtime source changes.**

- Add two reusable workflow templates under
  `examples/github-actions/`.
- Add a directory README with quickstart, security notes, and
  troubleshooting.
- Add a one-section pointer in the root `README.md` between
  "Examples" and "Documentation".
- Add a snapshot-style test file that pins the workflow
  templates' shape and safety contracts.

Out of scope (per mission constraints):

- AGP emitter / `@arch-governance/*` integration.
- Any change to CLI source, command set, flag set, or JSON shape.
- Any change to `package.json` files (no new runtime deps).
- Any change to package versions.
- An active in-repo workflow that posts comments by default.
- A `workflow_run`-based pattern for fork-PR commenting (would
  require a third template and adds significant complexity;
  flagged as a future opt-in if user demand surfaces).

---

## 3. Files Created/Modified

### 3.1 New files

| File | Lines | Purpose |
| --- | --- | --- |
| `examples/github-actions/arch-engine-pr-report.yml` | 122 | Artifact-only workflow template. Triggers on `pull_request`. Uploads `arch-engine-report.md` regardless of check outcome; surfaces blocking violations as job failure. |
| `examples/github-actions/arch-engine-pr-comment.yml` | 188 | PR-comment workflow template. Adds `pull-requests: write`. Uses `actions/github-script@v7` to post/update a sticky comment keyed by `<!-- arch-engine-report -->`. Gracefully degrades on fork PRs. |
| `examples/github-actions/README.md` | 244 | Quickstart, security posture, sample output, fork limitations, five-item troubleshooting block. Links to templates and to the v1.1.0 spec. |
| `packages/cli/tests/docs/github-actions-templates.snapshot.test.ts` | 270 | 23 vitest pins covering parse, safety, permissions, behaviour invariants, triggers, and README cross-references. |
| `audits/ARCH_ENGINE_GITHUB_ACTIONS_PR_DEMO_AUDIT.md` | — | This audit. |

### 3.2 Modified files

| File | Change |
| --- | --- |
| `README.md` | Added one row in the Examples table linking to `examples/github-actions/`. Added a new "GitHub Actions / PR reports" section after Examples with the canonical command line and a link to the templates directory. |

### 3.3 Files NOT modified

- All `package.json` files. Versions still `1.1.0`. No new
  runtime dependencies.
- All source under `packages/*/src/`. CLI behaviour unchanged.
- All existing test files. Phase A through Phase F suites all
  green untouched.
- `.github/workflows/test.yml` and `typecheck.yml` (the repo's
  own CI). The new templates are intentionally NOT installed
  there — they live under `examples/` as copy-targets.

---

## 4. Artifact Workflow

`examples/github-actions/arch-engine-pr-report.yml`

| Property | Value |
| --- | --- |
| Trigger | `pull_request` to `main` or `master` |
| Top-level permissions | `contents: read` only |
| Job permissions | (inherits top-level) |
| External actions used | `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4` |
| External dependencies added to consumer repo | None (`npm install --no-save`) |
| Secrets required | None |
| Behaviour on internal PR | ✅ artifact uploaded, exit code surfaced |
| Behaviour on fork PR | ✅ artifact uploaded, exit code surfaced |
| Determinism | ✅ `--ci` + `node-version: '20'` + version-pinned actions |

**Canonical command run inside the workflow:**

```bash
npx arch-engine check --ci --format markdown --output arch-engine-report.md
```

**Failure surfacing:**

```yaml
- name: Run Arch-Engine check
  id: arch_engine
  continue-on-error: true
  run: |
    npx arch-engine check --ci \
      --format markdown \
      --output arch-engine-report.md

- name: Upload report artifact
  if: always()                # uploads on both pass and fail
  uses: actions/upload-artifact@v4
  …

- name: Fail job on blocking violation
  if: steps.arch_engine.outcome == 'failure'
  run: exit 1
```

This pattern guarantees the artifact is always uploaded before
the job's exit code reflects the check's verdict, so PR reviewers
can always inspect the report — even when the check is red.

---

## 5. PR Comment Workflow

`examples/github-actions/arch-engine-pr-comment.yml`

| Property | Value |
| --- | --- |
| Trigger | `pull_request` to `main` or `master` |
| Top-level permissions | `contents: read`, `pull-requests: write` |
| External actions used | `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `actions/github-script@v7` |
| External dependencies added to consumer repo | None |
| Secrets required | None — uses the default `GITHUB_TOKEN` |
| Behaviour on internal PR | ✅ artifact uploaded, sticky comment posted/updated, exit code surfaced |
| Behaviour on fork PR | ⚠️ artifact uploaded; comment-post step is GUARDED (`head.repo.full_name == github.repository`) so it short-circuits with a `::notice::`; exit code surfaced |

**Sticky comment mechanics:**

- Marker: `<!-- arch-engine-report -->` as the first line of the
  comment body.
- On every run: list PR comments, find the one containing the
  marker, update it in place via
  `github.rest.issues.updateComment`. If none exists, create a
  new one via `github.rest.issues.createComment`.
- The `actions/github-script@v7` runtime ships with the GitHub
  runner; no extra `npm install` step is needed.

**Comment body shape (locked by tests):**

```markdown
<!-- arch-engine-report -->

## Arch-Engine architecture check

# Arch-Engine `check`
[…full markdown report from the v1.1.0 renderer…]

---

_Posted by [arch-engine@1.1.0](https://github.com/tharcyn/arch-engine) — [workflow run](…)._
```

The version string is hardcoded in the template (`1.1.0`); consumers
can bump it themselves when they upgrade their `--no-save` install
specifier.

---

## 6. Security Review

### 6.1 No `pull_request_target`

Both templates trigger on **`pull_request`**, never on
`pull_request_target`. This is the central safety property
documented in the spec and in the README.

Verification:

```bash
$ grep -R "pull_request_target" examples/github-actions
examples/github-actions/arch-engine-pr-report.yml:#  - Triggers on `pull_request` (NEVER `pull_request_target` — that
examples/github-actions/README.md:- **`on: pull_request`**, never `on: pull_request_target`. The
examples/github-actions/arch-engine-pr-comment.yml:#  `on: pull_request_target`.
examples/github-actions/arch-engine-pr-comment.yml:#    - `pull_request_target` runs in the base-repo context with
```

Every match is either a YAML comment (lines prefixed with `#`)
warning against the pattern, or markdown prose explaining the
risk. No `on:` block uses it. Pinned by the test
`arch-engine-pr-report.yml does NOT use pull_request_target` and
its comment-workflow sibling.

### 6.2 Least-privilege permissions

| Workflow | `contents` | `pull-requests` | Other write scopes |
| --- | --- | --- | --- |
| `arch-engine-pr-report.yml` | `read` | (unset, defaults to read) | none |
| `arch-engine-pr-comment.yml` | `read` | `write` | none |

The comment workflow's write scope is the minimum needed to call
`github.rest.issues.{create,update}Comment`. Pinned by the test
`comment workflow declares contents: read + pull-requests: write only`.

### 6.3 Fork-PR behaviour

`pull_request` from a fork runs with a read-only `GITHUB_TOKEN`
by GitHub's default. The comment workflow recognises this:

```yaml
- name: Post or update PR comment
  if: always() && github.event.pull_request.head.repo.full_name == github.repository
  …

- name: Fork PR notice (no comment posted)
  if: github.event.pull_request.head.repo.full_name != github.repository
  run: |
    echo "::notice::Skipped PR comment posting because this PR is from a fork."
    echo "::notice::Download the 'arch-engine-report' artifact for the markdown report."
```

Fork PRs still get the artifact, the exit-code gate, and a clear
log notice — they just don't get the inline comment. The
artifact-only workflow continues to work identically on fork PRs.

This is the correct trade-off: rejecting fork PRs is hostile to
the open-source workflow GitHub is built around, and using
`pull_request_target` to enable fork commenting is the documented
attack surface against untrusted code. The README documents the
GitHub-blessed `workflow_run`-based alternative for users who
absolutely need fork commenting (and explicitly notes it's out
of scope for the starter templates).

### 6.4 No secrets

Neither template references `secrets.*` or environment-level
secrets. The default `GITHUB_TOKEN` is sufficient for both. This
keeps the templates safe to copy-paste into any repository
without prerequisite secret setup.

### 6.5 Pinned external action versions

All four external actions are pinned to a major version
(`@v4`/`@v7`). Major-version pinning is the GitHub-recommended
balance between security (no silent upgrades to compromised
versions) and maintainability (security patches still arrive
automatically). Consumers can tighten to a full SHA if their
security policy requires.

### 6.6 No new runtime dependencies in the repo

`grep -R "@arch-governance/runtime\|@arch-governance/architecture-profile" package.json packages/*/package.json` returns nothing.

The templates use `npm install --no-save @arch-engine/cli@^1.1.0
@arch-engine/adapter-monorepo@^1.1.0` inside the CI runner.
Nothing is added to any `package.json` in this repo or
downstream consumer repos.

---

## 7. Validation Results

| Gate | Result |
| --- | --- |
| `npm run build` | ✅ all packages build |
| `npm run typecheck` | ✅ all 7 tsconfigs clean |
| `npm test` | ✅ **2086 / 2086 tests** across **658 / 658 files** (was 2063 / 657 at v1.1.0 → +23 new docs tests, +1 file) |
| New test file | ✅ 23 / 23 pinned contracts pass in `cli-experience-phase-f-*` neighbour `packages/cli/tests/docs/github-actions-templates.snapshot.test.ts` |
| YAML parse | ✅ both templates parse with the `yaml` library already on `packages/cli`'s deps |
| `grep pull_request_target` (non-comment) | ✅ no `on:` triggers use it; only comments and prose |
| Local report generation | ✅ `arch-engine check --ci --format markdown --output report.md` on `examples/demo-drift` produces the locked v1.1.0 shape; exit 1 with `Wrote arch-engine-report.md` confirmation |

---

## 8. Remaining Deltas

| Delta | Severity | Notes |
| --- | --- | --- |
| Fork-PR commenting via `workflow_run` pattern not shipped | MICRO_DELTA | Documented as a future opt-in in the templates README. Adds significant complexity; deferred until user demand surfaces. |
| Workflow templates pin major versions of external actions, not full SHAs | LOW | Major-version pinning is the GitHub-recommended default. Consumers can tighten further per their security policy. |
| The PR-comment workflow hardcodes `archEngineVersion = '1.1.0'` in the comment footer | MICRO_DELTA | Consumers must bump this when they upgrade their `npm install --no-save` specifier. A future iteration could read the version from the report itself; deferred. |
| `npm install --no-save` adds 1–3 seconds to every CI run for repos that don't already declare `@arch-engine/cli` | LOW | README documents the `npm ci` alternative for repos that do. |
| 1 moderate-severity `npm audit` finding | LOW | Pre-existing; not introduced by this pass. Carried over from v1.0.3. |

No BLOCKER or HIGH deltas.

---

## 9. Recommended Next Mission

Pick by product priority:

- **Option A — Private AGP Emitter MVP Implementation Pass.**
  Implement `@arch-engine/agp-emitter@0.1.0` per
  `docs/contracts/agp-emitter-contract.md`. Wires `arch-engine
  check --emit-agp` behind a feature flag. Opens the AGP track
  with a real consumer surface.
- **Option B — CLI v1.1.x Baseline Comparison Contract Pass.**
  Spec + implement `--baseline <path>` for cross-run drift
  analysis. The v1.1.0 markdown/output plumbing already supports
  the I/O shape; this is a focused feature add (with a v1.2.0
  bump) that turns "snapshot per PR" into "snapshot diff per PR".
- **Option C — Workflow-Run-Based Fork Comment Pass.**
  Implement the GitHub-blessed `workflow_run`-triggered companion
  workflow for fork-PR commenting. Smallest of the three; ships
  as a third template under `examples/github-actions/`. Defer
  unless a real user signals demand — the artifact-only template
  already covers fork PRs adequately.

Default to **Option A** (AGP Emitter MVP). The v1.1.0 CI demo
just made Arch-Engine's CI surface visible; the natural follow-on
is to open the governance integration track that the spec has
been pointing at since the AGP emitter contract landed.

*End of audit.*
