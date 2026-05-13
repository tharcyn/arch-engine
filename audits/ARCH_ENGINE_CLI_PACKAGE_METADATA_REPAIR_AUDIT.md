# Arch-Engine CLI Package Metadata Repair Audit

**Audit date:** 2026-05-13
**Auditor:** Claude Opus 4.7 (1M context), metadata-repair pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**Pre-pass HEAD:** `256c0ee (tag: arch-engine-v1.2.0) chore(release): prepare arch-engine v1.2.0`

**Predecessor audits:**
- [`audits/ARCH_ENGINE_BASELINE_COMPARISON_IMPLEMENTATION_AUDIT.md`](./ARCH_ENGINE_BASELINE_COMPARISON_IMPLEMENTATION_AUDIT.md)
- [`audits/release/ARCH_ENGINE_V1_2_0_MINOR_RELEASE_PREFLIGHT.md`](./release/ARCH_ENGINE_V1_2_0_MINOR_RELEASE_PREFLIGHT.md)

---

## 1. Executive Verdict

**`CLI_PACKAGE_METADATA_REPAIR_READY`**

The npm publish-time warning observed during the v1.2.0 release —

> `"bin[arch-engine]" script name dist/bin.js was invalid and removed`

— is a benign auto-correction surfaced by **npm CLI ≥ 11.x** when the
`bin.<name>` value carries a leading `./` prefix. npm normalises the
value (strips `./`) on publish and reports the change with the
above wording. The published `@arch-engine/cli@1.2.0` package is
already functional on npm (verified by the post-publish smoke in
the v1.2.0 preflight); the warning is purely cosmetic.

The fix is the one-character canonical form: change

```jsonc
"bin": { "arch-engine": "./dist/bin.js" }
```

to

```jsonc
"bin": { "arch-engine": "dist/bin.js" }
```

This is exactly what `npm pkg fix` produces, and exactly what the
`exports` field rules do NOT require (`exports` keeps `"./"` per the
Node.js subpath-export spec). Asymmetry is intentional on npm's
part.

Validation post-fix:

- `npm run build` → ✅ clean
- `npm run typecheck` → ✅ clean
- `npm test` → ✅ **2168 / 2168 tests** across **662 / 662 files**
- Freeze tests → ✅ **357 / 357**
- `npm pack --dry-run --workspace @arch-engine/cli` → ✅ no
  warnings; `dist/bin.js` included with mode `0755` (executable);
  shebang preserved.
- Local tarball install smoke → ✅ `npx arch-engine --version`
  reports `arch-engine/1.2.0`; `--help` works; `node_modules/.bin/arch-engine`
  symlinks correctly to `../@arch-engine/cli/dist/bin.js` (no `./`
  artefact in the link target).

No runtime behaviour changed. No new dependencies. No version
bump. No publish. No tag. No AGP dependency.

The published `@arch-engine/cli@1.2.0` does **not** need to be
re-published — npm already normalised the value into the canonical
form on the registry, and the install / `npx` flow works
end-to-end. The source-side fix should ride along on the **next
patch / minor release** to silence the warning permanently. No
emergency v1.2.1 is needed.

---

## 2. Scope

**Package metadata repair only.**

- Single one-line change to `packages/cli/package.json` — the
  `bin.arch-engine` value loses its leading `./`.
- This audit document.

Out of scope:

- Source code (none touched).
- Other packages (only `@arch-engine/cli`).
- Version bump.
- npm publish.
- git tag.
- CLI behaviour.
- JSON contracts.
- AGP-related work.

---

## 3. Root Cause

### 3.1 The npm normalisation rule

npm CLI v11.x ships with stricter `bin` field normalisation via
its bundled `normalize-package-data` chain. The current rule:

- `bin.<name>` values **must NOT** start with `./`.
- Values that do are normalised (stripped of the `./` prefix)
  during `npm publish` and `npm pkg fix`.
- The normalisation emits a warning that reads
  `"bin[<name>]" script name <value> was invalid and removed` —
  the wording is misleading because the entry is preserved, just
  with its value rewritten.

This is **the opposite** of the `exports` field rule, which
**requires** the `./` prefix per the Node.js subpath-export
spec:

| Field | `./` prefix required? |
| --- | --- |
| `bin.<name>` | **No** (stripped on publish) |
| `exports."."` | **Yes** (required by Node) |
| `exports."./<sub>"` | **Yes** |
| `main` | No (legacy field; either form accepted) |
| `types` / `typesVersions.<…>` | No |

The asymmetry is by design; npm wants bin paths to behave like
shell command targets, while Node's resolver wants explicit
relative paths in `exports`.

### 3.2 How the v1.2.0 publish surfaced this

The v1.2.0 `packages/cli/package.json` was inherited from v1.1.0
where the bin value was already `"./dist/bin.js"`. Prior publishes
(v1.0.x, v1.1.0) may have emitted the same warning, but it had
not been audited until the v1.2.0 release-prep smoke surfaced it
explicitly.

