# Arch-Engine v1.3.1 Patch Release Preflight

| Field | Value |
| --- | --- |
| Audit version | 1.0 |
| Author | Claude Opus 4.7 (1M context) |
| Date | 2026-05-13 |
| Mission | v1.3.1 Patch Release Preparation Pass |
| Surface under release | `@arch-engine/cli@1.3.1`, `@arch-engine/adapter-pnpm@0.1.1` |
| Predecessor (implementation) | [`audits/ARCH_ENGINE_V1_3_1_ADAPTER_TRUST_POLISH_AUDIT.md`](../ARCH_ENGINE_V1_3_1_ADAPTER_TRUST_POLISH_AUDIT.md) |
| Predecessor (release) | [`audits/release/ARCH_ENGINE_V1_3_0_MINOR_RELEASE_PREFLIGHT.md`](./ARCH_ENGINE_V1_3_0_MINOR_RELEASE_PREFLIGHT.md) |
| Trial that motivated the patch | [`audits/ARCH_ENGINE_V1_3_0_REAL_REPO_ADAPTER_TRIAL.md`](../ARCH_ENGINE_V1_3_0_REAL_REPO_ADAPTER_TRIAL.md) |

---

## 1. Executive Verdict

**`V1_3_1_PATCH_READY_FOR_HUMAN_NPM_PUBLISH`**

The Adapter Trust Polish patch is fully prepared for a v1.3.1
patch release:

- Source changes from the polish implementation pass are landed
  and unchanged.
- `@arch-engine/cli` bumped from `1.3.0` to `1.3.1`.
- `@arch-engine/adapter-pnpm` bumped from `0.1.0` to `0.1.1`.
- `@arch-engine/cli` `peerDependencies["@arch-engine/adapter-pnpm"]`
  bumped from `^0.1.0` to `^0.1.1` (kept optional via
  `peerDependenciesMeta`).
- `CHANGELOG.md` documents v1.3.1.
- Build, typecheck, full test suite (670 files / 2300 tests), the
  focused 8 adapter test files (108 tests), and the 162 freeze test
  files (357 tests) all pass.
- `npm pack --dry-run` is clean for both bumped packages and emits
  the right filenames (`arch-engine-cli-1.3.1.tgz`,
  `arch-engine-adapter-pnpm-0.1.1.tgz`).
- A local public-style tarball install of the v1.3.1 tarballs
  alongside the existing public `@arch-engine/adapter-monorepo@1.3.0`
  was exercised end-to-end: `--version`, `doctor` (human),
  `doctor --json` (v1), `inspect --json --json-schema=v2`.
- `npm whoami` returns `tharcyn`; `@arch-engine/cli@1.3.1` and
  `@arch-engine/adapter-pnpm@0.1.1` do not yet exist on the npm
  registry (both 404).
- No git tag created. No `npm publish` performed.

Publish can proceed manually using the commands in §11.

---

## 2. Scope

Targeted patch release.

- Bumps the two packages that received source changes during the
  v1.3.1 Adapter Trust Polish pass.
- Leaves the six unchanged packages at `1.3.0` — no source there
  was touched, and no dependency constraint forces lockstep
  bumps.
- No new public command, flag, error code, or JSON shape.
- No npm publish in this pass. No git tag in this pass.

---

## 3. Packages Included

### Bumped

| Package | From | To | Reason |
| --- | --- | --- | --- |
| `@arch-engine/cli` | `1.3.0` | `1.3.1` | Doctor human-render disambiguation + LOW_CONFIDENCE fix text. |
| `@arch-engine/adapter-pnpm` | `0.1.0` | `0.1.1` | Deterministic `packageManagerVersion` serialisation. |

### Unchanged (intentionally not bumped)

| Package | Version | Why no bump |
| --- | --- | --- |
| `@arch-engine/schema` | `1.3.0` | No source touched. No new schema. |
| `@arch-engine/core` | `1.3.0` | No source touched. |
| `@arch-engine/adapter-monorepo` | `1.3.0` | No source touched. Continues to interoperate with `@arch-engine/cli@1.3.1` via the existing peer dependency range `^1.3.0`. |
| `@arch-engine/governance-pack-authority` | `1.3.0` | No source touched. |
| `@arch-engine/governance-pack-rest-contract` | `1.3.0` | No source touched. |
| `@arch-engine/governance-pack-journey` | `1.3.0` | No source touched. |
| arch-engine root | `1.0.0` | Private root package; not published. Not part of the npm release surface. |
| `arch-engine-action`, `@arch-engine/adapter-github`, `@arch-engine/adapter-gitlab` | (private workspaces / public surface unchanged) | No source touched. |

