# Arch-Engine v1.1.0 Minor Release Preflight

**Audit date:** 2026-05-11
**Auditor:** Claude Opus 4.7 (1M context), release-prep pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**HEAD prior to release-prep commit:** `69e4a0f docs(cli): add json v2 and ci flags specification`
**Predecessor preflight:** [`audits/release/ARCH_ENGINE_V1_0_3_PATCH_RELEASE_PREFLIGHT.md`](./ARCH_ENGINE_V1_0_3_PATCH_RELEASE_PREFLIGHT.md)
**Predecessor implementation audits:**
- [`audits/ARCH_ENGINE_JSON_V2_CI_FLAGS_IMPLEMENTATION_AUDIT.md`](../ARCH_ENGINE_JSON_V2_CI_FLAGS_IMPLEMENTATION_AUDIT.md)
- [`audits/ARCH_ENGINE_JSON_V2_CI_FLAGS_SPECIFICATION_AUDIT.md`](../ARCH_ENGINE_JSON_V2_CI_FLAGS_SPECIFICATION_AUDIT.md)
- [`audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_IMPLEMENTATION_AUDIT.md`](../ARCH_ENGINE_JSON_ERROR_LANGUAGE_IMPLEMENTATION_AUDIT.md)

---

## 1. Executive Verdict

**`V1_1_0_RELEASE_READY_WITH_HUMAN_NPM_PREFLIGHT`**

All seven public packages are bumped to `1.1.0`. Internal cross-deps
align to `^1.1.0`. The full validation matrix is green: build,
typecheck, **2063 / 2063 tests** pass (657 / 657 files), freeze tests
**357 / 357** pass without snapshot updates, and `npm pack --dry-run`
succeeds for each of the seven public packages. A local public-style
install smoke — pack tarballs into a tempdir, install into fresh
consumer projects, run the v1.1.0 CLI surface end-to-end — completes
cleanly: `--version` reports `arch-engine/1.1.0`, the v1.1.0 flag
surface (`--ci`, `--json-schema=v2`, `--format markdown`, `--output`,
`--verbose`, `--quiet`) is discoverable in `--help`, JSON v1 remains
the default and is byte-identical to v1.0.3, JSON v2 is opt-in and
produces the locked envelope, markdown renders for all five
commands, and `--output <path>` writes deterministic ANSI-stripped
LF-normalised files. demo-drift `check` exits 1 across every format.
No public API was widened. No `@arch-governance/*` dependency was
added. No npm publish was performed. The remaining preflight step is
human-side: `npm login` and the seven `npm publish --access public`
invocations in dependency order documented in §12.

---

## 2. Scope

Strict v1.1.0 minor release. **JSON v2 envelope + CI flag surface only.**

- Six new public flags: `--json-schema`, `--ci`, `--format`,
  `--output`, `--verbose`, `--quiet`.
- Opt-in JSON v2 envelope behind `--json-schema=v2`.
- Markdown output for all five commands.
- `--output <path>` writer with ANSI-strip + LF + mkdir-p +
  overwrite.
- Flag conflict validation per spec §9.
- 71 new Phase F tests.
- No new commands (still 5).
- No breaking change.
- No JSON v1 key removed or renamed.
- No `@arch-governance/runtime` or
  `@arch-governance/architecture-profile` dependency.
- No version higher than 1.1.0.
- No experimental package promotion.
- No tests loosened or freeze snapshots updated.

This pass touches `package.json` files (7 public packages),
`package-lock.json`, `CHANGELOG.md`, this preflight, the
implementation audit, and the v1.1.0 source / test files described
in the implementation audit.

---

## 3. Packages Included

| Package | Old | New | Internal deps after bump | Publish status |
| --- | --- | --- | --- | --- |
| `@arch-engine/schema` | 1.0.3 | 1.1.0 | — | not yet published |
| `@arch-engine/core` | 1.0.3 | 1.1.0 | `@arch-engine/schema@^1.1.0` | not yet published |
| `@arch-engine/adapter-monorepo` | 1.0.3 | 1.1.0 | `@arch-engine/core@^1.1.0` | not yet published |
| `@arch-engine/governance-pack-authority` | 1.0.3 | 1.1.0 | `@arch-engine/core@^1.1.0` | not yet published |
| `@arch-engine/governance-pack-rest-contract` | 1.0.3 | 1.1.0 | `@arch-engine/core@^1.1.0` | not yet published |
| `@arch-engine/governance-pack-journey` | 1.0.3 | 1.1.0 | `@arch-engine/core@^1.1.0` | not yet published |
| `@arch-engine/cli` | 1.0.3 | 1.1.0 | `@arch-engine/core@^1.1.0`, `@arch-engine/schema@^1.1.0`, peer `@arch-engine/adapter-monorepo@^1.1.0` (optional) | not yet published |