The warning is cosmetic only: npm publishes the normalised value
(`"dist/bin.js"`) to the registry, install correctly resolves
the bin, and `npx arch-engine` works. We verified this against
the live `@arch-engine/cli@1.2.0` in the v1.2.0 preflight (§11
of `ARCH_ENGINE_V1_2_0_MINOR_RELEASE_PREFLIGHT.md`).

### 3.3 Reproduction

`npm --workspace @arch-engine/cli pkg fix` (with npm v11.6.2)
reproduces the auto-correction:

```diff
 "bin": {
-  "arch-engine": "./dist/bin.js"
+  "arch-engine": "dist/bin.js"
 },
```

`pkg fix` runs the same normalisation chain as `publish`. After
applying it once at the source, subsequent `pack --dry-run`
emissions are clean.

---

## 4. Files Changed

| File | Change |
| --- | --- |
| `packages/cli/package.json` | `bin.arch-engine`: `"./dist/bin.js"` → `"dist/bin.js"` (one character change; strips leading `./`). Applied via `npm pkg fix`. |
| `audits/ARCH_ENGINE_CLI_PACKAGE_METADATA_REPAIR_AUDIT.md` | This audit (new file). |

**Not modified:**
- All source under `packages/cli/src/`.
- All other `package.json` files (versions still `1.2.0`).
- `packages/cli/package.json` `exports."."`: deliberately kept at
  `"./dist/bin.js"` because the `./` prefix IS required for the
  `exports` field per the Node.js spec (§3.1 above).
- All test files.
- All documentation.

---

## 5. Fix Applied

```diff
 {
   "name": "@arch-engine/cli",
   "version": "1.2.0",
   ...
   "bin": {
-    "arch-engine": "./dist/bin.js"
+    "arch-engine": "dist/bin.js"
   },
   "exports": {
     ".": "./dist/bin.js"
   },
   ...
 }
```

- One line changed.
- `bin.arch-engine` value: `"./dist/bin.js"` → `"dist/bin.js"`.
- `exports."."` left as `"./dist/bin.js"` (Node.js requires the
  `./` prefix here; npm does NOT auto-correct this field).
- Nothing else touched.

---

## 6. Pack Dry-Run Result

```
$ npm --workspace @arch-engine/cli pack --dry-run

npm notice package: @arch-engine/cli@1.2.0
npm notice Tarball Contents
npm notice 1.1kB LICENSE
npm notice 464B README.md
npm notice 16.6kB dist/analyze-CCDKBREA.js
npm notice 270B dist/bin.js
npm notice 24.1kB dist/check-QU2RZH77.js
npm notice 23.8kB dist/chunk-COP3UCVI.js
npm notice 5.7kB dist/chunk-CRWONLNR.js
npm notice 2.1kB dist/chunk-FUHK6UYS.js
npm notice 4.4kB dist/chunk-JXE7JJJ5.js
npm notice 2.9kB dist/chunk-M3DVOEAV.js
npm notice 651B dist/chunk-MZDI3CHY.js
npm notice 16.0kB dist/chunk-PX2LXCUM.js
npm notice 828B dist/chunk-SLSQIY27.js
npm notice 13.1kB dist/chunk-YK3X434J.js
npm notice 7.1kB dist/cli-6HSDGV5X.js
npm notice 8.2kB dist/doctor-KYYBXM7X.js
npm notice 18.9kB dist/explain-63VAZYY2.js
npm notice 6.6kB dist/inspect-PQ2ITHZI.js
npm notice 1.3kB package.json
npm notice Tarball Details
npm notice name: @arch-engine/cli
npm notice version: 1.2.0
npm notice filename: arch-engine-cli-1.2.0.tgz
npm notice package size: 33.0 kB
npm notice unpacked size: 154.1 kB
npm notice total files: 19
```

| Check | Result |
| --- | --- |
| `bin[arch-engine]` auto-correction warning | ✅ **No warning emitted** |
| `dist/bin.js` included | ✅ Present, 270 bytes |
| `dist/bin.js` executable bit | ✅ mode `0755` (decimal 493) preserved by tsup |
| Tarball file count | 19 (unchanged from v1.2.0 publish) |
| Tarball size | 33.0 kB / 154.1 kB unpacked (unchanged) |
| Tarball name | `arch-engine-cli-1.2.0.tgz` (version unchanged) |
| Other warnings/notices | None |

`pack --dry-run --json` confirms `dist/bin.js` is in the tarball
file list with `"path":"dist/bin.js","size":270,"mode":493`.

---

## 7. Local Tarball Install Smoke

Packed the tarball into a tempdir and installed into a fresh
consumer project; verified `npx arch-engine` works end-to-end.

| Step | Result |
| --- | --- |
| `npm pack --pack-destination "$PACKDIR"` | ✅ `arch-engine-cli-1.2.0.tgz` produced |
| `npm install …/arch-engine-cli-1.2.0.tgz @arch-engine/adapter-monorepo@1.2.0` | ✅ 14 packages installed |
| `npx arch-engine --version` | ✅ `arch-engine/1.2.0 darwin-arm64 node-v25.2.1` |
| `npx arch-engine --help` | ✅ Full help text emitted; lists 5 commands |
| `dist/bin.js` shebang preserved | ✅ `#!/usr/bin/env node` |
| `node_modules/.bin/arch-engine` symlink | ✅ Target: `../@arch-engine/cli/dist/bin.js` (canonical, no `./`) |

