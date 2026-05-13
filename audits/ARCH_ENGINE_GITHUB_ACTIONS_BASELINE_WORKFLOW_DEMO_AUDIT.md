# Arch-Engine GitHub Actions Baseline Workflow Demo Audit

**Audit date:** 2026-05-13
**Auditor:** Claude Opus 4.7 (1M context), demo/integration pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**Pre-pass HEAD:** `1b52581 chore(cli): normalize npm bin metadata`

**Predecessor audits:**
- [`audits/ARCH_ENGINE_GITHUB_ACTIONS_PR_DEMO_AUDIT.md`](./ARCH_ENGINE_GITHUB_ACTIONS_PR_DEMO_AUDIT.md)
- [`audits/ARCH_ENGINE_BASELINE_COMPARISON_IMPLEMENTATION_AUDIT.md`](./ARCH_ENGINE_BASELINE_COMPARISON_IMPLEMENTATION_AUDIT.md)
- [`audits/release/ARCH_ENGINE_V1_2_0_MINOR_RELEASE_PREFLIGHT.md`](./release/ARCH_ENGINE_V1_2_0_MINOR_RELEASE_PREFLIGHT.md)
- [`audits/ARCH_ENGINE_CLI_PACKAGE_METADATA_REPAIR_AUDIT.md`](./ARCH_ENGINE_CLI_PACKAGE_METADATA_REPAIR_AUDIT.md)

---

## 1. Executive Verdict

**`GITHUB_ACTIONS_BASELINE_DEMO_READY`**

Two new baseline-aware workflow templates ship under
`examples/github-actions/`, completing the v1.2.0 product loop
that the baseline-comparison contract opened up:

1. **`arch-engine-pr-baseline-report.yml`** (210 lines) —
   restores or generates a baseline from the PR's base SHA, runs
   `arch-engine check --ci --baseline ... --format markdown
   --output arch-engine-report.md`, uploads both the markdown
   report and the baseline JSON as build artifacts. Safe on every
   PR (internal or fork). Requires only `contents: read`.
2. **`arch-engine-pr-baseline-comment.yml`** (237 lines) — same
   plus posts/updates a sticky PR comment via
   `actions/github-script@v7`, marked with
   `<!-- arch-engine-baseline-report -->`. Adds
   `pull-requests: write`. Gracefully degrades on fork PRs (skips
   the comment with a `::notice::`; artifact still uploads).

Both fail the job (non-zero exit) when Arch-Engine reports a
non-zero exit, but the artifact upload runs FIRST so reviewers
always see the drift breakdown. Per the v1.2.0 contract, drift
alone never fails CI — only blocking violations in the current
run exit 1.

Neither workflow uses `pull_request_target`. Neither requires
secrets. Both pin external actions to major versions
(`actions/checkout@v4`, `actions/setup-node@v4`,
`actions/cache@v4`, `actions/upload-artifact@v4`,
`actions/github-script@v7`).

23 new tests in
`packages/cli/tests/docs/github-actions-templates.snapshot.test.ts`
pin every behavioural and safety contract documented here (the
test file grew from 23 → 46 tests). Full repo suite green at
**2191 / 2191** across **662 / 662 files**.

No source code changed. No version bump. No publish. No tag. No
AGP dependency.

---

## 2. Scope

Strict docs/workflow demo pass. **No runtime source changes.**

- Add two reusable workflow templates under
  `examples/github-actions/` for the v1.2.0 baseline-comparison
  surface.
- Update `examples/github-actions/README.md` with:
  - A "v1.1.0 / v1.2.0" table split at the top.
  - A "Baseline comparison workflows (v1.2.0)" section covering
    baseline production strategy, fork PR behaviour, exit codes,
    and a sample drift-aware markdown output.
  - Two new troubleshooting entries (baseline validation
    failures + cache-miss behaviour).
- Update root `README.md` minimally:
  - Examples-table row now mentions v1.2.0 baseline templates.
  - "GitHub Actions / PR reports" section gains the canonical
    v1.2.0 baseline command and lists all four templates.
- Add 23 new Phase G-style tests pinning the safety + behaviour
  contracts of the two new templates.

Out of scope (per mission constraints):