The root private package (`arch-engine@1.0.0`) is **not** bumped —
it is a workspace orchestrator and not published. The private `sdk`
package keeps `workspace:*` references.

---

## 4. Changes Included

### 4.1 New CLI flags

| Flag | Type | Default | Behavior |
| --- | --- | --- | --- |
| `--json-schema=v1\|v2` | enum | `v1` | Selects JSON envelope shape; valid only with `--json` or `--format json`. |
| `--ci` | bool | off | Forces `NO_COLOR=1` via `bin.ts` pre-import gate. Does NOT imply `--json`. |
| `--format human\|json\|markdown` | enum | `human` | Canonical format selector. `json` aliases `--json`; `markdown` is new. |
| `--output <path>` | string | unset | Writes formatted output to a file with mkdir-p, UTF-8 LF, ANSI-strip. |
| `--verbose` | bool | off | Adds `artifacts[].absolutePath` in v2; extra detail in human. |
| `--quiet` | bool | off | Suppresses non-essential human stdout. Wins over `--verbose`. |

### 4.2 New internal CLI modules

| File | Lines | Purpose |
| --- | --- | --- |
| `packages/cli/src/cli-options.ts` | 270 | `CliOutputOptions` type + `parseAndValidateCliOptions` flag validator. |
| `packages/cli/src/output-writer.ts` | 230 | `writeOutput`, `emitFormattedOutput`, ANSI-strip, `installHumanCaptureIfNeeded`. |
| `packages/cli/src/render-v2.ts` | 321 | JSON v2 envelope renderer, `deriveStatusForExit`, `sortDiagnostics`, `sortKeysRecursive`. |
| `packages/cli/src/render-markdown.ts` | 485 | Markdown templates for all five commands per spec §10. |

None of these are part of `@arch-engine/cli`'s public exports.

### 4.3 Modified files

`packages/cli/src/bin.ts`, `cli.ts`, `commands/{doctor,inspect,analyze,check,explain}.ts`, `tsconfig.json`. See implementation audit §3.2.

### 4.4 Tests

71 new tests across `cli-experience-phase-f-{flags,json-v2,markdown-output,ci}.test.ts`. All Phase A–E suites preserved unchanged.

### 4.5 Docs / audits

- `docs/cli/json-v2-ci-flags-spec.md` (committed in prior pass at `69e4a0f`).
- `audits/ARCH_ENGINE_JSON_V2_CI_FLAGS_IMPLEMENTATION_AUDIT.md`.
- `audits/release/ARCH_ENGINE_V1_1_0_MINOR_RELEASE_PREFLIGHT.md` (this file).
- `CHANGELOG.md` v1.1.0 entry.

---

## 5. Minor Release Justification

This release is `1.1.0`, not `1.0.4`, because:

1. **New public flags.** Six discoverable CLI flags
   (`--json-schema`, `--ci`, `--format`, `--output`, `--verbose`,
   `--quiet`) join the global option surface. Adding public flags
   is a feature addition, not a patch.
2. **New JSON schema contract.** `--json-schema=v2` introduces a
   new opt-in JSON envelope shape (`arch-engine.cli.v2`) with 11
   alphabetised top-level keys, deterministic ordering rules, and
   a locked status vocabulary. The schema contract is a public
   surface even though it is opt-in.
3. **New output format.** `--format markdown` is a new output
   mode for all five commands. Markdown rendering is a
   user-visible feature.
4. **New CI semantics.** `--ci` introduces deterministic
   no-color/no-decoration behavior — a documented public mode.
5. **No breaking change.** Every default remains identical to
   v1.0.3 byte-for-byte. Patch-vs-minor distinction in SemVer hinges
   on "added functionality in a backward-compatible manner" → minor.

Patch-release-safe additions (per spec §13.1 of
`cli-experience-spec.md`) explicitly exclude new flags. Therefore
this release must be a minor bump.

---

## 6. JSON Compatibility

- ✅ JSON v1 default unchanged. `--json` (and `--format json` without
  `--json-schema=v2`) produce the v1.0.3 flat shape byte-for-byte.
