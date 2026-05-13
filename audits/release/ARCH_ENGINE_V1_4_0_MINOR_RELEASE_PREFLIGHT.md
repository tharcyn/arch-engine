# Arch-Engine v1.4.0 Minor Release Preflight

| Field | Value |
| --- | --- |
| Audit version | 1.0 |
| Author | Claude Opus 4.7 (1M context) |
| Date | 2026-05-13 |
| Mission | v1.4.0 Minor Release Preparation Pass |
| Surface under release | `@arch-engine/cli@1.4.0`, `@arch-engine/adapter-monorepo@1.3.1`, **new** `@arch-engine/adapter-yarn-pnp@0.1.0` |
| Predecessor (implementation) | [`audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_IMPLEMENTATION_AUDIT.md`](../ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_IMPLEMENTATION_AUDIT.md) |
| Predecessor (trial) | [`audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md`](../ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md) |
| Predecessor (hygiene) | [`audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_RELEASE_HYGIENE_AUDIT.md`](../ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_RELEASE_HYGIENE_AUDIT.md) |
| Predecessor (release) | [`audits/release/ARCH_ENGINE_V1_3_1_PATCH_RELEASE_PREFLIGHT.md`](./ARCH_ENGINE_V1_3_1_PATCH_RELEASE_PREFLIGHT.md) |

---

## 1. Executive Verdict

**`V1_4_0_RELEASE_READY_FOR_HUMAN_NPM_PUBLISH`**

The v1.4.0 minor release is fully prepared:

- `@arch-engine/cli` bumped `1.3.1 → 1.4.0`.
- `@arch-engine/adapter-monorepo` already at `1.3.1` (bumped in
  the implementation commit `6778d52` as part of the yarn-pnp
  cache-hint protocol). Ready to publish.
- New `@arch-engine/adapter-yarn-pnp@0.1.0` ready for its first
  npm release.
- CLI's `peerDependencies["@arch-engine/adapter-monorepo"]`
  tightened from `^1.3.0` → `^1.3.1` so the cache-hint decline
  is guaranteed available to v1.4.0 consumers.
- All other packages (`adapter-pnpm@0.1.1`, `core@1.3.0`,
  `schema@1.3.0`, three governance packs) unchanged — no source
  there was touched.
- `CHANGELOG.md` documents v1.4.0 with full per-package version
  table and Yarn PnP capability summary.
- [`docs/releases/v1.4.0.md`](../../docs/releases/v1.4.0.md)
  written with install commands, JSON v2 example,
  `nodeLinkerSource` provenance contract, limitations,
  migration guidance, and trial citation.
- Build, typecheck, full test suite (674 files, **2385 tests**),
  the 12 focused adapter test files (193 tests), and the 162
  freeze test files (357 tests) all pass.
- `npm pack --dry-run` clean for all 4 published packages at the
  expected sizes.
- A local public-style tarball install of all 4 v1.4.0/v1.3.1/
  v0.1.0/v0.1.1 tarballs alongside transitively-resolved
  `@arch-engine/core@1.3.0` and `@arch-engine/schema@1.3.0`
  passed end-to-end on yarn-pnp / pnpm / monorepo / single-package
  fixtures.
- `npm whoami` returns `tharcyn`. None of the three target
  versions (`@arch-engine/cli@1.4.0`,
  `@arch-engine/adapter-monorepo@1.3.1`,
  `@arch-engine/adapter-yarn-pnp@0.1.0`) exist on the npm
  registry — all return E404. The v1.3.1 / v0.1.1 baselines are
  visible and unchanged.
- No npm publish performed. No git tag created.

The release can proceed manually using the commands in §15.

---

## 2. Scope

Targeted minor release for Yarn PnP adapter support.

- Bumps the two packages whose source surface changed since
  v1.3.1 (cli adds the yarn-pnp dispatch branch; monorepo adds
  the yarn-pnp cache-hint decline).
- First-publishes the new `@arch-engine/adapter-yarn-pnp@0.1.0`.
- Leaves the four unchanged packages at v1.3.x — no source
  there was touched, no dependency constraint forces lockstep
  bumps.