- AGP emitter / `@arch-governance/*` integration.
- CLI source / runtime / JSON / command changes.
- Version bump, publish, tag.
- An active in-repo workflow that posts comments by default.
- Cloud / S3 / dedicated baseline storage (documented in README
  as a stronger production option).
- `pull_request_target` triggers (explicitly forbidden by
  mission security rule).

---

## 3. Files Created/Modified

### 3.1 New files

| File | Lines | Purpose |
| --- | --- | --- |
| `examples/github-actions/arch-engine-pr-baseline-report.yml` | 210 | Artifact-only baseline workflow. Triggers on `pull_request`. Caches + git-worktree baseline; runs `check --baseline`; uploads `arch-engine-report.md` + `arch-engine-baseline.json`; preserves Arch-Engine exit code via `set +e` capture pattern. |
| `examples/github-actions/arch-engine-pr-baseline-comment.yml` | 237 | Same baseline + report path, plus sticky PR comment via `actions/github-script@v7` keyed on `<!-- arch-engine-baseline-report -->`. Adds `pull-requests: write`. Guards comment-posting on fork PRs. |
| `audits/ARCH_ENGINE_GITHUB_ACTIONS_BASELINE_WORKFLOW_DEMO_AUDIT.md` | — | This audit. |

### 3.2 Modified files

| File | Change |
| --- | --- |
| `examples/github-actions/README.md` | +213 lines. Added v1.1.0/v1.2.0 split at top, "Baseline comparison workflows (v1.2.0)" section covering baseline production strategy, fork PR behaviour, exit-code table, sample drift-aware markdown output. Added two new troubleshooting entries for baseline validation failures and cache-miss behaviour. The canonical command list now shows both v1.1.0 and v1.2.0 invocations. |
| `README.md` | +13 lines, ~2 lines reworded. Examples-table row for `examples/github-actions/` mentions v1.2.0 baseline templates. "GitHub Actions / PR reports" section gains the canonical v1.2.0 baseline command and lists all four templates. |
| `packages/cli/tests/docs/github-actions-templates.snapshot.test.ts` | +216 lines. 23 new tests covering baseline-workflow file parsing, safety guards (no `pull_request_target`), least-privilege permissions, behaviour invariants (v1.2.0 install, baseline command, cache + worktree fallback, artifact upload, exit-code preservation), fork-PR comment guards, sticky-marker, no-secrets requirement, README cross-references. |

### 3.3 Files NOT modified

- All `package.json` files. Versions still `1.2.0`. No new
  runtime dependencies.
- All source under `packages/*/src/`. CLI behaviour unchanged.
- All other existing test files. Phase A through Phase G suites
  all green and untouched.
- `.github/workflows/test.yml` and `typecheck.yml` (the repo's
  own CI). The new templates are intentionally NOT installed
  there — they live under `examples/` as copy-targets.
- `docs/cli/baseline-comparison-spec.md` (the v1.2.0 contract;
  no changes needed).

---

## 4. Artifact-Only Baseline Workflow

`examples/github-actions/arch-engine-pr-baseline-report.yml`

| Property | Value |
| --- | --- |
| Trigger | `pull_request` to `main` or `master` |
| Top-level permissions | `contents: read` only |
| External actions used | `actions/checkout@v4`, `actions/setup-node@v4`, `actions/cache@v4`, `actions/upload-artifact@v4` |
| External dependencies added to consumer repo | None (`npm install --no-save`) |
| Secrets required | None |
| Behaviour on internal PR | ✅ baseline cached/generated; artifact uploaded; exit code surfaced |
| Behaviour on fork PR | ✅ same as internal (no comment to skip) |
| Determinism | ✅ `--ci` + `node-version: '20'` + version-pinned actions + baseline cache keyed by `base.sha` |

**Canonical command run inside the workflow:**

```bash
npx arch-engine check --ci \
  --baseline arch-engine-baseline.json \
  --format markdown \
  --output arch-engine-report.md
```

**Two-step baseline acquisition:**

