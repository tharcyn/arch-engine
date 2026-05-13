# Arch-Engine — GitHub Actions templates

Four ready-to-copy workflow templates. The first pair (v1.1.0
markdown PR report) covers the basic "post a current-state
architecture report on every PR" use case. The second pair
(v1.2.0 baseline comparison) covers the richer "compare this PR
against the base branch and surface what changed" use case.

### v1.1.0 — Current-state PR report

| Template | What it does | Permissions | Works on fork PRs? |
| --- | --- | --- | --- |
| [`arch-engine-pr-report.yml`](./arch-engine-pr-report.yml) | Generates the markdown report and uploads it as a build artifact. | `contents: read` | ✅ Yes |
| [`arch-engine-pr-comment.yml`](./arch-engine-pr-comment.yml) | Same, plus posts/updates a sticky PR comment with the report. | `contents: read`, `pull-requests: write` | ⚠️ Posts comment on internal PRs only; uploads artifact on every PR |

### v1.2.0 — Baseline / drift report

| Template | What it does | Permissions | Works on fork PRs? |
| --- | --- | --- | --- |
| [`arch-engine-pr-baseline-report.yml`](./arch-engine-pr-baseline-report.yml) | Restores/generates a baseline from the PR's base SHA, runs `check --baseline`, uploads the drift-aware markdown report + baseline JSON. | `contents: read` | ✅ Yes |
| [`arch-engine-pr-baseline-comment.yml`](./arch-engine-pr-baseline-comment.yml) | Same, plus posts/updates a sticky PR comment with the **architecture drift** report. | `contents: read`, `pull-requests: write` | ⚠️ Posts comment on internal PRs only; uploads artifacts on every PR |

All four templates fail the job (non-zero exit) when Arch-Engine
detects a blocking architecture violation, so you can make any of
them a required status check in branch protection.

**Which pair should I pick?**

- Use the **v1.1.0 pair** if you just want to surface the current
  architectural state of each PR (no comparison).
- Use the **v1.2.0 pair** if you want to surface **what changed**
  in this PR vs. the base branch — added edges, new policy
  violations, score deltas, etc. The richer report is the natural
  upgrade once your team has policy in place.

You can ship one pair side-by-side with the other; they use
distinct artifact names (`arch-engine-report` vs.
`arch-engine-baseline-report`) and distinct sticky-comment markers
(`<!-- arch-engine-report -->` vs.
`<!-- arch-engine-baseline-report -->`), so they will not
collide.

## Recommended setup

**Universal default:** copy `arch-engine-pr-report.yml` to
`.github/workflows/arch-engine-pr-report.yml`. Every PR — internal
or from a fork — gets the artifact, and required-status-check
gating works on both.

**Internal PR comments (optional):** if your team mostly works
from internal branches and wants the markdown rendered inline on
the PR conversation, additionally copy
`arch-engine-pr-comment.yml`. Fork PRs continue to use the
artifact path (the comment workflow falls back gracefully).

You can ship both side-by-side. They produce the same artifact
name (`arch-engine-report`), so the artifact step is interchangeable
between them.

## Quickstart

1. **Copy a template into your repo.**

   ```bash
   # v1.1.0: artifact-only current-state report — recommended starter.
   curl -fsSL https://raw.githubusercontent.com/tharcyn/arch-engine/main/examples/github-actions/arch-engine-pr-report.yml \
     -o .github/workflows/arch-engine-pr-report.yml

   # v1.1.0: optional comment workflow on top.
   curl -fsSL https://raw.githubusercontent.com/tharcyn/arch-engine/main/examples/github-actions/arch-engine-pr-comment.yml \
     -o .github/workflows/arch-engine-pr-comment.yml

   # v1.2.0: artifact-only baseline / drift report.
   curl -fsSL https://raw.githubusercontent.com/tharcyn/arch-engine/main/examples/github-actions/arch-engine-pr-baseline-report.yml \
     -o .github/workflows/arch-engine-pr-baseline-report.yml

   # v1.2.0: optional baseline comment workflow.
   curl -fsSL https://raw.githubusercontent.com/tharcyn/arch-engine/main/examples/github-actions/arch-engine-pr-baseline-comment.yml \
     -o .github/workflows/arch-engine-pr-baseline-comment.yml
   ```

