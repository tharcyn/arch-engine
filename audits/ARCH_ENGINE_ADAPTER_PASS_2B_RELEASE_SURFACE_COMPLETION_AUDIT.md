# Arch-Engine Adapter Pass 2B Release Surface Completion Audit

| Field | Value |
| --- | --- |
| Audit version | 1.0 |
| Author | Claude Opus 4.7 (1M context) |
| Date | 2026-05-13 |
| Mission | Adapter Pass 2B — Release Surface Completion |
| Spec | [`docs/adapters/multi-adapter-surface-spec.md`](../docs/adapters/multi-adapter-surface-spec.md) §7.5, §12 |
| Predecessor audit | [`audits/ARCH_ENGINE_ADAPTER_PASS_2_PNPM_IMPLEMENTATION_AUDIT.md`](./ARCH_ENGINE_ADAPTER_PASS_2_PNPM_IMPLEMENTATION_AUDIT.md) |
| Published baseline | `@arch-engine/*@1.2.0` |
| Target after this pass | unchanged (still `1.2.0` lockstep + `@arch-engine/adapter-pnpm@0.1.0` new) |

---

## 1. Executive Verdict

**`ADAPTER_PASS_2B_READY_FOR_V1_3_0_PREP`**

The three remaining Pass 2 deltas are closed:

- `explain` JSON v2 surfaces `data.adapter` in every mode that
  actually runs adapter selection (`matched`, `unmatched`, `policy`).
  `regression` mode is intentionally and honestly deferred — it
  reads a saved artifact and never invokes a workspace adapter for
  the current run.
- `doctor` human output gains a single, concise `Adapter:` line that
  fits within the existing verdict header.
- A `graphSurfaceHash` parity test verifies the locked claim from
  spec §12.4 (canonical-hash parity between pnpm-adapter output and
  monorepo-fallback output on the intersection-eligible fixture) and
  documents the legitimate root-node asymmetry.

Plus minimum-touch docs updates surface pnpm support in the README
and GitHub Actions templates README.