```yaml
- name: Restore baseline cache
  id: baseline-cache
  uses: actions/cache@v4
  with:
    path: arch-engine-baseline.json
    key: arch-engine-baseline-v1-${{ github.event.pull_request.base.sha }}
    restore-keys:
      | arch-engine-baseline-v1-

- name: Generate baseline from base ref (cache miss only)
  if: steps.baseline-cache.outputs.cache-hit != 'true'
  run: |
    # git worktree at the PR's base SHA + reuse the PR-side
    # arch-engine install via direct `node ./node_modules/...`.
```

The fallback uses a git worktree (no separate npm install in the
worktree) so the baseline-generation step typically runs in
<30 seconds.

**Exit code preservation:**

```yaml
- name: Run Arch-Engine check
  id: arch_engine
  run: |
    set +e
    npx arch-engine check --ci --baseline ... --format markdown ...
    ARCH_ENGINE_EXIT=$?
    set -e
    echo "exit_code=${ARCH_ENGINE_EXIT}" >> "$GITHUB_OUTPUT"

- name: Upload artifacts          # always
- name: Fail job on non-zero exit # only when exit_code != '0'
```

This guarantees artifacts are always uploaded before the job's
exit code reflects the Arch-Engine verdict.

---

## 5. Sticky PR Comment Baseline Workflow

`examples/github-actions/arch-engine-pr-baseline-comment.yml`

| Property | Value |
| --- | --- |
| Trigger | `pull_request` to `main` or `master` |
| Top-level permissions | `contents: read`, `pull-requests: write` |
| External actions used | `actions/checkout@v4`, `actions/setup-node@v4`, `actions/cache@v4`, `actions/upload-artifact@v4`, `actions/github-script@v7` |
| External dependencies added to consumer repo | None |
| Secrets required | None — uses the default `GITHUB_TOKEN` |
| Behaviour on internal PR | ✅ baseline cached/generated; artifact uploaded; sticky comment posted/updated; exit code surfaced |
| Behaviour on fork PR | ⚠️ artifact uploaded; comment-post step GUARDED (`head.repo.full_name == github.repository`); `::notice::` log explains the skip |

**Sticky-comment mechanics:**

- Marker: `<!-- arch-engine-baseline-report -->` as the first
  line of the comment body. Distinct from the v1.1.0 marker
  (`<!-- arch-engine-report -->`), so the two workflows can ship
  side-by-side without colliding.
- On every run: list PR comments, find the one containing the
  marker, update in place via `github.rest.issues.updateComment`.
  If none exists, create new via `github.rest.issues.createComment`.
- Comment body includes the full markdown report plus footer
  linking to the workflow run and the base SHA used for the
  baseline.

**Comment body shape (locked by tests):**

```markdown
<!-- arch-engine-baseline-report -->

## Arch-Engine architecture drift report

# Arch-Engine `check`
[…full v1.2.0 markdown report including ## Architecture Drift section…]

---

_Posted by [arch-engine@1.2.0](https://github.com/tharcyn/arch-engine) — [workflow run](…). Baseline derived from PR base SHA `<short-sha>`._
```

The `archEngineVersion` constant in the workflow YAML is
hardcoded at `'1.2.0'`. Consumers should bump it when they
upgrade their `npm install --no-save` specifier.

---

## 6. Baseline Source Strategy

The demo uses the **simplest viable** strategy for baseline
acquisition. Documented at length in the README so consumers can
choose a stronger approach if needed.

### 6.1 Default: cache + git-worktree fallback

| Step | Behaviour |
| --- | --- |
| Restore from cache | `actions/cache@v4` keyed by `arch-engine-baseline-v1-${{ github.event.pull_request.base.sha }}`. Each push to `main` invalidates every PR's cached baseline. |
| Fallback on cache miss | `git worktree add -f --detach ../arch-engine-baseline-source "$BASE_SHA"`; run `arch-engine check --ci --json --json-schema=v2 --output arch-engine-baseline.json` in that worktree; copy the result back; teardown the worktree. |
| Cache update | Implicit — `actions/cache@v4` saves the generated baseline at job end for the next run. |

**Trade-offs:**

- ✅ Self-contained — no separate workflow on `main`, no
  external storage, no secrets.
- ✅ Always compares against the actual base SHA of the PR.
- ⚠️ Worst case (cache miss + full main checkout + install +
  arch-engine run) adds ~30 seconds to first runs after a `main`
  advance. Subsequent PRs against the same base SHA reuse the
  cache instantly.