Tempdirs cleaned at end of smoke. No artefacts left in the repo.

---

## 8. Full Validation Results

| Gate | Result |
| --- | --- |
| `npm install` | ✅ clean |
| `npm run build` | ✅ all packages build |
| `npm run typecheck` | ✅ all 7 tsconfigs clean |
| `npm test` | ✅ **2168 / 2168 tests** across **662 / 662 files** |
| Freeze tests | ✅ **357 / 357** in `packages/core/tests/freeze` |
| `npm pack --dry-run` (workspace root) | ✅ clean |
| `npm pack --dry-run --workspace @arch-engine/cli` | ✅ clean (no warning) |
| Local tarball install smoke | ✅ `npx arch-engine` works |

No test was modified. No suite changed status.

---

## 9. Compatibility Statement

- ✅ **No command behaviour changed.** The CLI runtime is
  byte-identical to v1.2.0. Same five verbs, same flags, same
  JSON shapes, same exit codes.
- ✅ **No JSON behaviour changed.** v1 default unchanged; v2
  envelope unchanged; baseline / drift contract unchanged.
- ✅ **No new dependencies.** `package.json` `dependencies`,
  `devDependencies`, `peerDependencies` are identical.
- ✅ **No AGP dependency.** `@arch-governance/*` packages are
  absent.
- ✅ **No version bump.** All `@arch-engine/*` packages remain
  at `1.2.0`.
- ✅ **No publish.** Registry was not touched.
- ✅ **No tag.** Local and remote refs unchanged.
- ✅ **No commit yet.** Pending the human's review.
- ✅ **Existing published `@arch-engine/cli@1.2.0` is unaffected
  and remains functional.** npm normalised the bin field on the
  registry side at publish time; users installing v1.2.0 get a
  working CLI.

---

## 10. Remaining Deltas

| Delta | Severity | Notes |
| --- | --- | --- |
| The fix is unreleased: the warning will not appear on the **next** publish, but anyone re-publishing v1.2.0 (which is not possible per npm's immutability) would still get the warning. | MICRO_DELTA | Carrying the fix forward to v1.2.1 / v1.3.0 / v2.0.0 silences the warning permanently. |
| Other `@arch-engine/*` packages do not have a `bin` field, so they are unaffected. | — | Verified by inspection. |
| The `exports."."` value `"./dist/bin.js"` is correct for npm and Node.js. We deliberately did NOT strip its `./` because Node's subpath-export resolver requires it. | — | Documented in §3.1 so future maintainers don't "fix" it incorrectly. |
| 1 moderate-severity `npm audit` finding | LOW | Pre-existing; not introduced by this pass. |

No BLOCKER or HIGH deltas.

---

## 11. Release Recommendation

**Hold for the next patch / minor release.** Do NOT cut an
emergency `v1.2.1` solely for this metadata change.

Rationale:

- The currently-published `@arch-engine/cli@1.2.0` already has
  the normalised value on the npm registry (npm rewrote it on
  publish). Users installing v1.2.0 are unaffected.
- The warning was developer-facing only (visible to the human
  operator during `npm publish`). End users never see it.
- Re-publishing v1.2.0 is impossible per npm's version immutability.
- A standalone v1.2.1 patch with only this one-line change would
  add release-cycle overhead without user-visible benefit.

**Recommended carry-forward:** include this fix in whichever
release comes next (v1.2.1 patch if other small fixes accumulate,
v1.3.0 / v2.0.0 otherwise). The fix is now committed to the
source tree; the next release-prep pass will pick it up
automatically.

---

## 12. Recommended Next Mission

**GitHub Actions Baseline Workflow Demo Pass** (carrying forward
the recommendation from the v1.2.0 release preflight). The
baseline-comparison contract shipped in v1.2.0 is the natural
input for a deterministic GitHub Action that downloads the `main`
baseline, runs `arch-engine check --ci --baseline … --format
markdown --output report.md`, and either uploads the artefact or
posts it as a sticky PR comment. Two new templates would land
under `examples/github-actions/`:

- `arch-engine-pr-baseline-report.yml` — artefact-only, safe on
  fork PRs.
- `arch-engine-pr-baseline-comment.yml` — sticky comment on
  internal PRs.

This completes the "baseline → PR comment" product loop set up
by v1.0.3 + v1.1.0 + v1.2.0.

**Alternatives** (if priorities shift):

- **Private AGP Emitter MVP Implementation Pass** — opens the
  AGP track per the long-deferred emitter contract.
- **CLI v1.2.x Baseline Hardening Pass** — tighten the version
  floor in `baseline-reader.ts`; ship the deferred
  `--fail-on-drift`, `--baseline-label`, `--current-label`,
  `--drift-mode` flags.

Default to the **GitHub Actions Baseline Workflow Demo Pass**
unless an AGP adopter or baseline-hardening signal arrives.

*End of audit.*