2. **(Optional) Add a policy file** at `.archengine/policy.yml`
   declaring the architecture rules you want enforced. Without a
   policy, the report still generates (verdict: `Not enforced`)
   so you can see what topology Arch-Engine extracted before
   investing in rules.

3. **Open a pull request.** The job appears in the PR's "Checks"
   tab, the artifact is downloadable from the run page, and the
   comment (if enabled) appears in the PR conversation.

4. **(Optional) Gate merges on the check.** In your repository
   settings → Branches → branch protection rule → "Require status
   checks to pass before merging", select the appropriate
   workflow job name.

## What the canonical commands run

The **v1.1.0 templates** invoke a single line in CI:

```bash
npx arch-engine check --ci --format markdown --output arch-engine-report.md
```

The **v1.2.0 baseline templates** invoke the baseline-aware
variant:

```bash
npx arch-engine check --ci --baseline arch-engine-baseline.json \
  --format markdown --output arch-engine-report.md
```

- `--ci` — deterministic, no-color output. Forces `NO_COLOR=1`
  ahead of color initialisation.
- `--baseline arch-engine-baseline.json` (v1.2.0) — compare the
  current PR against a prior JSON v2 envelope. Must be a JSON v2
  report produced by `check`, `analyze`, or `inspect`. See
  [`docs/cli/baseline-comparison-spec.md`](../../docs/cli/baseline-comparison-spec.md).
- `--format markdown` — emits the [v1.1.0 markdown
  shape](../../docs/cli/json-v2-ci-flags-spec.md) tuned for PR
  comments. v1.2.0 additionally renders a `## Architecture Drift`
  section.
- `--output arch-engine-report.md` — writes UTF-8 LF, ANSI-stripped,
  with `mkdir -p` of the parent directory and overwrite on every
  run.

Exit codes are unchanged from `check` in any other mode:

| Code | Meaning |
| --- | --- |
| `0` | No blocking architecture violations. |
| `1` | Blocking architecture violations found. |
| `2` | Invalid input or configuration. |
| `3` | Adapter/workspace failure (includes adapter selection conflicts in v1.3.0+). |
| `5` | Internal invariant failure. |

The workflow `continue-on-error: true` step pattern preserves the
exit code while letting the artifact upload run first.

### Works with pnpm workspaces (v1.3.0+)

These templates are **package-manager agnostic**. The CLI invocations
above do not change for pnpm-managed repositories. To pick up the
richer pnpm workspace handling shipped by `@arch-engine/adapter-pnpm@0.1.0`
(`pnpm-workspace.yaml`, glob expansion, `workspace:*` protocols,
exclusion globs), install it alongside the CLI in your workflow:

```yaml
      - name: Install Arch-Engine
        run: npm install --no-save @arch-engine/cli @arch-engine/adapter-monorepo @arch-engine/adapter-pnpm

      # …existing arch-engine step unchanged…
```

When the adapter is present, `arch-engine doctor` reports the
selected adapter on a single line:

```
✔ Adapter: @arch-engine/adapter-pnpm (HIGH confidence)
```

and JSON v2 output (`--json --json-schema=v2`) carries a
`data.adapter` block with the chosen adapter's identity, confidence,
and metadata. JSON v1 default output is unaffected. If your CI
installs dependencies with `pnpm install` already, leave that step
where it is — Arch-Engine never invokes the package manager itself.

## Sample output

When the [`examples/demo-drift`](../demo-drift/) fixture is the
target, the report looks like:

```markdown
# Arch-Engine `check`

**Verdict:** Blocked

| Metric | Value |
| --- | --- |
| Stability | CRITICAL (0.47 / 1.00) |
| Coverage | 100% |
| Connectivity | 100% |
| Confidence | HIGH |
| Policy | configured (enforce mode) |

## Violations (1)

| Rule | From | To | Severity | CI-blocking |
| --- | --- | --- | --- | --- |
| `frontend-must-not-touch-payment-gateway` | `@demo-drift/frontend` | `@demo-drift/payments` | error | yes |

## Diagnostics (1)

- **`ARCH_ENGINE_BLOCKING_VIOLATION`** (BLOCKING): Detected 1 blocking architecture violation in enforce mode. Each violation appears in the `violations[]` array below.

## Next

- Remove or re-route the offending edge(s) above, or update your policy to allow them.

---

_Exit 1 — blocking architecture violations._
```

The report is deterministic across runs (modulo wall-clock metric
values), capped at 50 violations / 25 diagnostics / 250 KB total,
and contains no absolute paths.

## Baseline comparison workflows (v1.2.0)

The baseline workflows
([`arch-engine-pr-baseline-report.yml`](./arch-engine-pr-baseline-report.yml),
[`arch-engine-pr-baseline-comment.yml`](./arch-engine-pr-baseline-comment.yml))
extend the v1.1.0 templates with cross-run **architecture drift
detection**. Each PR is compared against a baseline produced from
the PR's base branch SHA, and the report surfaces what changed:

- new violating edges (policy-blocking drift)
- added / removed workspace dependency edges (topology drift)
- score / coverage / connectivity deltas (signal drift)

### How the baseline is produced

Both baseline templates use the same two-step strategy:

1. **Restore from cache** — `actions/cache@v4` keyed by
   `arch-engine-baseline-v1-${{ github.event.pull_request.base.sha }}`.
   When the cache hits, the prior run's baseline is reused
   instantly.
2. **Generate fresh on cache miss** — the workflow creates a
   detached `git worktree` at the PR's base SHA and runs
   `arch-engine check --ci --json --json-schema=v2 --output
   arch-engine-baseline.json` there, then caches the result for
   the next PR.

The baseline JSON is uploaded alongside the markdown report so
reviewers can inspect either side of the drift comparison.

### Stronger production strategies

The cache-keyed baseline is the simplest viable demo. Production
teams may prefer one of the following:

- **Dedicated baseline workflow on `main`.** A separate workflow
  runs on every push to `main`, generates the baseline, and
  uploads it as a long-lived artifact (or to S3 / GCS). The PR
  workflow downloads that artifact instead of generating one.
  Stronger reproducibility; requires CI orchestration.
- **Baseline branch.** A bot-tracked branch (e.g.
  `arch-engine-baselines/main`) holds the latest `arch-engine-baseline.json`.
  The PR workflow fetches that branch with read-only credentials.
  Stronger auditability; requires write access on the main-tracking
  workflow.

This demo deliberately keeps the baseline-acquisition logic
self-contained so any consumer repo can copy-paste it without
additional infrastructure.

### Fork PR behaviour for baseline workflows

Same as the v1.1.0 templates:

- **Artifact-only baseline workflow** works identically on fork
  PRs (no comment to post).
- **Sticky-comment baseline workflow** uploads the artifact on
  fork PRs but skips the comment-posting step with a `::notice::`
  log line.

### Baseline workflow exit codes

Per the v1.2.0 baseline-comparison contract, **drift alone never
fails CI**. The exit code is computed strictly from the PR's
current state:

| Code | Meaning |
| --- | --- |
| `0` | Current run has no blocking violations. Drift, if any, is reported as an INFO diagnostic (`ARCH_ENGINE_DRIFT_DETECTED`). |
| `1` | Current run has blocking architecture violations. Whether they are "new" (vs. baseline) is reported in the drift block, but doesn't affect the gate. |
| `2` | Baseline file invalid (missing, wrong schema, wrong command, etc.). Structured diagnostic emitted via `ARCH_ENGINE_BASELINE_*`. |
| `3` | Adapter / extraction failure. |
| `5` | Internal invariant failure. |