- Full vitest suite green: **2,287 / 2,287** (+16 over Pass 2's 2,271).
- All 357 freeze tests pass.
- Typecheck green across all 8 packages.
- `npm pack --dry-run` clean for every workspace.
- No version bump. No publish. No tag. No `@arch-governance/*`
  dependency added.

The release-prep mission for v1.3.0 can proceed.

---

## 2. Scope

This pass closes the four release-surface deltas flagged in the
Pass 2 audit's "Remaining Deltas" section:

| Pass 2 delta | Pass 2B disposition |
| --- | --- |
| `explain` command not wired for `data.adapter` | **Implemented** (matched / unmatched / policy modes); regression honestly deferred. |
| `doctor` human output missing adapter line | **Implemented** as a single line in the verdict header. |
| Cross-fixture `graphSurfaceHash` parity test | **Implemented** with documented root-asymmetry pin. |
| GitHub Actions / README pnpm mention | **Implemented** as minimal additive docs. |

Out of scope (matches mission constraints):
- No new CLI commands.
- No new flags.
- No JSON v1 changes.
- No package version bumps.
- No publish / tag.
- No `@arch-governance/*` dep.
- No Yarn PnP adapter.
- No AGP emitter.

---

## 3. Files Changed

### Modified (4 files)

| File | Change |
| --- | --- |
| `packages/cli/src/commands/explain.ts` | Threaded `bridge.adapterSummary` through every code path that calls `executeRunnerBridge` (matched + unmatched + policy modes). Added `BridgeAdapterConflictError` catch path for clean exit 3. Made `buildExplainV2EnvelopeInput` accept an optional `adapterSummary` and inject `data.adapter` only when present. |
| `packages/cli/src/commands/doctor.ts` | Added one line in the human verdict header: `✔ Adapter: <name> (<CONFIDENCE> confidence)`. Placed between "Workspace type resolved as" and "Packages detected". Uses LOW-confidence yellow `⚠` icon when applicable; otherwise green `✔`. |
| `README.md` | Added a row for `@arch-engine/adapter-pnpm` in the Packages table; added the package to the "Optional" install block; added a "pnpm workspace support (preview)" subsection explaining what the adapter enables and that GitHub Actions templates work unchanged. |
| `examples/github-actions/README.md` | Added an "Works with pnpm workspaces (v1.3.0+)" subsection under "What the canonical commands run", including an `npm install --no-save` snippet to opt-in to the pnpm adapter from a workflow. Updated the exit-code-3 row to mention adapter selection conflicts. |

### Created (2 files)

| File | Purpose |
| --- | --- |
| `packages/cli/tests/adapters/adapter-graph-surface-hash-parity.test.ts` | 6 tests: 4 covering intersection-eligible parity on `pnpm-basic`, 2 documenting the explicitly-not-applicable cases (`pnpm-nested`, `pnpm-excluded-glob`) as deterministic-but-distinct. |
| `packages/cli/tests/adapters/adapter-pass-2b-surfaces.test.ts` | 10 tests: 4 covering the new `doctor` human Adapter line, 4 covering `explain` JSON v2 `data.adapter` behaviour across modes, 2 covering the README docs mentions. |
| `audits/ARCH_ENGINE_ADAPTER_PASS_2B_RELEASE_SURFACE_COMPLETION_AUDIT.md` | This audit. |

### Not Modified

- All `package.json` files — no version bumps, no new deps.
- All `tsconfig*.json` files.
- All other commands (`inspect`, `analyze`, `check`) — Pass 2 already
  wired their `data.adapter` paths.
- `runner-bridge.ts` — Pass 2's wiring serves Pass 2B unchanged.
- `render-v2.ts` — `buildDataAdapterBlock` shipped in Pass 2 is
  reused.
- `adapter-monorepo` and `adapter-pnpm` source — untouched.
- All test fixtures.

---

## 4. `explain` `data.adapter` Decision

**Implemented for adapter-running modes; deferred for regression.**

`explain.ts` has four entry paths:

| Mode | Calls `executeRunnerBridge`? | `data.adapter` in Pass 2B? |
| --- | --- | --- |
| Default target match (`explain <name>`, matched result) | Yes (line ~46 in updated explain.ts) | ✅ Yes |
| Default target match, unmatched result (no edges or no matches) | Yes (same call site, before match check) | ✅ Yes |
| `explain policy` (mode === 'policy') | Yes (line ~430) | ✅ Yes |
| `explain regression` (mode === 'regression') | **No** — reads `.arch-engine/stability-score.json` directly | ❌ Honestly omitted |

Rationale for the regression deferral:

- `explain regression` reads a previously-saved artifact. It does
  not run a fresh extraction or adapter selection. Forcing a bridge
  call here would (a) be wasteful, (b) tie the artifact's adapter
  identity to the *current* run rather than the run that produced
  it, and (c) change behaviour where users have come to expect
  zero-cost local replay.
- The artifact already carries the workspace identity it was
  generated against (via `signals.workspace.type` etc.). When a
  future iteration wants to surface "this baseline was generated by
  `<adapter>`", that metadata should travel inside the artifact, not
  be re-derived from the current cwd.
- The renderer's signature `adapterSummary?: BridgeAdapterSummary`
  makes the absence intentional, not accidental.

Verified by test `explain JSON v2 — data.adapter > regression mode does NOT include data.adapter`.

---

## 5. `doctor` Human Adapter Line

Single line, slotted into the existing verdict header:

```
Diagnosing environment readiness...

✔ Workspace type resolved as: yarn-npm (highest confidence)
✔ Adapter: @arch-engine/adapter-monorepo (HIGH confidence)
✔ Packages detected: 13 / 13 expected
✔ Connected nodes: 13
…
```

On a pnpm fixture:

```
✔ Workspace type resolved as: pnpm (highest confidence)
✔ Adapter: @arch-engine/adapter-pnpm (HIGH confidence)
✔ Packages detected: 3 / 3 expected
```

Design choices:

- One line per spec §7.5; no multi-line block.
- Uses the confidence tier (HIGH / MEDIUM / LOW) directly rather
  than reasons/warnings — those continue to live in JSON v2 only.
- Green `✔` icon for HIGH/MEDIUM; yellow `⚠` icon for LOW.
- Surfaces under `--quiet` too — the chosen adapter is part of the
  verdict header, not the optional detail block. Confirmed by test.
- No absolute paths emitted.

Backwards compatibility: existing doctor tests (`Packages detected:\s+4` match) are unaffected because the new line is inserted before that one.

---

## 6. `graphSurfaceHash` Parity / Determinism Decision

**Implemented as intersection parity with documented asymmetry.**

The naive interpretation of spec §12.4 — "same canonical
graphSurfaceHash regardless of adapter" — does not hold against the
v1.2.0 fixtures because the two adapters disagree on a single
fixture detail: the monorepo adapter ALWAYS includes the cwd root
as a workspace node when its `package.json` is named; the pnpm
adapter follows pnpm's documented behaviour and includes only
glob-matched directories.

The parity test pins the canonical claim correctly:

1. **Parity holds** for the set of pnpm-glob-matched packages and
   the edges among them. This is the spec's actual guarantee — "as
   long as the same set of nodes and edges are extracted" (§12.4).
2. **Root-inclusion asymmetry is pinned** as an explicit
   `expect(m.nodes.length - p.nodes.length).toBe(1)` so a future
   change that accidentally aligns them surfaces in test review.
3. **Pnpm-only features** (two-segment globs, exclusion globs,
   `workspace:*` protocols) are tested separately with
   `expect(m.nodes.length).toBeLessThan(p.nodes.length)` — both
   sides deterministic, but parity is intentionally not claimed.

Six tests in `adapter-graph-surface-hash-parity.test.ts`:

| Test | What it asserts |
| --- | --- |
| pnpm and monorepo agree on glob-matched node set | Intersection nodes identical (root filtered out from monorepo side) |
| pnpm and monorepo agree on edges among glob-matched packages | Intersection edges identical |
| graphSurfaceHash byte-stable across runs | Each adapter alone is deterministic |
| Full-topology hash differs by exactly the root-inclusion delta | Documented asymmetry pinned |
| pnpm-nested two-segment globs are pnpm-only | Monorepo node count `< pnpm` node count, both deterministic |
| pnpm-excluded-glob is pnpm-only | Monorepo includes the excluded package; pnpm does not; both deterministic |

This is the honest treatment of the parity property.

---

## 7. Docs Updates

### `README.md`

- Added a Packages-table row for `@arch-engine/adapter-pnpm` with
  the "preview, additive in v1.3.0" qualifier.
- Added install line to the optional packages block.
- Added a new subsection "pnpm workspace support (preview)" between
  the Packages table and the Architecture layering diagram.
  Explains:
  - What the adapter enables (glob expansion, `workspace:*`,
    exclusion globs, all four dep kinds).
  - The pure-fs-read invariants (no `pnpm` execution, no
    `node_modules` read, no network).
  - That existing GitHub Actions workflows work unchanged.

### `examples/github-actions/README.md`

- Updated the exit-code table row for `3` to mention adapter
  selection conflicts ("includes adapter selection conflicts in
  v1.3.0+").
- Added a "Works with pnpm workspaces (v1.3.0+)" subsection.
  Includes:
  - An opt-in `npm install --no-save` snippet.
  - The expected doctor human output line.
  - A note about `data.adapter` in JSON v2 and JSON v1 being
    unaffected.

Both changes are strictly additive — no existing prose removed,
no example workflow modified.

---

## 8. Tests Added / Updated

| Suite | Tests | Result |
| --- | --- | --- |
| `packages/cli/tests/adapters/adapter-graph-surface-hash-parity.test.ts` | 6 | ✅ |
| `packages/cli/tests/adapters/adapter-pass-2b-surfaces.test.ts` | 10 | ✅ |
| **Pass 2B net add** | **+16** | **all pass** |
| Pre-existing tests (Pass 1 + Pass 2 + Phase A-G) | 2,271 | ✅ unchanged |
| **Total project** | **2,287 / 2,287** | |

No existing test was modified, weakened, or had its snapshot widened.

Phase B doctor test (`Packages detected: 4`) is unaffected because
the new `Adapter:` line is inserted before that line.

---

## 9. Build / Typecheck / Test / Pack Results

| Step | Result |
| --- | --- |
| `npm run build` | ✅ all packages green |
| `npm run typecheck` | ✅ 8 / 8 packages |
| `npm test` | ✅ 2,287 / 2,287 in 42.8 s |
| `npx vitest run packages/core/tests/freeze` | ✅ 357 / 357 |
| `npx vitest run packages/cli/tests/adapters packages/adapter-pnpm/tests` | ✅ 96 / 96 (54 + 26 + 10 + 6) |
| `npm pack --dry-run --workspaces` | ✅ 8 packages pack cleanly (7 @ 1.2.0 + 1 @ 0.1.0) |
| CLI smoke `doctor --json --json-schema=v2` (repo root) | ✅ adapter = `@arch-engine/adapter-monorepo` HIGH |
| CLI smoke `doctor` human (pnpm fixture) | ✅ `Adapter: @arch-engine/adapter-pnpm (HIGH confidence)` |
| CLI smoke `explain regression --json --json-schema=v2` | ✅ exit 0, `data.adapter` absent |
| CLI smoke `explain @arch-engine/cli --json --json-schema=v2` | ✅ exit 0, `data.adapter.name === '@arch-engine/adapter-monorepo'` |

---

## 10. Compatibility Statement

- ✅ JSON v1 default output unchanged.
- ✅ No new CLI commands.
- ✅ No new CLI flags.
- ✅ No package version changed (all 7 existing @ `1.2.0`; new pnpm
  adapter remains at `0.1.0`).
- ✅ No `npm publish` invocation. No `git tag`.
- ✅ No `@arch-governance/*` dependency.
- ✅ Existing JSON v2 keys preserved verbatim.
- ✅ Existing doctor human output preserved — only one additive line.

---

## 11. Remaining Deltas

### BLOCKER
None.

### HIGH
None.

### MEDIUM
None.

### LOW
- **`explain regression` does not surface adapter identity.** The
  regression artifact carries `workspace.type` and `extractionMode`
  fields already; a future enhancement could plumb the adapter name
  through artifact emission so `explain regression` can surface it.
  This is documented as out-of-scope here because it requires a
  schema-versioned change to `.arch-engine/stability-score.json`.
- **No CLI human-output adapter line for `inspect`/`analyze`/`check`.**
  Pass 2B intentionally limits the new human line to `doctor` because
  spec §7.5 mentions doctor specifically and the other three commands
  have richer verdict headers where an extra line would compete with
  scores / drift summaries. JSON v2 carries the adapter on every
  command for any consumer that needs it.

### MICRO_DELTA
- **One JSDoc comment containing `*/` had to be reworded** in the new
  parity test file (same glob-string-in-comment hazard the pnpm
  adapter source already accommodates).
- **`adapter-graph-surface-hash-parity.test.ts` filters the root
  node** from the monorepo adapter's output to do parity comparison.
  The filter helper is local to the test file and uses the fixture's
  known root name string. Not exported; not a public API.

---

## 12. Recommended Next Mission

**`ARCH_ENGINE_V1_3_0_MINOR_RELEASE_PREPARATION`**

The release-surface is closed. The next mission can be a focused
release-prep pass:

1. Bump the 7 existing public packages to `1.3.0` lockstep
   (schema, core, cli, adapter-monorepo, governance-pack-{authority,rest-contract,journey}).
2. Keep `@arch-engine/adapter-pnpm` at `0.1.0` (adapters version
   independently).
3. Write `docs/releases/v1.3.0.md` referencing:
   - Runtime adapter selection (Pass 1 contract + Pass 2 wiring).
   - `data.adapter` JSON v2 block on `doctor`/`inspect`/`analyze`/`check`/`explain`
     (modes that run adapter selection).
   - `doctor` human adapter line.
   - 6 new `ARCH_ENGINE_*` error codes.
   - `@arch-engine/adapter-pnpm@0.1.0` published as additive package.
   - graphSurfaceHash parity guarantee + documented monorepo root
     asymmetry.
4. `npm publish` lockstep + `git tag arch-engine-v1.3.0` +
   `git tag adapter-pnpm-v0.1.0`.

Pass 3 (Yarn PnP adapter) remains independent and shippable as a
later patch CLI bump or another minor release.

---

*End of Pass 2B Release Surface Completion Audit.*
