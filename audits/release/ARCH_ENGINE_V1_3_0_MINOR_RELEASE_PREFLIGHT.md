# Arch-Engine v1.3.0 Minor Release Preflight

| Field | Value |
| --- | --- |
| Audit version | 1.0 |
| Author | Claude Opus 4.7 (1M context) |
| Date | 2026-05-13 |
| Mission | v1.3.0 Minor Release Preparation |
| Predecessor audits | Pass 1 / Pass 2 / Pass 2B adapter implementation audits |
| Baseline | `@arch-engine/*@1.2.0` published; `@arch-engine/adapter-pnpm` not yet published |
| Target | `@arch-engine/*@1.3.0` + `@arch-engine/adapter-pnpm@0.1.0` |

---

## 1. Executive Verdict

**`V1_3_0_RELEASE_READY_WITH_HUMAN_NPM_PREFLIGHT`**

The v1.3.0 release prep is complete. Seven existing public packages
are bumped lockstep to `1.3.0` with cross-dependencies updated; the
new optional adapter `@arch-engine/adapter-pnpm` is staged at
`0.1.0`. Full validation green, local tarball smoke green, no
version drift, no AGP dependency, no publish, no tag.

A human-driven npm publish + git tag step is the only remaining
action — the exact commands are listed in §12 and §14.

---

## 2. Scope

v1.3.0 ships the multi-adapter surface expansion:

- Internal `ArchitectureAdapter` contract + deterministic registry
  (Pass 1 work).
- pnpm workspace adapter — new public package
  `@arch-engine/adapter-pnpm@0.1.0` (Pass 2 work).
- Runtime adapter selection in `runner-bridge.ts` (Pass 2 work).
- JSON v2 `data.adapter` on `doctor`/`inspect`/`analyze`/`check`/`explain`
  (matched/unmatched/policy modes) (Pass 2 + Pass 2B work).
- `doctor` human Adapter line (Pass 2B work).
- Six new `ARCH_ENGINE_*` error codes (Pass 2 work).
- pnpm support documentation in README + GitHub Actions templates
  (Pass 2B work).
- 59 new adapter-focused tests + 6 graphSurfaceHash parity tests
  + 10 Pass 2B surface tests = **+75 tests over v1.2.0** baseline
  (final: 2,287/2,287).

---

## 3. Packages Included

| Package | Old | New | Cross-deps | Publish status |
| --- | --- | --- | --- | --- |
| `@arch-engine/schema` | 1.2.0 | **1.3.0** | (no internal deps) | not yet published |
| `@arch-engine/core` | 1.2.0 | **1.3.0** | `@arch-engine/schema: ^1.3.0` | not yet published |
| `@arch-engine/adapter-monorepo` | 1.2.0 | **1.3.0** | `@arch-engine/core: ^1.3.0` | not yet published |
| `@arch-engine/governance-pack-authority` | 1.2.0 | **1.3.0** | `@arch-engine/core: ^1.3.0` | not yet published |
| `@arch-engine/governance-pack-rest-contract` | 1.2.0 | **1.3.0** | `@arch-engine/core: ^1.3.0` | not yet published |
| `@arch-engine/governance-pack-journey` | 1.2.0 | **1.3.0** | `@arch-engine/core: ^1.3.0` | not yet published |
| `@arch-engine/adapter-pnpm` | — | **0.1.0** | (no internal deps) | **net-new package** |
| `@arch-engine/cli` | 1.2.0 | **1.3.0** | `@arch-engine/core: ^1.3.0`, `@arch-engine/schema: ^1.3.0`; peer `@arch-engine/adapter-monorepo: ^1.3.0` (optional), `@arch-engine/adapter-pnpm: ^0.1.0` (optional) | not yet published |

Verified programmatically by post-bump Node script (Phase 5 success
gate).

---

## 4. Changes Included

### Adapter Contract (Pass 1)
- `packages/cli/src/adapters/adapter-contract.ts` — internal
  `ArchitectureAdapter` shape (~280 lines).
- `packages/cli/src/adapters/adapter-registry.ts` —
  `selectArchitectureAdapter` deterministic algorithm + types
  (~240 lines).
- `@arch-engine/adapter-monorepo` refactored to implement the
  contract structurally; `runMonorepoExtraction(cwd)` and all
  existing exports byte-identical.

