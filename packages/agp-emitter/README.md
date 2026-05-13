# @arch-engine/agp-emitter

**Status:** Private / experimental / pre-trial.
**Visibility:** `"private": true`. **Never published to npm.**
**CLI integration:** none. The main `arch-engine` CLI does NOT
expose this package today.

A private workspace package that converts an Arch-Engine JSON v2
report into a deterministic **AGP canonical bundle**:

```
agp/
  snapshot.json          ← manifest + counts + snapshotDigest
  records.ndjson         ← sorted record stream, one record per line
```

## Why private?

Per AGP MVP spec [OQ-6 default](../../docs/agp/agp-schema-open-question-defaults.md):
the emitter ships **private and experimental** until at least one
real-repo bundle trial passes. The protocol (schemas + conformance
corpus) is public and stable; the implementation iterates.

## What it does

- Reads an Arch-Engine JSON v2 envelope from `arch-engine inspect | analyze | check`.
- Validates the input against the JSON v2 contract.
- Maps the envelope to AGP records:
  - `node` (from `data.topology.canonical.nodes[]`)
  - `edge` (from `data.topology.canonical.edges[]`)
  - `adapter_evidence` (from `data.adapter`)
  - `diagnostic` (from `diagnostics[]`)
  - `drift` (one record per delta when `data.drift` is present)
  - `policy_finding` (from `data.violations[]`)
  - `provenance` (one trust-plane record per bundle)
- Sorts the record stream per spec §10.4.
- Hashes records with BLAKE3 (`b3:<64-hex>`) — `@noble/hashes`.
- Hashes the snapshot with SHA-256 (`sha256:<64-hex>`) — Node `crypto`.
- Canonicalises JSON in JCS-style (RFC 8785 approximation).
- Writes `snapshot.json` + `records.ndjson` to the output directory.

## What it does NOT do

- **No repository scanning.** Input is a JSON v2 envelope, never a repo.
- **No code execution.** Never runs `yarn`, `pnpm`, `npm`, `.pnp.cjs`, or any other binary.
- **No network.** No fetches, no DNS.
- **No mutation** of the input or the output beyond writing the two files.
- **No CLI integration.** No `arch-engine emit-agp` command exists.
- **No verifier.** That ships separately as `@arch-engine/agp-verifier`.
- **No attestation / signing / SLSA / in-toto / Sigstore / SPDX / CycloneDX.** Deferred.
- **No observations.** Schema exists; emitter does not produce them.
- **No `@arch-governance/*` dependency.**

## Programmatic API

```ts
import {
  emitAgpBundle,
  emitAgpBundleToDirectory,
  isAgpEmitterError,
} from '@arch-engine/agp-emitter';

// Pure function: parsed envelope -> bundle in memory.
const bundle = emitAgpBundle(envelopeObject, rawBytes, {
  deterministic: true,
});

console.log(bundle.snapshot.snapshotDigest);
console.log(bundle.records.length);

// Filesystem wrapper: read input file, write snapshot.json + records.ndjson.
const result = emitAgpBundleToDirectory({
  inputPath: 'arch-engine-report.json',
  outputDir: 'agp/',
  options: { deterministic: true },
});
```

## CLI

The local binary `agp-emit` is built into `dist/cli.js`. It is NOT
installed into a path; invoke it via the dist file directly:

```bash
node packages/agp-emitter/dist/cli.js \
  --from arch-engine-report.json \
  --output agp/
```

### Flags

| Flag | Required | Meaning |
| --- | --- | --- |
| `--from <path>` | yes | Arch-Engine JSON v2 report path. |
| `--output <dir>` | yes | Output directory for the bundle. |
| `--force` | no | Overwrite a non-empty output directory. |
| `--deterministic` | no | Omit `emittedAt` for byte-stable snapshot. |
| `--version` | no | Print emitter version. |
| `--help` | no | Print usage. |

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Bundle written. JSON summary on stdout. |
| `2` | Invalid CLI args or input rejected by validator (`AGP_EMITTER_*` error). |
| `3` | Unexpected emitter error (internal). |

No stack traces by default. Set `DEBUG=arch-engine:agp` to see internal traces.

## End-to-end example

```bash
# 1) Produce a JSON v2 report from any Arch-Engine command.
arch-engine inspect --json --json-schema=v2 --output report.json

# 2) Emit the AGP bundle.
node packages/agp-emitter/dist/cli.js --from report.json --output agp/

# 3) Verify the output.
cat agp/snapshot.json | jq '.snapshotDigest'
wc -l agp/records.ndjson
```

## Determinism

Same input → byte-identical `records.ndjson` and identical
`snapshotDigest`. Run `--deterministic` to also stabilise
`snapshot.json` byte-for-byte (omits `emittedAt`).

`emittedAt`, when present, is **excluded** from the digest per
spec §11.5. Provenance is excluded from the factual subset that
the digest is computed over.

## Limitations (MVP)

- No attestation envelope (DSSE / Sigstore / GitHub artifact attestations).
- No projections (SLSA / in-toto / SPDX / CycloneDX).
- No verifier (verifier ships separately).
- No observation records (LLM, heuristic).
- No incremental fact DAG (full re-emit per invocation).
- No `arch-engine` subcommand integration.
- No `RFC 8785` number-format fidelity (uses JS `String(n)`; safe for current Arch-Engine outputs).
- Drift records' `current.snapshotDigest` anchors to the input's
  `graphSurfaceHash` to avoid the circular dependency between
  drift payloads and bundle self-reference. See
  [the spec OQ tracking](../../docs/agp/agp-schema-open-question-defaults.md).

## Spec references

- [AGP Canonical Bundle and Emitter MVP Specification](../../docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md)
- [AGP Schema Open Question Defaults](../../docs/agp/agp-schema-open-question-defaults.md)
- [AGP Repo Extraction Plan](../../docs/agp/agp-repo-extraction-plan.md)
- [AGP v1 JSON Schemas](../../docs/agp/schemas/v1/)
- [AGP v1 Conformance Corpus](../../docs/agp/conformance/v1/)