### 6.2 Production alternatives documented in README

- **Dedicated baseline workflow on `main`.** A separate workflow
  runs on every push to `main`, generates the baseline, and
  uploads it as a long-lived artifact. The PR workflow downloads
  it instead of generating one. Stronger reproducibility;
  requires CI orchestration.
- **Baseline branch.** A bot-tracked branch (e.g.
  `arch-engine-baselines/main`) holds the latest baseline JSON.
  The PR workflow fetches it. Stronger auditability; requires
  write access on the main-tracking workflow.

The demo deliberately stays in the simplest tier so any consumer
repo can copy-paste it without additional infrastructure.

---

## 7. Security Review

### 7.1 No `pull_request_target`

Both new templates trigger on **`pull_request`**, never on
`pull_request_target`. Verification:

```bash
$ grep -R "pull_request_target" examples/github-actions
examples/github-actions/arch-engine-pr-baseline-report.yml:24:#  Triggers on `pull_request`, NEVER `pull_request_target`.
examples/github-actions/arch-engine-pr-baseline-comment.yml:13:#  Triggers on `pull_request`, NEVER `pull_request_target`.
examples/github-actions/arch-engine-pr-baseline-comment.yml:22:#    - `pull_request_target` runs in the base-repo context with
examples/github-actions/README.md:313:- **`on: pull_request`**, never `on: pull_request_target`. The
[…plus the v1.1.0 templates' identical safety comments…]
```

Every match is either a YAML comment (lines prefixed with `#`)
warning against the pattern, or README prose explaining the
risk. No `on:` block uses it. Pinned by the test
`baseline-report workflow does NOT use pull_request_target`
and its comment-workflow sibling.

### 7.2 Permissions

| Workflow | `contents` | `pull-requests` | Other write scopes |
| --- | --- | --- | --- |
| `arch-engine-pr-baseline-report.yml` | `read` | (unset, defaults to read) | none |
| `arch-engine-pr-baseline-comment.yml` | `read` | `write` | none |

The comment workflow's write scope is scoped to commenting on
the pull request that triggered the run. No other write scopes.
Pinned by the test
`baseline-comment workflow declares contents: read + pull-requests: write only`.

### 7.3 Fork PR behaviour

Identical pattern to the v1.1.0 templates:

- **Artifact-only baseline workflow:** works identically on fork
  PRs. The git worktree fallback uses public history, so no
  credentials are required.
- **Sticky-comment baseline workflow:** uploads the artifact on
  fork PRs but the comment-post step is GUARDED by
  `head.repo.full_name == github.repository`. Fork PRs surface
  a `::notice::` log: "Skipped PR comment posting because this
  PR is from a fork."

### 7.4 No secrets

Neither template references `secrets.*` or environment-level
secrets. The default `GITHUB_TOKEN` is sufficient for both.
Verified by the test
`baseline workflows do NOT require any secrets`.

### 7.5 Sticky comment marker

The baseline comment workflow uses a **distinct** sticky marker
(`<!-- arch-engine-baseline-report -->`) from the v1.1.0 comment
workflow (`<!-- arch-engine-report -->`). The two can ship
side-by-side without comment-stacking conflict.

### 7.6 Exit-code preservation

Both baseline workflows use the `set +e` capture pattern so the
artifact upload step always runs before the job exit code
reflects the Arch-Engine verdict. The captured exit code is
re-surfaced via:

```yaml
- name: Fail job on Arch-Engine non-zero exit
  if: steps.arch_engine.outputs.exit_code != '0'
  run: |
    echo "::error::..."
    exit ${{ steps.arch_engine.outputs.exit_code }}
```

This propagates exit 1 (blocking violation), exit 2 (invalid
baseline), exit 3 (adapter failure), exit 5 (internal failure)
correctly while guaranteeing the artifact is uploaded first.

### 7.7 Pinned external action versions

All five external actions used by the baseline workflows are
pinned to a major version: `actions/checkout@v4`,
`actions/setup-node@v4`, `actions/cache@v4`,
`actions/upload-artifact@v4`, `actions/github-script@v7`.
Major-version pinning balances security (no silent upgrades to
compromised versions) with maintainability (security patches
arrive automatically). Consumers can tighten to full SHAs.