### pnpm Adapter (Pass 2)
- `@arch-engine/adapter-pnpm@0.1.0` — new public package with
  `PnpmArchitectureAdapter` class, `runPnpmExtraction(cwd)` legacy
  helper, dependency-free YAML parser, deterministic glob expansion,
  workspace protocol awareness on all four dependency kinds.

### Runtime Selection (Pass 2)
- `packages/cli/src/runner-bridge.ts` rewritten to:
  - lazy-load both adapters
  - build precedence-ordered registry
  - set `archengine:pnpmAdapterAvailable` cache hint
  - run `selectArchitectureAdapter`
  - dispatch to chosen adapter's legacy-shape helper
  - throw `BridgeAdapterConflictError` on multi-HIGH (exit 3)

### JSON v2 `data.adapter` (Pass 2 + Pass 2B)
- `packages/cli/src/render-v2.ts` — `buildDataAdapterBlock` helper.
- All command V2 envelope builders inject `data.adapter`.
- `explain` regression mode honestly omits the block.

### `doctor` Human Adapter Line (Pass 2B)
- Single `✔ Adapter: <name> (<CONFIDENCE> confidence)` line in
  verdict header.
- Yellow `⚠` icon when confidence is LOW.

### Error Codes (Pass 2)
- 6 new codes appended to `packages/cli/src/error-codes.ts`:
  `ADAPTER_CONFLICT`, `ADAPTER_LOW_CONFIDENCE`,
  `WORKSPACE_GLOBS_INVALID`, `WORKSPACE_PACKAGE_UNNAMED`,
  `LOCKFILE_UNSUPPORTED`, `PNP_RESOLUTION_DEFERRED`.
- Vocabulary grows 16 → 22.

### Tests + Fixtures + Docs (Passes 1, 2, 2B)
- 59 new adapter tests across 8 files.
- 6 pnpm fixture directories.
- README and `examples/github-actions/README.md` pnpm subsections.

---

## 5. Minor Release Justification

A minor (not patch) bump is correct because v1.3.0:

1. Ships a **new public package** (`@arch-engine/adapter-pnpm`).
   Even though existing packages would semver-patch on internal
   changes, introducing a new optional peer dependency in the CLI's
   `peerDependencies` map is a minor-relevant change for consumers
   evaluating their dependency surface.
2. Adds a **new JSON v2 surface** (`data.adapter` block on every
   topology-extracting command). Additive, but introduces new
   consumer-visible fields.
3. Adds a **new human output line** on `doctor` (the Adapter line).
   Consumers parsing doctor's text output for automation could see
   the change.
4. Adds **six new `ARCH_ENGINE_*` codes** — additive vocabulary
   growth.
5. Introduces **runtime adapter selection**. Existing repos
   continue to work, but the selection algorithm + LOW_CONFIDENCE
   warnings are now active.

A **patch** would be inappropriate because the runtime path is
genuinely different (selection step now runs), and a new package
is shipped.

A **major** would be inappropriate because:
- JSON v1 is byte-identical.
- The five-command surface is unchanged.
- `runMonorepoExtraction(cwd)` and `classifyAuthorityDomain` are
  byte-identical on `@arch-engine/adapter-monorepo`.
- No removed keys, no renamed fields, no removed exports.

---

## 6. JSON Compatibility

- **JSON v1 unchanged.** No `adapter` top-level key. No `data`
  wrapper. Pinned by tests `JSON v1 default — data.adapter NOT
  present` and `explain JSON v1 (no v2) does not include adapter
  key`. Verified by tarball smoke against both the consumer's
  default cwd AND the embedded pnpm fixture.
- **JSON v2 additive only.** `data.adapter` is a new sibling under
  `data.*` on `doctor`/`inspect`/`analyze`/`check`/`explain` modes
  that run adapter selection. No existing key removed or retyped.
- **Doctor pre-existing `data.adapter = {id, resolved}` shape**
  (from v1.2.0) was replaced with the canonical spec-§12.2 shape.
  Test sweep confirmed no internal consumer depended on the old
  keys (`grep -rn data.adapter` shows no such reads).
- **`explain regression` honestly omits `data.adapter`.** It reads
  a saved artifact; adapter selection never runs. The renderer's
  `adapterSummary?` parameter makes the absence intentional, not
  accidental. Pinned by test.