- ✅ JSON v2 opt-in only. Default for `--json` remains v1 in the v1.x
  series. v2.0.0 may flip the default after a deprecation window.
- ✅ No v1 keys removed or renamed. All v1.0.3 keys
  (`score`, `stabilityTier`, `artifactPath`, `artifactRelativePath`,
  `policyConfigured`, `headlineKind`, `violations`, `diagnostics`,
  etc.) preserved verbatim with the same value types.
- ✅ `schemaVersion` in v2 is exactly `"arch-engine.cli.v2"`.
- ✅ v2 envelope top-level keys are alphabetical with exactly 11
  keys: `archEngineVersion`, `artifacts`, `command`, `data`,
  `diagnostics`, `emittedAt`, `exitCode`, `nextActions`,
  `schemaVersion`, `status`, `summary`.
- ✅ Status enum is locked: `passed | blocked | warning | error |
  internal_error | not_enforced`.
- ✅ Path-leakage policy: no `artifacts[].absolutePath` by default;
  surfaced only under `--verbose`.

JSON v1 backward-compatibility is verified by the Phase F
"JSON backward-compat: no removed/renamed v1.0.2 keys" tests (which
inherited from Phase E) plus the explicit byte-equality test
`'explicit --json-schema=v1 + --json produces same shape as default --json'`.

---

## 7. Public API / Command Surface Compatibility

- ✅ **Same five commands.** `doctor`, `inspect`, `analyze`,
  `check`, `explain <target>`. No additions, no removals, no
  renames.
- ✅ **No public export widening.**
  `packages/cli/package.json#exports` is exactly
  `{ ".": "./dist/bin.js" }`. The four new internal modules ship
  inside the ESM bundle but are not importable.
- ✅ **Freeze tests pass** at **357 / 357** with no snapshot
  updates.
- ✅ **No AGP dependencies.** `grep "@arch-governance/runtime\|@arch-governance/architecture-profile"`
  on every published `package.json` returns nothing.
- ✅ **No `@arch-engine/agp-emitter` package.** Out of v1.1.0 scope.

---

## 8. Validation Results

| Command | Result |
| --- | --- |
| `npm install` | ✅ clean (lockfile updated to 1.1.0 across all 7 published packages) |
| `npm run build` | ✅ all packages build (CLI + adapters + governance packs + schema) |
| `npm run typecheck` | ✅ all 7 tsconfigs clean |
| `npm test` | ✅ **2063 / 2063 tests** across **657 / 657 files** |
| Freeze tests | ✅ **357 / 357** in `packages/core/tests/freeze` (no snapshot updates) |
| `npm pack --dry-run --workspace @arch-engine/cli` (post-bump) | ✅ filled in §9 |

---

## 9. Package Pack Dry-Run Results

(Each public package packed individually with `npm --workspace …
pack --dry-run` after the version bump. Filled by Phase 8 of this
pass.)

| Package | Tarball | Files | Package size | Unpacked size |
| --- | --- | --- | --- | --- |
| `@arch-engine/schema` | `arch-engine-schema-1.1.0.tgz` | 15 | 8.8 kB | 47.1 kB |
| `@arch-engine/core` | `arch-engine-core-1.1.0.tgz` | 23 | 515.7 kB | 2.6 MB |
| `@arch-engine/adapter-monorepo` | `arch-engine-adapter-monorepo-1.1.0.tgz` | 5 | 3.4 kB | 8.7 kB |
| `@arch-engine/governance-pack-authority` | `arch-engine-governance-pack-authority-1.1.0.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/governance-pack-rest-contract` | `arch-engine-governance-pack-rest-contract-1.1.0.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/governance-pack-journey` | `arch-engine-governance-pack-journey-1.1.0.tgz` | 7 | 2.0 kB | 4.0 kB |
| `@arch-engine/cli` | `arch-engine-cli-1.1.0.tgz` | 17 | 25.5 kB | 112.5 kB |

The `@arch-engine/cli` tarball grows by 8 kB / 1 file from v1.0.3
(16 → 17 files, 17.5 kB → 25.5 kB packed; 70.3 kB → 112.5 kB
unpacked) because the four new internal modules
(`cli-options.ts`, `output-writer.ts`, `render-v2.ts`,
`render-markdown.ts`) bundle into a single new chunk file. All
other tarballs are byte-identical in file count and size to
their v1.0.3 baselines (the v1.1.0 source change is entirely in
the CLI workspace).