### Dependency / peer-dependency wiring

`@arch-engine/cli@1.3.1` `peerDependencies`:

```jsonc
{
  "@arch-engine/adapter-monorepo": "^1.3.0",   // unchanged
  "@arch-engine/adapter-pnpm":     "^0.1.1"    // bumped from ^0.1.0
}
```

Both peers remain optional via `peerDependenciesMeta`. The bumped
range admits the new `0.1.1` adapter; `0.1.0` consumers see a
peerDependency-range warning rather than a hard failure — which
is acceptable for a patch that only tightens the wire of an
already-optional peer.

---

## 4. Changes Included

The patch ships the three v1.3.0 real-repo trial findings landed
by the implementation pass:

1. **Doctor confidence-label disambiguation (P3-1).**
   Human render now reads `Adapter selected: <name> (<X> adapter
   confidence)` and `Topology signal: <X> (<description>)`,
   instead of two separately-labelled "Confidence:" lines that
   read as a contradiction on single-package fallback runs.

2. **`ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE` fix text (P3-2).**
   `defaultFix` now explicitly addresses the
   `pnpm-lock.yaml`-without-`pnpm-workspace.yaml` edge case, the
   npm/yarn `workspaces` field requirement, and the
   informational status of the warning on legitimate
   single-package repositories.

3. **`packageManagerVersion` metadata determinism (MICRO_DELTA).**
   `data.adapter.metadata.pnpm.packageManagerVersion` is now
   always present in JSON v2, parsed to the bare version string
   (e.g. `"9.0.0"`), and `null` when absent.

Implementation file inventory (verbatim from the polish-pass
audit §2):

- `packages/cli/src/commands/doctor.ts`
- `packages/cli/src/error-codes.ts`
- `packages/adapter-pnpm/src/index.ts`
- `packages/cli/tests/adapters/adapter-pass-2b-surfaces.test.ts`
- `packages/cli/tests/adapters/adapter-json-v2-metadata.test.ts`
- `packages/cli/tests/cli-experience-phase-e.test.ts`
- `packages/adapter-pnpm/tests/pnpm-adapter.test.ts`

Release-prep additions in this pass:

- `packages/cli/package.json` (version `1.3.0` → `1.3.1`,
  peerDependency `^0.1.0` → `^0.1.1`).
- `packages/adapter-pnpm/package.json` (version `0.1.0` → `0.1.1`).
- `package-lock.json` (lockfile reflection of the bumps).
- `CHANGELOG.md` (new `## [1.3.1]` section).
- `audits/ARCH_ENGINE_V1_3_1_ADAPTER_TRUST_POLISH_AUDIT.md` (new
  audit from the polish-pass; carried into this commit).
- `audits/release/ARCH_ENGINE_V1_3_1_PATCH_RELEASE_PREFLIGHT.md`
  (this file).

---

## 5. Patch Justification

