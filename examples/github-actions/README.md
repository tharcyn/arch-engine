# Arch-Engine — GitHub Actions templates

Two ready-to-copy workflow templates that turn the v1.1.0 `--format
markdown --output <path>` plumbing into a visible CI surface:

| Template | What it does | Permissions | Works on fork PRs? |
| --- | --- | --- | --- |
| [`arch-engine-pr-report.yml`](./arch-engine-pr-report.yml) | Generates the markdown report and uploads it as a build artifact. | `contents: read` | ✅ Yes |
| [`arch-engine-pr-comment.yml`](./arch-engine-pr-comment.yml) | Same, plus posts/updates a sticky PR comment with the report. | `contents: read`, `pull-requests: write` | ⚠️ Posts comment on internal PRs only; uploads artifact on every PR |

Both fail the job (non-zero exit) when Arch-Engine detects a
blocking architecture violation, so you can make either one a
required status check in branch protection.

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
   # Artifact-only — recommended starter.
   curl -fsSL https://raw.githubusercontent.com/tharcyn/arch-engine/main/examples/github-actions/arch-engine-pr-report.yml \
     -o .github/workflows/arch-engine-pr-report.yml

   # Optional: add the comment workflow on top.
   curl -fsSL https://raw.githubusercontent.com/tharcyn/arch-engine/main/examples/github-actions/arch-engine-pr-comment.yml \
     -o .github/workflows/arch-engine-pr-comment.yml
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
   checks to pass before merging", select the
   `Arch-Engine PR Report` (or `Arch-Engine PR Comment`) job.

## What the canonical command runs

Both templates invoke this single line in CI:

```bash
npx arch-engine check --ci --format markdown --output arch-engine-report.md
```

- `--ci` — deterministic, no-color output. Forces `NO_COLOR=1`
  ahead of color initialisation.
- `--format markdown` — emits the [v1.1.0 markdown
  shape](../../docs/cli/json-v2-ci-flags-spec.md) tuned for PR
  comments.
- `--output arch-engine-report.md` — writes UTF-8 LF, ANSI-stripped,
  with `mkdir -p` of the parent directory and overwrite on every
  run.

Exit codes are unchanged from `check` in any other mode:

| Code | Meaning |
| --- | --- |
| `0` | No blocking architecture violations. |
| `1` | Blocking architecture violations found. |
| `2` | Invalid input or configuration. |
| `3` | Adapter/workspace failure. |
| `5` | Internal invariant failure. |

The workflow `continue-on-error: true` step pattern preserves the
exit code while letting the artifact upload run first.

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

### Pinning versions for reproducibility

The templates use `^1.1.0` in their `npm install` step so consumers
pick up patches automatically. To pin tighter:

- Replace `^1.1.0` with `1.1.0` (or any specific tag).
- Replace `npm install --no-save …` with `npm ci` if your repo
  declares `@arch-engine/cli` in `package.json` and you want
  lockfile-pinned installs.