The workflow uses a `set +e` capture pattern so artifacts are
ALWAYS uploaded before the exit code is re-surfaced as a job
failure.

### Sample baseline-drift output

When a PR adds a new violating edge, the markdown report includes
the v1.2.0 drift section:

```markdown
# Arch-Engine `check`

**Verdict:** Blocked _(drift: +1 violation, +1 edge)_

| Metric | Value |
| --- | --- |
| Stability | CRITICAL (0.47 / 1.00) |
| Coverage | 100% |
| Policy | configured (enforce mode) |

## Violations (1)

| Rule | From | To | Severity | CI-blocking |
| --- | --- | --- | --- | --- |
| `frontend-must-not-touch-payment-gateway` | `@your-org/frontend` | `@your-org/payments` | error | yes |

## Architecture Drift

Compared against `arch-engine-baseline.json` (arch-engine@1.2.0).

| Type | Count |
| --- | ---: |
| New blocking violations | 1 |
| Added edges | 1 |

### New violating edges

| Rule | From | To | Severity | CI-blocking |
| --- | --- | --- | --- | --- |
| `frontend-must-not-touch-payment-gateway` | `@your-org/frontend` | `@your-org/payments` | error | yes |

### Added edges

| From | To | Type |
| --- | --- | --- |
| `@your-org/frontend` | `@your-org/payments` | `workspace_dependency` |

...
```

For the full v1.2.0 contract, see
[`docs/cli/baseline-comparison-spec.md`](../../docs/cli/baseline-comparison-spec.md).

## Security posture

Both templates are designed to be safe to copy into any
repository, including public ones:

- **`on: pull_request`**, never `on: pull_request_target`. The
  former runs in the fork's context with a read-only token; the
  latter runs in the base repo's context with write access, which
  is a documented attack surface against untrusted code.
- **Least-privilege permissions.** The artifact workflow uses
  `contents: read` only. The comment workflow adds
  `pull-requests: write` — strictly scoped to commenting on the
  pull request that triggered the run.
- **No secrets required.** Neither template references `secrets.*`
  or environment-level secrets. The default `GITHUB_TOKEN` is
  sufficient.
- **No external runtime dependencies on top of npm.** Both
  templates rely only on first-party GitHub actions
  (`actions/checkout`, `actions/setup-node`,
  `actions/upload-artifact`, `actions/github-script`) and the
  public npm registry.

### Fork limitations

GitHub deliberately restricts `pull_request`-triggered workflows
to a read-only `GITHUB_TOKEN` when the PR is opened from a fork.
That's the right default and we honour it:

- The artifact upload (`actions/upload-artifact@v4`) works on
  fork PRs.
- The comment post (`actions/github-script@v7`) is GUARDED on
  fork PRs — it short-circuits with a `::notice::` log line
  saying "Skipped PR comment posting because this PR is from a
  fork."
- The exit-code gate (`Fail job on blocking violation`) works on
  fork PRs.

If you absolutely need PR comments on fork PRs, the GitHub-blessed
pattern is a two-workflow split: a `pull_request` workflow that
produces the artifact, plus a separate `workflow_run`-triggered
workflow that downloads the artifact and posts the comment.
That pattern is out of scope for these starter templates because
it adds significant complexity. Open an issue if you'd like a
third template covering it.

## Troubleshooting

### "npm ERR! 404 Not Found - GET https://registry.npmjs.org/@arch-engine%2fcli"

The npm registry is throttling or briefly unreachable. Re-run the
job. If it persists, pin a specific version (`@arch-engine/cli@1.1.0`)
in case `^1.1.0` is mis-resolving in your environment.

### "No policy file is configured yet"