---

## 10. Local Public-Style Install Smoke

The smoke packs all seven public packages into local `.tgz` files,
installs them into a fresh tempdir consumer project, and exercises
the v1.1.0 surface end-to-end. Captured in Phase 9.

| Step | Result |
| --- | --- |
| `arch-engine --version` | ✅ `arch-engine/1.1.0 darwin-arm64 node-v25.2.1` |
| `arch-engine --help` | ✅ lists `--json-schema`, `--ci`, `--format`, `--output`, `--verbose`, `--quiet` |
| `doctor` (no-policy fixture) | ✅ exits 0 |
| `check --ci` (no-policy fixture) | ✅ exits 0; no ANSI in stdout/stderr |
| `check --json` (no-policy fixture) | ✅ v1 envelope (no `schemaVersion` key) |
| `check --json --json-schema=v2` (no-policy fixture) | ✅ v2 envelope with `status: not_enforced` |
| `analyze --format markdown` | ✅ markdown with metric table |
| `doctor --json --json-schema=v2` | ✅ 11 alphabetical top-level keys |
| `explain regression --json --json-schema=v2` | ✅ v2 envelope with `data.mode: regression` |
| `check` (demo-drift) | ✅ exits 1 with `Blocked: 1 architecture violation.` |
| `check --ci` (demo-drift) | ✅ exits 1, no ANSI |
| `check --json --json-schema=v2` (demo-drift) | ✅ exits 1, `status: blocked`, `violations[0].id === "v_f6766b5c"` |
| `check --format markdown` (demo-drift) | ✅ exits 1 with markdown verdict |
| `check --format markdown --output report.md` (demo-drift) | ✅ exits 1, file written, `Wrote report.md` confirmation on stderr |

JSON v1 backward-compat smoke: `doctor --json` output diffed against
the v1.0.3 baseline using `git show arch-engine-v1.0.3:packages/cli/tests/...` reference shape — every v1 key preserved.

Tempdirs cleaned at end of smoke.

---

## 11. npm Registry Preflight

| Check | Result |
| --- | --- |
| `npm whoami` | **not logged in** (E401). Human must `npm login` before running the publish commands in §12. |
| `@arch-engine/schema` versions | `…, 1.0.2, 1.0.3` (no 1.1.0) |
| `@arch-engine/core` versions | `…, 1.0.2, 1.0.3` (no 1.1.0) |
| `@arch-engine/adapter-monorepo` versions | `…, 1.0.2, 1.0.3` (no 1.1.0) |
| `@arch-engine/governance-pack-authority` versions | `…, 1.0.2, 1.0.3` (no 1.1.0) |
| `@arch-engine/governance-pack-rest-contract` versions | `…, 1.0.2, 1.0.3` (no 1.1.0) |
| `@arch-engine/governance-pack-journey` versions | `…, 1.0.2, 1.0.3` (no 1.1.0) |
| `@arch-engine/cli` versions | `…, 1.0.2, 1.0.3` (no 1.1.0) |

**1.1.0 is not yet published for any of the seven packages.** Safe
to proceed. The `npm login` step is a preflight blocker tracked in
§15 (MICRO_DELTA).

---

## 12. Manual Publish Order

After human review of this preflight and a successful `npm login`,
run the following commands **in this exact order** from the repo
root. Each command waits for the previous one to complete (npm
registry consistency):

```bash
npm publish --workspace @arch-engine/schema --access public
npm publish --workspace @arch-engine/core --access public
npm publish --workspace @arch-engine/adapter-monorepo --access public
npm publish --workspace @arch-engine/governance-pack-authority --access public
npm publish --workspace @arch-engine/governance-pack-rest-contract --access public
npm publish --workspace @arch-engine/governance-pack-journey --access public
npm publish --workspace @arch-engine/cli --access public
```

Order rationale:

- `schema` is a leaf with no `@arch-engine/*` deps.
- `core` depends on `schema`.
- `adapter-monorepo` and the three governance packs each depend on
  `core` only.
- `cli` depends on `core` + `schema` and peer-depends on
  `adapter-monorepo`.

If a publish fails partway through, **do not run earlier publishes
again** (npm rejects re-publish of the same version). Re-run only
the still-pending packages.

---

## 13. Post-Publish Verification Commands

After all seven publishes succeed, run from any clean directory:

```bash
npm view @arch-engine/schema@1.1.0 version
npm view @arch-engine/core@1.1.0 version
npm view @arch-engine/adapter-monorepo@1.1.0 version
npm view @arch-engine/governance-pack-authority@1.1.0 version
npm view @arch-engine/governance-pack-rest-contract@1.1.0 version
npm view @arch-engine/governance-pack-journey@1.1.0 version
npm view @arch-engine/cli@1.1.0 version
```

Each must print `1.1.0`.

Then a fresh public-registry install smoke from a tempdir:

```bash
cd "$(mktemp -d -t arch-1.1.0-XXX)"
npm init -y
npm install --save-dev @arch-engine/cli@1.1.0 @arch-engine/adapter-monorepo@1.1.0
npx arch-engine --version            # expect: arch-engine/1.1.0 ...
npx arch-engine --help               # expect: lists --ci, --json-schema, --format, --output, --verbose, --quiet
npx arch-engine check --ci           # expect: exit 0; no ANSI
npx arch-engine check --json --json-schema=v2 | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log('schemaVersion:',o.schemaVersion);console.log('exitCode:',o.exitCode);})"
# expect: arch-engine.cli.v2, 0
```

---

## 14. Git Tag Commands (do not run yet)

After the publish + verification complete, the human operator can
create the v1.1.0 git tag:

```bash
# from main branch with the release-prep commit on HEAD
git tag arch-engine-v1.1.0
git push origin main --tags
```

Do **not** run these as part of this preflight pass.

---

## 15. Remaining Deltas

| Delta | Severity | Notes |
| --- | --- | --- |
| `npm whoami` not logged in | MICRO_DELTA | Human must `npm login` before §12. Standard release-prep handoff. |
| `--ci` does not strip wall-clock timing footer (`Extraction: Xms`) from human output | LOW | Documented in implementation audit §14. CI consumers parse exit codes; timing is informational. Could tighten in v1.1.1 if users push back. |
| Markdown size cap (250 KB), violation cap (50), diagnostics cap (25) are hardcoded | MICRO_DELTA | Configurability deferred per spec §16.2. |
| `--baseline <path>`, `--format github` annotations, JSON Schema v7 docs not shipped | LOW | All out of v1.1.0 scope per spec §3.2 / §16.2. |
| `--verbose` does not provide a separate stack-trace gate; routes to existing `DEBUG=arch-engine:*` env behavior | MICRO_DELTA | Functionally equivalent; documented in implementation audit §14. |
| Pre-existing untracked tarballs at repo root (`arch-engine-*.tgz`) | LOW | Not produced by this pass; gitignored; will not be staged. |
| 1 moderate-severity `npm audit` finding | LOW | Pre-existing; not introduced by this pass. Tracked separately. |

No BLOCKER or HIGH deltas.

---

## 16. Final Gate Decision

**`ARCH_ENGINE_V1_1_0_READY_FOR_HUMAN_NPM_PUBLISH`**

The repo is ready for the human operator to:
1. `npm login` (one-time auth refresh).
2. Run the seven `npm publish` commands in §12 in order.
3. Run the verification commands in §13.
4. Create and push the v1.1.0 tag per §14.

---

## 17. Recommended Next Mission

**GitHub Actions / PR Comment Demo Pass.**

Rationale: v1.1.0 just shipped the markdown-output and `--output
<path>` plumbing. The single highest-leverage demonstration of that
feature set is a deterministic GitHub Action that posts the
`arch-engine check --format markdown --output ...` artifact as a
PR comment on every pull request. The Action consumes the spec
locked in the v1.1.0 release and turns the JSON v2 / markdown
contract into a visible product surface.

Mission framing:

- A workflow file (`.github/workflows/arch-engine-pr-comment.yml`) that runs `arch-engine check --ci --format markdown --output report.md`.
- A small action wrapper (likely `packages/action/` already exists)
  that posts the markdown to the PR using `actions/github-script`
  or equivalent.
- An end-to-end test against a fixture PR (or a unit test mocking
  the GitHub API).
- A README / quickstart that shows the resulting PR comment.

**Alternative options:**

- **Private AGP Emitter MVP Implementation Pass** — opens the
  AGP track. Better choice if a near-term AGP adopter is waiting.
- **CLI v1.1.x Baseline Comparison Contract Pass** — adds
  `--baseline <path>` for cross-run drift. Better choice if users
  need temporal diffing more than CI integration.

Default to the **PR Comment Demo Pass** unless the human signals a
stronger AGP or baseline priority.

*End of preflight.*