- **`graphSurfaceHash` unaffected by adapter identity.** Spec §12.4
  invariant holds: cross-adapter parity verified within the
  intersection of glob-matched packages; the documented root
  asymmetry is pinned by test.

---

## 7. Adapter Compatibility

- `@arch-engine/adapter-monorepo` public API is **byte-identical
  to v1.2.0**:
  - `runMonorepoExtraction(cwd) → MonorepoExtractionResult` —
    unchanged.
  - `classifyAuthorityDomain(route) → AuthorityDomain` — unchanged.
  - `createMonorepoAdapter()`, `monorepoAdapter` — unchanged.
  - `MonorepoExtractionResult`, `ExtractionMetadata`,
    `AuthorityDomain`, `RouteServiceMapping` types — unchanged.
  - New singleton `monorepoArchitectureAdapter` and class
    `MonorepoArchitectureAdapter` exposed for the registry; **NOT**
    part of the v1.x stability contract.
- `@arch-engine/adapter-pnpm@0.1.0` characteristics:
  - **Zero runtime dependencies.** Pure Node `fs`/`path`/`crypto`.
  - Pure-fs read. Never executes `pnpm`, never reads `node_modules/`
    or `.pnpm-store/`, never opens network sockets, never mutates
    the user's repository.
  - Deterministic. Byte-identical output on repeat runs.
  - Optional. Lazy-loaded by the CLI; absence is graceful (LOW
    confidence advisory).
- No package-manager execution from any adapter.
- No mutation of user repositories.

---

## 8. Validation Results

### Pre-bump baseline (v1.2.0 state)
| Step | Result |
| --- | --- |
| `npm install` | clean |
| `npm run build` | all packages green |
| `npm run typecheck` | all 8 packages |
| `npm test` | 2,287 / 2,287 in 43.7 s |

### Post-bump (v1.3.0 state)
| Step | Result |
| --- | --- |
| `npm install` | clean |
| `npm run build` | all packages green |
| `npm run typecheck` | all 8 packages |
| `npm test` | **2,287 / 2,287** in 44.9 s |
| `npx vitest run packages/core/tests/freeze` | **357 / 357** freeze tests |
| `npx vitest run packages/cli/tests/adapters packages/adapter-pnpm/tests` | **96 / 96** adapter tests across 8 files |
| `npm pack --dry-run --workspaces` | all 8 publishable packages clean |
| CLI `--version` | `arch-engine/1.3.0` |
| CLI doctor smoke (repo root) | `Adapter: @arch-engine/adapter-monorepo (HIGH confidence)`, exit 0 |
| CLI inspect v2 smoke | `archEngineVersion: 1.3.0`, `data.adapter.name = @arch-engine/adapter-monorepo` |
| CLI inspect v2 on pnpm fixture | `data.adapter.name = @arch-engine/adapter-pnpm`, HIGH confidence |

---

## 9. Package Pack Dry-Run Results

| Package | Version | Size | Files |
| --- | --- | --- | --- |
| `@arch-engine/schema` | `1.3.0` | 8.8 kB | 15 |
| `@arch-engine/core` | `1.3.0` | 515.7 kB | 23 |
| `@arch-engine/adapter-monorepo` | `1.3.0` | 5.5 kB | 5 |
| `@arch-engine/governance-pack-authority` | `1.3.0` | 2.0 kB | 7 |
| `@arch-engine/governance-pack-rest-contract` | `1.3.0` | 2.0 kB | 7 |
| `@arch-engine/governance-pack-journey` | `1.3.0` | 2.0 kB | 7 |
| `@arch-engine/adapter-pnpm` | `0.1.0` | 12.0 kB | 8 |
| `@arch-engine/cli` | `1.3.0` | 36.2 kB | 18 |

All pack dry-runs completed without error or warning.

---

## 10. Local Public-Style Install Smoke

Procedure: packed every workspace into a temp directory; created a
fresh empty consumer (`npm init -y` + `"type": "module"`); installed
all 8 tarballs via `npm install --no-save`; ran CLI smokes; verified
behaviour; cleaned up temp directories.