- No new public command, flag, error code, or JSON v1 shape.
- No npm publish in this pass. No git tag in this pass.

---

## 3. Packages Included

### Bumped

| Package | From | To | Reason |
| --- | --- | --- | --- |
| `@arch-engine/cli` | `1.3.1` | `1.4.0` | New optional peer `@arch-engine/adapter-yarn-pnp: ^0.1.0` + new yarn-pnp dispatch branch in `runner-bridge.ts` + tightened monorepo peer range `^1.3.0` → `^1.3.1`. Additive minor. |
| `@arch-engine/adapter-monorepo` | `1.3.0` | `1.3.1` | yarn-pnp cache-hint decline check + adapter-version constant alignment. The bump landed in the implementation commit (`6778d52`); this pass publishes it. |
| `@arch-engine/adapter-yarn-pnp` | (unreleased) | `0.1.0` | **New package** — safe Yarn Berry / PnP workspace topology extractor. |

### Unchanged (intentionally not bumped)

| Package | Version | Why no bump |
| --- | --- | --- |
| `@arch-engine/adapter-pnpm` | `0.1.1` | No source touched. |
| `@arch-engine/core` | `1.3.0` | No source touched. |
| `@arch-engine/schema` | `1.3.0` | No source touched. No new schema. |
| `@arch-engine/governance-pack-authority` | `1.3.0` | No source touched. |
| `@arch-engine/governance-pack-rest-contract` | `1.3.0` | No source touched. |
| `@arch-engine/governance-pack-journey` | `1.3.0` | No source touched. |
| arch-engine root (private) | `1.0.0` | Not part of the npm release surface. |
| `arch-engine-action`, `@arch-engine/adapter-github`, `@arch-engine/adapter-gitlab` | (private workspaces / public surface unchanged) | No source touched. |

### CLI peer dependency wiring (v1.4.0)

```jsonc
"peerDependencies": {
  "@arch-engine/adapter-monorepo": "^1.3.1",   // ↑ tightened from ^1.3.0
  "@arch-engine/adapter-pnpm":     "^0.1.1",   // unchanged
  "@arch-engine/adapter-yarn-pnp": "^0.1.0"    // unchanged (new since v1.3.1)
},
"peerDependenciesMeta": {
  "@arch-engine/adapter-monorepo": { "optional": true },
  "@arch-engine/adapter-pnpm":     { "optional": true },
  "@arch-engine/adapter-yarn-pnp": { "optional": true }
}
```

All three remain optional. The monorepo range tightening is
the minimum needed to guarantee that v1.4.0's yarn-pnp
dispatch branch sees an adapter-monorepo that knows how to
decline `package.json#workspaces + .pnp.cjs` repos. Without
this, a stale v1.3.0 monorepo + v1.4.0 cli + v0.1.0 yarn-pnp
combination would produce `ARCH_ENGINE_ADAPTER_CONFLICT` (exit
3) on real Yarn PnP repositories.

---

## 4. Changes Included

This release rolls together everything landed since v1.3.1:

1. **Implementation pass** (`6778d52`) — new
   `@arch-engine/adapter-yarn-pnp` package, runner-bridge wiring
   at precedence 3, monorepo adapter cache-hint decline + version
   bump to 1.3.1, 12 fixtures, 73 new tests.
2. **Real-repo trial audit** (`2e0b1d5`) — strong-signal verdict
   across 11 real public OSS repos.
3. **Hygiene pass** (`96e89a9`) — `nodeLinker`/`nodeLinkerSource`
   provenance contract addressing the trial's single P3
   finding, plus `.gitignore` rule for fixture-generated
   `.arch-engine/` artifacts.
4. **Release prep** (this pass) — CLI version bump, CLI peer
   range tightening, CHANGELOG, release notes, this preflight.

Total cumulative source diff since `arch-engine-v1.3.1`:

```
README.md                                                |  +27
examples/github-actions/README.md                        |  +27
package-lock.json                                        |  +25/-7
package.json                                             |   +4/-1
packages/adapter-monorepo/package.json                   |   +1/-1
packages/adapter-monorepo/src/index.ts                   |  +28/-2
packages/adapter-yarn-pnp/{package,tsconfig,tsup,…}      |  +99 (new files)
packages/adapter-yarn-pnp/src/{globs,index,package-graph,yarn-workspaces}.ts | +1808 (new)
packages/adapter-yarn-pnp/tests/yarn-pnp-adapter.test.ts |  +535 (new)
packages/cli/package.json                                |   +9/-3
packages/cli/src/runner-bridge.ts                        |  +96/-7
packages/cli/tests/adapters/adapter-monorepo-compat.test.ts |  +4/-1
packages/cli/tests/adapters/adapter-yarn-pnp-cli-smoke.test.ts |  +144 (new)
packages/cli/tests/adapters/adapter-yarn-pnp-json-v2-metadata.test.ts | +223 (new)
packages/cli/tests/adapters/adapter-yarn-pnp-selection.test.ts | +193 (new)
packages/cli/tests/fixtures/adapters/yarn-pnp-*          |  +120 (12 fixture trees)
packages/cli/tsup.config.ts                              |   +6/-1
.gitignore                                               |  +12
CHANGELOG.md                                             |  +180 (v1.4.0 entry)
docs/releases/v1.4.0.md                                  |  +240 (new)
audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_*             | +1400 (3 audits)
audits/release/ARCH_ENGINE_V1_4_0_MINOR_RELEASE_PREFLIGHT.md | new (this file)
```

---

## 5. Minor Release Justification