The report still generates but the verdict reads "Not enforced"
and no violations are surfaced. Add `.archengine/policy.yml`:

```yaml
# .archengine/policy.yml
version: 1
mode: enforce
rules:
  - id: forbid-frontend-to-payments
    type: forbid
    from: '@your-org/frontend'
    to: '@your-org/payments'
```

See [`docs/cli/json-v2-ci-flags-spec.md`](../../docs/cli/json-v2-ci-flags-spec.md)
and the [`examples/demo-drift/.archengine/policy.yml`](../demo-drift/.archengine/policy.yml)
fixture for the full schema.

### The job fails with exit 1 but the comment/artifact is missing

The artifact upload step uses `if: always()` — it runs even when
the check fails. If you still don't see the artifact, the most
common cause is the file failed to write (permissions or disk).
Add `ls -la` before the upload step to diagnose.

### "Resource not accessible by integration" when the comment workflow tries to post

The default `GITHUB_TOKEN` is read-only for `pull_request`
workflows triggered from forks. This is by design; see the
[Fork limitations](#fork-limitations) section above.

For internal PRs, double-check that:

1. The workflow file declares `permissions: pull-requests: write`.
2. Your organization-level workflow permission setting is not
   set to "Read repository contents permission" — it must allow
   workflows to use the default token's full permission set or
   to set its own via `permissions:`. See
   *Settings → Actions → General → Workflow permissions*.

### The comment stacks (multiple comments per PR)

The sticky comment is keyed by an HTML marker
`<!-- arch-engine-report -->` at the top of the body. If multiple
workflow files in your repo emit the same marker, they'll fight
over the same sticky slot. Use distinct markers per workflow if
you intentionally want multiple Arch-Engine comments (e.g. one
per fixture).

### Baseline workflow fails with exit 2 and a `ARCH_ENGINE_BASELINE_*` diagnostic

The PR's baseline file is structurally invalid. Most common
causes:

- **`ARCH_ENGINE_BASELINE_NOT_FOUND`** — `arch-engine-baseline.json`
  is missing. The cache miss + fallback path failed to produce one,
  or the fallback was skipped because the workflow couldn't access
  the base SHA. Verify `actions/checkout@v4` has `fetch-depth: 0`.
- **`ARCH_ENGINE_BASELINE_INVALID`** — the file exists but isn't a
  v1.2.0+ JSON v2 envelope with `data.topology.canonical`. Most
  likely an older v1.1.0 baseline. Re-generate with `arch-engine
  check --ci --json --json-schema=v2 --output baseline.json` using
  `@arch-engine/cli@^1.2.0`.
- **`ARCH_ENGINE_BASELINE_COMMAND_MISMATCH`** — the baseline file
  was produced by `doctor` or `explain` (which don't emit the
  canonical topology). The baseline must come from `check`,
  `analyze`, or `inspect`.

The workflow re-surfaces the diagnostic in the run log; the
baseline JSON is also uploaded as an artifact so you can inspect
it locally.

### Baseline cache misses on every run

The cache key includes the PR's `base.sha`, so each new commit to
`main` invalidates every PR's cached baseline. This is correct
behaviour — it ensures PRs always compare against the current
state of `main`. The fallback step regenerates the baseline in
~10–30 seconds.

If your `main` advances rarely and you want to reuse caches more
aggressively, change the key to use `${{ github.base_ref }}`
instead of `${{ github.event.pull_request.base.sha }}`. Trade-off:
PRs against an older snapshot of `main` will use a stale baseline
until the cache expires (7 days by default).

### Pinning versions for reproducibility

The templates use `^1.1.0` in their `npm install` step so consumers
pick up patches automatically. To pin tighter:

- Replace `^1.1.0` with `1.1.0` (or any specific tag).
- Replace `npm install --no-save …` with `npm ci` if your repo
  declares `@arch-engine/cli` in `package.json` and you want
  lockfile-pinned installs.