### Consumer smoke (empty cwd → single-package fallback)
| Check | Result |
| --- | --- |
| `npx arch-engine --version` | `arch-engine/1.3.0 darwin-arm64 node-v25.2.1` ✅ |
| `npx arch-engine doctor` human | `⚠ Adapter: @arch-engine/adapter-monorepo (LOW confidence)` ✅ (correct for single-package fallback) |
| `npx arch-engine inspect --json` (v1 default) | No `data` wrapper, no `adapter` key ✅ |
| `npx arch-engine inspect --json --json-schema=v2` | `archEngineVersion: 1.3.0`, `data.adapter.name = @arch-engine/adapter-monorepo`, `confidence = LOW` ✅ |

### Pnpm fixture smoke (embedded inside consumer)
| Check | Result |
| --- | --- |
| `npx arch-engine doctor` human | `✔ Adapter: @arch-engine/adapter-pnpm (HIGH confidence)` ✅ |
| `npx arch-engine inspect --json --json-schema=v2` | `archEngineVersion: 1.3.0`, `data.adapter.name = @arch-engine/adapter-pnpm`, `confidence = HIGH`, `workspaceType = pnpm`, `nodes = 3` ✅ |
| `npx arch-engine inspect --json` (v1 default) | No `data` / `adapter` keys; flat `workspaceType = pnpm`, `nodes = 3` ✅ |

Conclusion: end-to-end install + run via published-style tarballs
works correctly. No registry round-trip required.

---

## 11. npm Registry Preflight

| Check | Result |
| --- | --- |
| `npm whoami` | `tharcyn` (authenticated) ✅ |
| `@arch-engine/schema` latest | `1.2.0` ✅ |
| `@arch-engine/core` latest | `1.2.0` ✅ |
| `@arch-engine/adapter-monorepo` latest | `1.2.0` ✅ |
| `@arch-engine/governance-pack-authority` latest | `1.2.0` ✅ |
| `@arch-engine/governance-pack-rest-contract` latest | `1.2.0` ✅ |
| `@arch-engine/governance-pack-journey` latest | `1.2.0` ✅ |
| `@arch-engine/cli` latest | `1.2.0` ✅ |
| `@arch-engine/adapter-pnpm` latest | **404 (not published)** ✅ — net-new package |
| `@arch-engine/schema@1.3.0` | 404 (not published) ✅ — safe to publish |
| `@arch-engine/core@1.3.0` | 404 ✅ |
| `@arch-engine/adapter-monorepo@1.3.0` | 404 ✅ |
| `@arch-engine/governance-pack-authority@1.3.0` | 404 ✅ |
| `@arch-engine/governance-pack-rest-contract@1.3.0` | 404 ✅ |
| `@arch-engine/governance-pack-journey@1.3.0` | 404 ✅ |
| `@arch-engine/cli@1.3.0` | 404 ✅ |

No version collisions. Authenticated as the registry owner.

---

## 12. Manual Publish Order

**Run these in order. Do not run them as part of this audit pass.**

```bash
npm publish --workspace @arch-engine/schema --access public
npm publish --workspace @arch-engine/core --access public
npm publish --workspace @arch-engine/adapter-monorepo --access public
npm publish --workspace @arch-engine/governance-pack-authority --access public
npm publish --workspace @arch-engine/governance-pack-rest-contract --access public
npm publish --workspace @arch-engine/governance-pack-journey --access public
npm publish --workspace @arch-engine/adapter-pnpm --access public
npm publish --workspace @arch-engine/cli --access public
```

### Rationale

1. **`schema` first** — no internal deps; the leaf of the
   dependency graph.
2. **`core` second** — depends on `schema@^1.3.0`; publishing now
   ensures `schema` is resolvable.
3. **`adapter-monorepo` third** — depends on `core@^1.3.0`.
4. **Three governance packs next** — each depends on `core@^1.3.0`,
   ordering among them is irrelevant.
5. **`adapter-pnpm` seventh** — depends on nothing internal, but
   publishing BEFORE `cli` ensures the CLI's optional peer
   dependency is registry-visible at install time. New package
   first publication.
6. **`cli` last** — depends on `core`, `schema`, optionally on
   `adapter-monorepo` + `adapter-pnpm`. Publishing last gives
   consumers a fully-resolvable surface from the moment they
   install.

---

## 13. Post-Publish Verification Commands

After all eight publishes complete:

```bash
npm view @arch-engine/schema@1.3.0 version
npm view @arch-engine/core@1.3.0 version
npm view @arch-engine/adapter-monorepo@1.3.0 version
npm view @arch-engine/governance-pack-authority@1.3.0 version
npm view @arch-engine/governance-pack-rest-contract@1.3.0 version
npm view @arch-engine/governance-pack-journey@1.3.0 version
npm view @arch-engine/adapter-pnpm@0.1.0 version
npm view @arch-engine/cli@1.3.0 version
```

Each command should print the requested version (no 404).

For a full clean-room registry round-trip:

```bash
mkdir /tmp/arch-engine-v130-rt && cd /tmp/arch-engine-v130-rt
npm init -y
npm install @arch-engine/cli@1.3.0 \
            @arch-engine/adapter-monorepo@1.3.0 \
            @arch-engine/adapter-pnpm@0.1.0
npx arch-engine --version    # expect arch-engine/1.3.0
npx arch-engine doctor       # expect Adapter line
```

---

## 14. Git Tag Commands

**Do not run as part of this audit pass.** After publishing:

```bash
git tag arch-engine-v1.3.0
git tag adapter-pnpm-v0.1.0
git push origin main --tags
```

Two tags reflect the independent semver trajectories of the v1.x
lockstep packages vs. the new adapter at its own 0.x cycle.

---

## 15. Remaining Deltas

### BLOCKER
None.

### HIGH
None.

### MEDIUM
None.

### LOW
- **`audits/` directory contains a previously-committed
  `.arch-engine/stability-score.json` artifact** (committed in
  `251ca9e` accidentally). This is a runtime CLI side-effect, not
  release surface. Not part of v1.3.0's release tarballs (none of
  the package `files` arrays include it). Optional cleanup pass
  could remove it from the repo via `git rm` + `.gitignore`
  enforcement; deferred because it doesn't ship.
- **`packages/cli/tests/fixtures/adapters/pnpm-basic/.arch-engine/`
  fixture files committed accidentally** in the same Pass 2 commit
  via `cp -r` of a side-effected fixture. Same disposition: not
  release-bound, optional cleanup later.

### MICRO_DELTA
- **`@arch-engine/adapter-pnpm` builds DTS via a `tsup && tsc`
  two-step** because `tsup`'s rollup-plugin-dts struggles with
  multi-file packages under `composite: true`. Documented in the
  Pass 2 implementation audit. No effect on consumers — the .d.ts
  files in the published tarball are correct.

---

## 16. Final Gate Decision

**`ARCH_ENGINE_V1_3_0_READY_FOR_HUMAN_NPM_PUBLISH`**

The release is fully prepared. All validation phases passed; local
tarball smoke confirmed the public consumer experience; no version
drift; no AGP dependency; no unintended file inclusions in any
tarball. The only remaining steps are the human-driven `npm publish`
sequence in §12 and the `git tag` sequence in §14.

---

## 17. Recommended Next Mission

**`ARCH_ENGINE_V1_3_0_REAL_REPO_ADAPTER_TRIAL_PASS`**

After publish + post-publish verification, the highest-leverage
next mission is a real-repo trial pass per spec §15.4. Procedure:

1. Run `npx arch-engine@1.3.0 doctor --json --json-schema=v2` against
   8–10 real public OSS repos representing each supported workspace
   shape (pnpm, npm-workspaces, single).
2. Capture the `data.adapter.confidence` distribution.
3. File issues for any HIGH-confidence detection that produces
   wrong topology, OR any LOW-confidence detection that should
   have been HIGH.
4. Surface findings into a single trial-report markdown for the
   next adapter-hardening pass.

This is preferred over jumping straight to **Yarn PnP Adapter
Contract / Implementation Pass** (Pass 3) because:

- Pass 1 + Pass 2 + Pass 2B + v1.3.0 release is a full vertical
  slice. Real-repo data informs which Pass 3 edge-cases are worth
  prioritising.
- Yarn PnP MVP is package.json-shape based per spec §10 — its
  complexity is contained, but its real-world coverage benefit
  needs validation.
- AGP Emitter MVP remains a separate track per the v1.x freeze.

If the real-repo trial pass surfaces no major issues, the next
mission after it is **`ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_MVP`**
per spec §15.3.

---

*End of v1.3.0 Minor Release Preflight Audit.*