This is a **minor release** under [Semantic Versioning](https://semver.org/)
because:

- **New optional adapter package.** `@arch-engine/adapter-yarn-pnp@0.1.0`
  is brand new on npm.
- **New CLI runtime branch.** `runner-bridge.ts` adds a new
  dispatch arm and registry entry at precedence 3.
- **New JSON v2 metadata sub-block.**
  `data.adapter.metadata.yarnPnp` appears whenever the new
  adapter is selected. Additive only; no top-level envelope
  shape change.
- **New workspace shape support.** Yarn Berry / Plug'n'Play
  repositories are now first-class.
- **Additive optional peer dependency** on `@arch-engine/cli`.

And **not a major release** because:

- JSON v1 byte-shape unchanged.
- JSON v2 envelope top-level keys unchanged.
- Existing adapter selection on pnpm / yarn-classic / npm /
  single-package repos is byte-identical to v1.3.1.
- `graphSurfaceHash` for every pre-existing fixture is
  byte-identical to v1.3.1.
- No new CLI commands or flags.
- No new `ARCH_ENGINE_*` codes.
- No removed or renamed public exports.
- All v1.3.x consumer code continues to work unchanged.

Semver-policy result: **minor**.

---

## 6. Safety Model

The Yarn PnP MVP adapter satisfies the v1.x adapter
determinism contract exactly. Verified in the real-repo trial:

| Invariant | Enforcement |
| --- | --- |
| No `.pnp.cjs` execution | Adapter source contains no `require()` / `import()` of repo paths. |
| No `.pnp.loader.mjs` execution | Same — no dynamic `import()` from the adapter. |
| No `yarn` invocation | No `child_process` use anywhere in the adapter package. |
| No `npm install` / `pnpm install` / `yarn install` in target repos | The CLI never invokes a package-manager binary; the real-repo trial cloned 11 repos `--depth 1` and verified zero install commands ran. |
| No repository mutation | After cleaning the documented `.arch-engine/` auto-init cache (pre-existing v1.0.1+ behavior), `git status` in every cloned trial repo was clean. **Zero source file modifications across 11 repos.** |
| No network sockets | Adapter source has no `node:http` / `node:https` / `node:net` import. |
| No `node_modules` / `.yarn/cache` / `.yarn/unplugged` / `.yarn/install-state.gz` traversal | Glob expander's `ALWAYS_IGNORE` set excludes all of these. |
| Deterministic output | `graphSurfaceHash` byte-identical on replay (verified on `yarnpkg/berry` during the trial). |
| No absolute path leakage in JSON v2 | 33 trial JSON outputs scanned for `/Users/` and `/var/folders` — 0 matches. |

---

## 7. JSON Compatibility

| Surface | v1.3.1 | v1.4.0 | Compatibility |
| --- | --- | --- | --- |
| JSON v1 default `--json` envelope | flat object | flat object, identical keys | **unchanged** |
| JSON v2 envelope top-level keys (`archEngineVersion`, `artifacts`, `command`, `data`, `diagnostics`, `emittedAt`, `exitCode`, `nextActions`, `schemaVersion`, `status`, `summary`) | as documented | same | **unchanged** |
| `data.adapter` block shape (`name`, `version`, `packageManager`, `workspaceKind`, `confidence`, `reasons`, `warnings`, `alsoDetected`, `metadata`) | as documented | same | **unchanged** |
| `data.adapter.metadata.*` sub-blocks | `pnpm` (when pnpm selected) | `pnpm` OR `yarnPnp` (when yarn-pnp selected); both adapter-specific blocks coexist in the schema | **additive** |
| `data.adapter.metadata.yarnPnp` keys | (n/a — adapter didn't exist) | 11 keys: `packageManagerVersion`, `pnpFilePresent`, `pnpLoaderPresent`, `yarnrcPresent`, `nodeLinker`, `nodeLinkerSource`, `workspacesPresent`, `workspacesObjectForm`, `rawGlobs`, `excludedGlobs`, `matchedGlobs` | **new (additive)** |
| `data.adapter.metadata.pnpm.packageManagerVersion` | v1.3.1 deterministic shape | same | **unchanged** |
| `ARCH_ENGINE_*` code vocabulary | 22 codes | 22 codes (no new codes — `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` was added in v1.3.0 and is now actively used) | **unchanged** |
| Exit codes (0/1/2/3/5) | as documented | same | **unchanged** |
| CLI flags / commands | five-command surface (`doctor`, `inspect`, `analyze`, `check`, `explain`) | same | **unchanged** |
| Node engines | `>=18.0.0` | `>=18.0.0` | **unchanged** |
| AGP dependency | absent | absent | **unchanged** |

---

## 8. Adapter Compatibility

| Registry slot | v1.3.1 | v1.4.0 |
| --- | --- | --- |
| Precedence 2 | `@arch-engine/adapter-pnpm@0.1.1` | unchanged |
| Precedence 3 | (empty) | `@arch-engine/adapter-yarn-pnp@0.1.0` (new) |
| Precedence 4 | `@arch-engine/adapter-monorepo@1.3.0` | `@arch-engine/adapter-monorepo@1.3.1` (cache-hint decline added) |

Cache-hint declines (documented in
`docs/adapters/multi-adapter-surface-spec.md` §11.4):

- pnpm adapter wins `pnpm-workspace.yaml`; monorepo declines
  when `archengine:pnpmAdapterAvailable` is set.
- yarn-pnp adapter wins `.pnp.cjs` / `.pnp.loader.mjs`;
  monorepo declines `package.json#workspaces` repos that *also*
  ship a PnP file when `archengine:yarnPnpAdapterAvailable` is
  set; yarn-pnp itself declines when both
  `pnpm-workspace.yaml` AND
  `archengine:pnpmAdapterAvailable` exist.

Pre-existing v1.3.1 adapter-selection on all repositories
in the real-repo trial (and the v1.3.0 trial corpus) is
byte-identical.

---

## 9. Real-Repo Trial Evidence

From [`audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md`](../ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md):

- **12 candidates probed** (one dropped — `microsoft/rushstack`
  has no root `package.json`).
- **11 repositories tested** end-to-end via local-packed
  tarballs.
- **11 / 11 correct adapter selections** (8 CORRECT_HIGH,
  3 CORRECT_LOW).
  - `yarnpkg/berry` → `@arch-engine/adapter-yarn-pnp` HIGH
    (the only real PnP repo in mainstream OSS).
  - `backstage`, `babel` (Yarn Berry `nodeLinker: node-modules`),
    `react`, `changesets` (Yarn classic) → `@arch-engine/adapter-monorepo` HIGH.
  - `nrwl/nx`, `h3`, `prisma` → `@arch-engine/adapter-pnpm` HIGH.
  - `graphql-js`, `express`, `tsup` → `@arch-engine/adapter-monorepo` LOW.
- **0 P0 / 0 P1 / 0 P2 / 1 P3 issues**. The single P3
  (`nodeLinker: null` on `yarnpkg/berry`) was fixed by the
  hygiene pass.
- **0 absolute-path leaks** in 33 JSON v2 outputs.
- **0 source-file mutations** across 11 cloned repos.
- **0 CLI crashes** across 44 invocations (11 repos × 4
  commands).
- **`graphSurfaceHash` deterministic** on replay for
  `yarnpkg/berry` (45 nodes, 177 edges, byte-identical).

---

## 10. Hygiene Evidence

From [`audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_RELEASE_HYGIENE_AUDIT.md`](../ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_RELEASE_HYGIENE_AUDIT.md):

- **nodeLinker provenance contract** — new
  `nodeLinkerSource` enum (`"yarnrc"` /
  `"inferred_from_pnp_file"` / `"absent"`) deterministically
  surfaces *how* the `nodeLinker` value was determined.
  `nodeLinker: "pnp"` now appears on PnP repos that omit
  `.yarnrc.yml#nodeLinker` (matches Yarn Berry's documented
  default).
- **Fixture artifact gitignore** — new rule
  `packages/cli/tests/fixtures/**/.arch-engine/` prevents the
  CLI's auto-init runtime artifacts from dirtying the working
  tree on every test run. Tracked fixture files under
  `pnpm-basic/.arch-engine/` continue to be visible (tracked
  paths win over the ignore rule).
- **+12 new tests** added; test count grew from 2373 → 2385.

---

## 11. Validation Results

| Check | Command | Result |
| --- | --- | --- |
| Install | `npm install` | up to date |
| Build | `npm run build` | all 18 workspace packages built |
| Typecheck | `npm run typecheck` | exit 0 across 9 tsconfig projects |
| Full tests | `npm test` | **674 files, 2385 tests passed, 0 failed** |
| Focused adapter tests | `npx vitest run packages/cli/tests/adapters packages/adapter-pnpm/tests packages/adapter-yarn-pnp/tests` | **12 files, 193 tests passed** |
| Freeze tests | `npx vitest run packages/core/tests/freeze` | **162 files, 357 tests passed** |
| Root pack | `npm pack --dry-run` | clean (94 files; root private) |

No test was skipped, relaxed, or removed.

---

## 12. Package Pack Dry-Run Results

### `@arch-engine/adapter-monorepo@1.3.1`

```
name:           @arch-engine/adapter-monorepo
version:        1.3.1
filename:       arch-engine-adapter-monorepo-1.3.1.tgz
package size:   5.6 kB
unpacked size:  17.0 kB
total files:    5
shasum:         f4d469f54f7ac1da5b54eee8e458d2b0ecaf005c
```

### `@arch-engine/adapter-yarn-pnp@0.1.0`

```
name:           @arch-engine/adapter-yarn-pnp
version:        0.1.0
filename:       arch-engine-adapter-yarn-pnp-0.1.0.tgz
package size:   15.2 kB
unpacked size:  60.5 kB
total files:    8
shasum:         72a990e4a6ab18da4dd508aeb9a24030f10842a7
```

### `@arch-engine/adapter-pnpm@0.1.1` (unchanged, dry-run verification)

```
name:           @arch-engine/adapter-pnpm
version:        0.1.1
filename:       arch-engine-adapter-pnpm-0.1.1.tgz
package size:   12.2 kB
unpacked size:  46.1 kB
total files:    8
shasum:         5ae90d3cc8bd1a9aed97d4ebe90470da935a4510
```

### `@arch-engine/cli@1.4.0`

```
name:           @arch-engine/cli
version:        1.4.0
filename:       arch-engine-cli-1.4.0.tgz
package size:   36.4 kB
unpacked size:  172.2 kB
total files:    18
shasum:         4b63cde2efa5341dc851f388741511206201c604
```

All tarballs contain only the published `files` patterns
(`dist`, `README.md`, `LICENSE`) and the `package.json` —
no source maps in dist for the CLI, no test files, no
node_modules.

---

## 13. Local Public-Style Tarball Smoke

A clean consumer in `mktemp -d` was set up and installed all
four locally-packed tarballs in a single `npm install --save-dev`
call. `@arch-engine/core@1.3.0` and `@arch-engine/schema@1.3.0`
were transitively resolved from the public registry.

| Invocation | Verified behavior |
| --- | --- |
| `npx arch-engine --version` | reports `arch-engine/1.4.0 darwin-arm64 node-v25.2.1` ✅ |
| `npm ls --depth=0` | shows all 4 v1.4.0 / v1.3.1 / v0.1.1 / v0.1.0 packages ✅ |
| `doctor` (yarn-pnp fixture) | shows `Adapter selected: @arch-engine/adapter-yarn-pnp (HIGH adapter confidence)`, `Workspace type resolved as: yarn-pnp` ✅ |
| `inspect --json --json-schema=v2` (yarn-pnp fixture) | `data.adapter.name === "@arch-engine/adapter-yarn-pnp"`, `version === "0.1.0"`, `packageManager === "yarn"`, `workspaceKind === "yarn-pnp"`, `confidence === "HIGH"`, `metadata.yarnPnp.nodeLinker === "pnp"`, `metadata.yarnPnp.nodeLinkerSource === "yarnrc"`, `metadata.yarnPnp.packageManagerVersion === "4.0.2"` ✅ |
| `doctor` (pnpm fixture) | shows `Adapter selected: @arch-engine/adapter-pnpm (HIGH adapter confidence)` — pnpm precedence preserved ✅ |
| `doctor` (repo root, yarn-npm workspace) | shows `Adapter selected: @arch-engine/adapter-monorepo (HIGH adapter confidence)` — monorepo fallback preserved ✅ |
| `doctor --json` (yarn-pnp fixture, JSON v1) | flat shape; no `data` key; no `adapter` key — JSON v1 unchanged ✅ |

All invocations exited `0`. The temp directory was removed.

---

## 14. npm Registry Preflight

| Check | Command | Result |
| --- | --- | --- |
| Auth | `npm whoami` | `tharcyn` (logged in) |
| `@arch-engine/cli@1.4.0` not published | `npm view @arch-engine/cli@1.4.0 version` | `E404` (correct — not yet published) |
| `@arch-engine/adapter-monorepo@1.3.1` not published | `npm view @arch-engine/adapter-monorepo@1.3.1 version` | `E404` (correct) |
| `@arch-engine/adapter-yarn-pnp@0.1.0` not published | `npm view @arch-engine/adapter-yarn-pnp@0.1.0 version` | `E404` (correct) |
| `@arch-engine/cli@1.3.1` baseline | `npm view @arch-engine/cli@1.3.1 version` | `1.3.1` (visible) |
| `@arch-engine/adapter-monorepo@1.3.0` baseline | `npm view @arch-engine/adapter-monorepo@1.3.0 version` | `1.3.0` (visible) |
| `@arch-engine/adapter-pnpm@0.1.1` baseline | `npm view @arch-engine/adapter-pnpm@0.1.1 version` | `0.1.1` (visible) |

Ready for human-driven publish.

---

## 15. Manual Publish Commands

Run from the repo root. **Order matters** — publish in this
order so that each downstream package's optional peer is
already visible by the time it itself publishes:

```bash
# 1) adapter-monorepo first — CLI's peer range tightened from ^1.3.0 to ^1.3.1
npm publish --workspace @arch-engine/adapter-monorepo --access public

# 2) adapter-yarn-pnp second — CLI's optional peer target
npm publish --workspace @arch-engine/adapter-yarn-pnp --access public

# 3) cli last — peers are now all available
npm publish --workspace @arch-engine/cli           --access public
```

Notes:

- `--access public` is required because both packages are
  scoped (`@arch-engine/…`).
- Use 2FA / OTP if your npm account is configured for it (npm
  will prompt; pass `--otp=<code>` to script around it).
- Do **not** add `--tag latest` explicitly — npm defaults the
  scoped publish to the `latest` dist-tag, which is what we
  want.
- Do **not** pass `--no-verify` or similar.

If publishing fails partway through:

- `adapter-monorepo` first: a failure here means nothing is
  published. Investigate, fix, retry.
- `adapter-yarn-pnp` second: failures here leave
  `adapter-monorepo@1.3.1` on the registry — safe state.
- `cli` last: failures here leave both adapter packages on the
  registry — also safe; retry only the cli publish once the
  cause is understood.

---

## 16. Post-Publish Verification Commands

```bash
npm view @arch-engine/adapter-monorepo@1.3.1 version    # expect: 1.3.1
npm view @arch-engine/adapter-yarn-pnp@0.1.0 version    # expect: 0.1.0
npm view @arch-engine/cli@1.4.0 version                  # expect: 1.4.0
```

For a full end-to-end check after publish, repeat the §13
smoke pattern in a fresh `mktemp -d` consumer, this time
installing directly from the public registry:

```bash
npm install --no-audit --no-fund --save-dev \
  @arch-engine/cli@1.4.0 \
  @arch-engine/adapter-monorepo@1.3.1 \
  @arch-engine/adapter-pnpm@0.1.1 \
  @arch-engine/adapter-yarn-pnp@0.1.0
npx arch-engine --version   # → arch-engine/1.4.0 …
```

---

## 17. Git Tag Commands

**Do not run these in the release-prep pass.** Run them after
a successful npm publish so the tags refer to the exact commit
that was published.

```bash
git tag arch-engine-v1.4.0
git tag adapter-yarn-pnp-v0.1.0
git tag adapter-monorepo-v1.3.1
git push origin main --tags
```

Rationale: tagging after publish — not before — means the tag
is only created if the publish actually succeeded, eliminating
the window where a tag could refer to a never-published
version.

---

## 18. Remaining Deltas

### MICRO_DELTA (deferred — fold into a future hardening pass)

- **Unnamed-package silent drop.** Both yarn-pnp v0.1.0 and
  adapter-pnpm v0.1.x silently drop workspace packages that
  lack a `name` field instead of emitting
  `ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED` (ERROR). The real-repo
  trial observed this on `yarnpkg/berry` (47 matched globs, 45
  named nodes). The behavior is **consistent across both
  adapters**, so the fix must update both at once to avoid
  asymmetry. Deferred — does not gate v1.4.0.

- **Auto-init cache creation in target repos.** The CLI's
  `autoInitializeArchitectureContext(cwd)` (pre-existing v1.0.1+
  behavior) creates a small `.arch-engine/` cache directory in
  target repos on first run. v1.4.0 ships the `.gitignore` rule
  that handles the fixture-test side-effects in *this* repo;
  the broader question of where to write the cache for
  external repos is cross-cutting and out of scope for this
  release.

### P3 (none)

The v1.3.1 P3 (doctor label disambiguation) is shipped. The
Pass 3 trial P3 (`nodeLinker: null`) is fixed by the hygiene
pass.

### P2 / P1 / P0 (none)

---

## 19. Recommended Next Mission

**`ARCH_ENGINE_AGP_SCHEMA_PACK_AND_EMITTER_MVP_SPEC_PASS`**

Justification:

- The adapter surface arc is now complete for the
  JavaScript/TypeScript ecosystem: pnpm, Yarn PnP, Yarn classic,
  npm, and single-package layouts are all first-class.
- The AGP (Architecture Governance Protocol) emitter is the
  next major capability arc per
  [`docs/agp/emitter-contract-spec.md`](../../docs/agp/emitter-contract-spec.md).
  v1.4.0 ships a stable enough adapter base to absorb the
  emitter without churn.
- A spec-first pass keeps the change-of-direction reversible
  before any code lands.

### Alternative missions

- **`YARN_PNP_ADAPTER_HARDENING_PASS`** — land the
  unnamed-package alignment + any feedback that surfaces from
  the v1.4.0 public release. Suitable as a v1.4.1 patch.
- **`ARCH_ENGINE_REAL_REPO_TRIAL_PASS_4`** — broader real-repo
  trial across all four adapter classes simultaneously, now
  that the adapter family is complete.

Either of these is also valid; the AGP spec pass is the
strategic preference because it opens a new capability dimension
rather than continuing to polish the adapter dimension.

---

## 20. Commands Run

```bash
# Phase 1 — preflight
git status --short
git log --oneline --decorate -n 10
git tag --list "arch-engine-v1.3.1" "adapter-pnpm-v0.1.1"

# Phase 3 — registry preflight
npm whoami
npm view @arch-engine/cli@1.4.0 version            || true
npm view @arch-engine/adapter-monorepo@1.3.1 version || true
npm view @arch-engine/adapter-yarn-pnp@0.1.0 version || true
npm view @arch-engine/cli@1.3.1 version
npm view @arch-engine/adapter-monorepo@1.3.0 version
npm view @arch-engine/adapter-pnpm@0.1.1 version

# Phase 4 — version bumps
$EDITOR packages/cli/package.json
npm install

# Phase 5 — changelog
$EDITOR CHANGELOG.md

# Phase 6 — release notes
$EDITOR docs/releases/v1.4.0.md

# Phase 8 — validation
npm install
npm run build
npm run typecheck
npm test
npx vitest run packages/cli/tests/adapters packages/adapter-pnpm/tests packages/adapter-yarn-pnp/tests
npx vitest run packages/core/tests/freeze
npm pack --dry-run
npm --workspace @arch-engine/adapter-monorepo pack --dry-run
npm --workspace @arch-engine/adapter-yarn-pnp pack --dry-run
npm --workspace @arch-engine/adapter-pnpm    pack --dry-run
npm --workspace @arch-engine/cli             pack --dry-run

# Phase 9 — local tarball smoke
SMOKE_ROOT=$(mktemp -d -t arch-engine-v140-smoke.XXXXXX)
mkdir -p "$SMOKE_ROOT/packs" "$SMOKE_ROOT/runner"
for pkg in adapter-monorepo adapter-yarn-pnp adapter-pnpm cli; do
  npm --workspace @arch-engine/$pkg pack --pack-destination "$SMOKE_ROOT/packs"
done
(cd "$SMOKE_ROOT/runner" && npm init -y >/dev/null && \
  npm install --no-audit --no-fund --save-dev \
    "$SMOKE_ROOT/packs/arch-engine-adapter-monorepo-1.3.1.tgz" \
    "$SMOKE_ROOT/packs/arch-engine-adapter-yarn-pnp-0.1.0.tgz" \
    "$SMOKE_ROOT/packs/arch-engine-adapter-pnpm-0.1.1.tgz" \
    "$SMOKE_ROOT/packs/arch-engine-cli-1.4.0.tgz")
ARCH_BIN="$SMOKE_ROOT/runner/node_modules/.bin/arch-engine"
"$ARCH_BIN" --version
(cd …/yarn-pnp-basic && "$ARCH_BIN" doctor)
(cd …/yarn-pnp-basic && "$ARCH_BIN" inspect --json --json-schema=v2)
(cd …/yarn-pnp-basic && "$ARCH_BIN" doctor --json)   # JSON v1 invariance check
(cd …/pnpm-basic     && "$ARCH_BIN" doctor)
("$ARCH_BIN" doctor)                                  # repo root (monorepo)
rm -rf "$SMOKE_ROOT"

# Cleanup post-test/smoke artifacts
git restore packages/cli/tests/fixtures/adapters/pnpm-basic/.arch-engine/{session,stability-score}.json
git restore .arch-engine/stability-score.json
```

No `npm publish` was executed. No git tag was created. No
package version was bumped beyond what's documented above.

---

*End of v1.4.0 Minor Release Preflight.*