### 7.8 No new runtime dependencies in the repo

`grep "@arch-governance/runtime\|@arch-governance/architecture-profile" package.json packages/*/package.json` returns nothing.

The templates use `npm install --no-save @arch-engine/cli@^1.2.0
@arch-engine/adapter-monorepo@^1.2.0` inside the CI runner.
Nothing is added to any `package.json` in this repo or
downstream consumer repos.

---

## 8. Validation Results

| Gate | Result |
| --- | --- |
| `npm run build` | ✅ all packages build |
| `npm run typecheck` | ✅ all 7 tsconfigs clean |
| `npm test` | ✅ **2191 / 2191 tests** across **662 / 662 files** (was 2168 / 662 at v1.2.0 → +23 new baseline workflow tests) |
| Phase G baseline-workflow tests | ✅ **46 / 46** in `cli-experience-phase-g`–neighbour `github-actions-templates.snapshot.test.ts` (was 23 v1.1.0 + 23 new v1.2.0) |
| YAML parse for both templates | ✅ via the `yaml` library already on `packages/cli`'s deps |
| `grep pull_request_target` on baseline workflows (non-comment) | ✅ no `on:` triggers use it; only YAML comments and README prose |
| `grep "@arch-engine/cli@\\^1.2.0"` | ✅ appears in both baseline workflows |
| `grep "arch-engine check --ci --baseline"` | ✅ appears in both baseline workflows + README canonical example |

---

## 9. Remaining Deltas

| Delta | Severity | Notes |
| --- | --- | --- |
| Baseline cache invalidates on every push to `main` | MICRO_DELTA | Documented in README troubleshooting. Correct default — PRs always compare against the current `main`. Consumers who want looser caching can change the cache key to `${{ github.base_ref }}`. |
| First baseline generation on cache miss takes ~30 seconds | MICRO_DELTA | Acceptable for a demo. Documented in README. Stronger production setups (dedicated `main` workflow uploading baselines as artifacts) are documented as alternatives. |
| `archEngineVersion = '1.2.0'` is hardcoded in the comment-workflow footer | MICRO_DELTA | Carried forward from the v1.1.0 comment workflow pattern. Consumers must bump when they upgrade their `--no-save` install specifier. Future iteration could read the version from the report header. |
| `npm install --no-save` adds 1–3 seconds to every CI run for repos without `@arch-engine/cli` in `package.json` | LOW | README documents the `npm ci` alternative for repos that do declare it. |
| 1 moderate-severity `npm audit` finding | LOW | Pre-existing; not introduced by this pass. |

No BLOCKER or HIGH deltas.

---

## 10. Recommended Next Mission

The v1.2.0 product loop is now complete end-to-end:

```
baseline JSON  →  PR check  →  drift markdown report  →  artifact OR sticky comment
```

Pick by product priority:

- **Option A — Private AGP Emitter MVP Implementation Pass.**
  Implement `@arch-engine/agp-emitter@0.1.0` per
  `docs/contracts/agp-emitter-contract.md`. Wires `arch-engine
  check --emit-agp` behind a feature flag. Opens the AGP
  governance integration track with a real consumer surface.
- **Option B — CLI v1.2.x Baseline Hardening Pass.**
  Tighten the version floor in `baseline-reader.ts` now that
  v1.2.0 has shipped (the spec-side `>= 1.2.0` floor was relaxed
  during implementation; it can now snap into place). Ship the
  deferred `--fail-on-drift`, `--baseline-label`,
  `--current-label`, `--drift-mode` flags. Smaller scope; targets
  power users of the v1.2.0 baseline contract.
- **Option C — Multi-Adapter Surface Pass.**
  Expand workspace-adapter coverage (e.g.,
  `@arch-engine/adapter-pnpm`, `@arch-engine/adapter-yarn-pnp`)
  to enable Arch-Engine on more workspace conventions. Targets
  the user-acquisition / adoption track.

Default to **Option A (AGP Emitter MVP)** — the baseline
comparison loop just landed, the GitHub Actions demo
demonstrates it visibly, and the natural next product
investment is the long-deferred AGP governance track that
existing v1.x audits have been pointing at since the AGP
emitter contract first landed.

*End of audit.*