This is a patch release under [Semantic Versioning](https://semver.org/)
because:

- **No new public CLI command.** The five-command surface
  (`doctor`, `inspect`, `analyze`, `check`, `explain`) is
  unchanged.
- **No new public flag.** `--json`, `--json-schema=v2`,
  `--quiet`, `--verbose`, `--baseline`, `--output`, etc.,
  unchanged.
- **No new `ARCH_ENGINE_*` error code.** The 22-code vocabulary
  locked in v1.3.0 is unchanged. The only code-metadata edit is
  to `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE.defaultFix` — a longer,
  more actionable message at the same severity/exit-code/title.
- **No topology semantics change.** `graphSurfaceHash` for every
  fixture is byte-identical to v1.3.0 (verified by the existing
  parity tests).
- **No adapter selection behavior change.** The deterministic
  registry, precedence ordering, cache-hint protocol, and
  RESOLVED/CONFLICT/LOW_CONFIDENCE/NONE classification are
  unchanged.
- **No JSON v1 change.** v1 envelope shape and key list are
  byte-identical.
- **No JSON v2 envelope shape change.** Top-level keys
  (`archEngineVersion`, `artifacts`, `command`, `data`,
  `diagnostics`, `emittedAt`, `exitCode`, `nextActions`,
  `schemaVersion`, `status`, `summary`) are unchanged.
- **JSON v2 metadata determinism is consumer-safe.** No existing
  consumer had a well-defined dependency on either the
  sometimes-absent or the raw-`pnpm@…` form of
  `packageManagerVersion`; the new behavior is the deterministic
  shape implied by the spec.
- **No AGP dependency.** `@arch-governance/*` not introduced.
- **No node-version requirement change.** Both packages still
  declare `engines.node: ">=18.0.0"`.

Semver-policy result: **patch**.

---

## 6. Compatibility Statement

| Surface | v1.3.0 | v1.3.1 | Compatibility |
| --- | --- | --- | --- |
| JSON v1 default `--json` envelope | flat object | flat object, identical keys | **unchanged** |
| JSON v2 envelope top-level keys | as documented | same | **unchanged** |
| `data.adapter.metadata.pnpm.packageManagerVersion` | sometimes absent or raw `"pnpm@x.y.z"` | always present; parsed `"x.y.z"` or `null` | **deterministic** (the only intentional delta) |
| Adapter selection | precedence 2 → pnpm, 4 → monorepo, cache hint protocol | same | **unchanged** |
| `graphSurfaceHash` per fixture | byte-stable | byte-stable, identical to v1.3.0 | **unchanged** |
| Exit codes (0/1/2/3/5) | as documented | same | **unchanged** |
| `ARCH_ENGINE_*` code vocabulary | 22 codes | 22 codes | **unchanged** |
| `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE.defaultFix` | short | expanded with edge-case guidance | **patch-safe wording change** |
| Doctor human render labels | shared "Confidence" wording | "Adapter selected: … (X adapter confidence)" + "Topology signal: …" | **human-render polish** |
| CLI flags / commands | as in v1.3.0 | same | **unchanged** |
| Node engines | `>=18.0.0` | `>=18.0.0` | **unchanged** |
| AGP dependency | not present | not present | **unchanged** |

All v1.3.0 consumers can upgrade with no code changes.

---

## 7. Validation Results

| Check | Command | Result |
| --- | --- | --- |
| Install | `npm install` | up to date |
| Build | `npm run build` | all 17 workspace packages built |
| Typecheck | `npm run typecheck` | exit 0 across 8 tsconfig projects |
| Full tests | `npm test` | **670 files, 2300 tests passed, 0 failed** |
| Focused adapter tests | `npx vitest run packages/cli/tests/adapters packages/adapter-pnpm/tests` | **8 files, 108 tests passed** |
| Freeze tests | `npx vitest run packages/core/tests/freeze` | **162 files, 357 tests passed** |
| Root pack | `npm pack --dry-run` | clean (`arch-engine-1.0.0.tgz`, 87 files, 589.9 kB — root is private and not part of the release surface) |

No test was skipped, relaxed, or removed.

---

## 8. Package Pack Dry-Run Results

### `@arch-engine/adapter-pnpm@0.1.1`

```
name:           @arch-engine/adapter-pnpm
version:        0.1.1
filename:       arch-engine-adapter-pnpm-0.1.1.tgz
package size:   12.2 kB
unpacked size:  46.1 kB
total files:    8
shasum:         5ae90d3cc8bd1a9aed97d4ebe90470da935a4510
```

### `@arch-engine/cli@1.3.1`

```
name:           @arch-engine/cli
version:        1.3.1
filename:       arch-engine-cli-1.3.1.tgz
package size:   36.5 kB
unpacked size:  170.1 kB
total files:    18
shasum:         c40b5c784bffe0decd31569d119564823c52bc2d
```

Both tarballs contain only the published `files` patterns
(`dist`, `README.md`, `LICENSE`) and the `package.json` — no
source maps in dist for cli, no test files, no node_modules.

---

## 9. Local Public-Style Tarball Smoke

A clean consumer in `mktemp -d` was set up and installed:

- the locally-packed `arch-engine-cli-1.3.1.tgz`,
- the locally-packed `arch-engine-adapter-pnpm-0.1.1.tgz`,
- `@arch-engine/adapter-monorepo@1.3.0` (unchanged, pulled
  fresh from npm).

`@arch-engine/core@1.3.0` and `@arch-engine/schema@1.3.0` were
transitively resolved.

| Invocation | Verified behavior |
| --- | --- |
| `npx arch-engine --version` | reports `arch-engine/1.3.1 darwin-arm64 node-v25.2.1` ✅ |
| `npx arch-engine doctor` (single-package cwd) | shows `⚠ Adapter selected: @arch-engine/adapter-monorepo (LOW adapter confidence)` and `✔ Topology signal: HIGH (Structured single workspace extraction)` — disambiguation working ✅ |
| `npx arch-engine doctor` (pnpm fixture) | shows `✔ Adapter selected: @arch-engine/adapter-pnpm (HIGH adapter confidence)` and `✔ Topology signal: HIGH (Structured pnpm workspace extraction)` ✅ |
| `npx arch-engine doctor --json` (v1) | flat shape, top-level keys unchanged; `data` and `adapter` keys NOT present ✅ |
| `npx arch-engine inspect --json --json-schema=v2` on pnpm-workspace-protocol fixture | `data.adapter.metadata.pnpm.packageManagerVersion === "9.0.0"` (parsed; not `"pnpm@9.0.0"`) ✅ |
| `npx arch-engine inspect --json --json-schema=v2` on pnpm-basic fixture | `data.adapter.metadata.pnpm.packageManagerVersion === null` (always present; explicit null) ✅ |

All exit codes were `0`. The temp directory was removed at the
end of the smoke pass.

---

## 10. npm Registry Preflight

| Check | Command | Result |
| --- | --- | --- |
| Auth | `npm whoami` | `tharcyn` (logged in to public registry) |
| Target version not published — CLI | `npm view @arch-engine/cli@1.3.1 version` | `E404` (not published — correct) |
| Target version not published — adapter-pnpm | `npm view @arch-engine/adapter-pnpm@0.1.1 version` | `E404` (not published — correct) |
| Latest published — CLI | `npm view @arch-engine/cli versions` | tail: `1.0.0-rc.3, 1.0.0, 1.0.1, 1.0.2, 1.0.3, 1.1.0, 1.2.0, 1.3.0` |
| Latest published — adapter-pnpm | `npm view @arch-engine/adapter-pnpm versions` | `[ "0.1.0" ]` |

Ready for human-driven publish.

---

## 11. Manual Publish Commands

Run from the repo root. **Order matters:** publish
`@arch-engine/adapter-pnpm@0.1.1` first so that `@arch-engine/cli@1.3.1`'s
peer dependency target is visible on the registry by the time the
CLI is published.

```bash
npm publish --workspace @arch-engine/adapter-pnpm --access public
npm publish --workspace @arch-engine/cli           --access public
```

Notes:

- `--access public` is required because both packages are scoped
  (`@arch-engine/…`).
- Use 2FA / OTP if your npm account is configured for it (npm
  will prompt; pass `--otp=<code>` to script around it).
- Do **not** add `--tag latest` explicitly — npm defaults the
  scoped publish to the `latest` dist-tag, which is what we want.
- Do **not** pass `--no-verify` or similar.

If either publish fails partway, do not retry without inspecting
state. The cli publish is the second step and can be safely
retried because adapter-pnpm@0.1.1 will already be on the
registry.

---

## 12. Post-Publish Verification Commands

```bash
npm view @arch-engine/adapter-pnpm@0.1.1 version
# Expected: 0.1.1

npm view @arch-engine/cli@1.3.1 version
# Expected: 1.3.1
```

For a full end-to-end check after publish, you can repeat the §9
smoke in a fresh `mktemp -d` consumer, this time installing
directly from the public registry rather than from local
tarballs:

```bash
npm install --no-audit --no-fund --save-dev \
  @arch-engine/cli@1.3.1 \
  @arch-engine/adapter-monorepo@1.3.0 \
  @arch-engine/adapter-pnpm@0.1.1
npx arch-engine --version   # → arch-engine/1.3.1 …
```

---

## 13. Git Tag Commands

**Do not run these in the release-prep pass.** Run them after a
successful npm publish so the tags refer to the exact commit
that was published.

```bash
git tag arch-engine-v1.3.1
git tag adapter-pnpm-v0.1.1
git push origin main --tags
```

Rationale: tagging after publish — not before — means the tag is
only created if the publish actually succeeded, eliminating the
window where a tag could refer to a never-published version.

---

## 14. Remaining Deltas

None. All three v1.3.0 trial findings are addressed in the
shipped source, covered by tests, and verified in the local
smoke pass.

The previously-known forward-investment options remain
unchanged:

- Yarn PnP adapter (`@arch-engine/adapter-yarn-pnp`) — explicitly
  out of scope for v1.3.1, candidate for the next mission.
- pnpm Adapter Hardening (catalog resolution, deeper
  `pnpm-lock.yaml` parsing) — still deferred; the v1.3.1 catalog
  `LOCKFILE_UNSUPPORTED` INFO diagnostic remains honest and
  non-blocking.
- Monorepo Adapter Hardening (root-inclusion asymmetry) — still
  deferred; documented and pinned by the existing parity test.

---

## 15. Recommended Next Mission

**`ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_MVP`** — implement
`@arch-engine/adapter-yarn-pnp@0.1.0`, registering it at
precedence 3 between the pnpm adapter (precedence 2) and the
monorepo adapter (precedence 4). Per the multi-adapter surface
spec §10, the MVP is package.json-shape-based and does not
execute `.pnp.cjs`, so it reuses ~90% of the monorepo adapter's
edge extraction; only the detection inputs change. The
`ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` code is already in the
vocabulary (added by Pass 2).

### Alternative

**`ARCH_ENGINE_PRIVATE_AGP_EMITTER_MVP`** — implement the AGP
emitter contract specified in
`docs/agp/emitter-contract-spec.md`, behind an internal-only
import path so it remains private and adds no public surface.
Useful if the team prioritises the AGP integration arc over the
next workspace shape.

Either mission can proceed safely on top of v1.3.1.

---

## 16. Commands Run

```bash
# Phase 1 — repo state
git status --short
git branch --show-current
git remote -v
git log --oneline --decorate -n 25
git tag --list "arch-engine-v1.3.0"
git tag --list "adapter-pnpm-v0.1.0"
git ls-remote --tags origin "arch-engine-v1.3.0"
git ls-remote --tags origin "adapter-pnpm-v0.1.0"

# Phase 2 — diff inspection
git diff --stat
git diff --name-status

# Phase 4 — version bumps
$EDITOR packages/cli/package.json
$EDITOR packages/adapter-pnpm/package.json
npm install

# Phase 5 — changelog
$EDITOR CHANGELOG.md

# Phase 7 — validation
npm install
npm run build
npm run typecheck
npm test
npx vitest run packages/cli/tests/adapters packages/adapter-pnpm/tests --reporter=verbose
npx vitest run packages/core/tests/freeze
npm pack --dry-run
npm --workspace @arch-engine/adapter-pnpm pack --dry-run
npm --workspace @arch-engine/cli           pack --dry-run

# Phase 8 — local tarball smoke
SMOKE_ROOT=$(mktemp -d -t arch-engine-v131-smoke.XXXXXX)
mkdir -p "$SMOKE_ROOT/packs" "$SMOKE_ROOT/runner"
npm --workspace @arch-engine/adapter-pnpm pack --pack-destination "$SMOKE_ROOT/packs"
npm --workspace @arch-engine/cli           pack --pack-destination "$SMOKE_ROOT/packs"
(cd "$SMOKE_ROOT/runner" && npm init -y >/dev/null && \
  npm install --no-audit --no-fund --save-dev \
    "$SMOKE_ROOT/packs/arch-engine-adapter-pnpm-0.1.1.tgz" \
    "$SMOKE_ROOT/packs/arch-engine-cli-1.3.1.tgz" \
    @arch-engine/adapter-monorepo@1.3.0)
"$SMOKE_ROOT/runner/node_modules/.bin/arch-engine" --version
"$SMOKE_ROOT/runner/node_modules/.bin/arch-engine" doctor
"$SMOKE_ROOT/runner/node_modules/.bin/arch-engine" doctor --json
"$SMOKE_ROOT/runner/node_modules/.bin/arch-engine" inspect --json --json-schema=v2  # in pnpm-* fixtures
rm -rf "$SMOKE_ROOT"

# Phase 9 — registry preflight
npm whoami
npm view @arch-engine/cli@1.3.1 version           || true
npm view @arch-engine/adapter-pnpm@0.1.1 version  || true
npm view @arch-engine/cli versions
npm view @arch-engine/adapter-pnpm versions

# Phase 10 — hygiene
git status --short
git diff --stat
find . -maxdepth 5 -name "*.tgz" -type f -print
grep -R "@arch-governance/" package.json packages/*/package.json
```

No `npm publish` was executed. No git tag was created.

---

*End of v1.3.1 Patch Release Preflight.*
