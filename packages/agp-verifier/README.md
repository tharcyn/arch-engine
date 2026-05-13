# @arch-engine/agp-verifier

**Status:** Private / experimental / pre-trial.
**Visibility:** `"private": true`. **Never published to npm.**
**CLI integration:** none. The main `arch-engine` CLI does NOT
expose this package today.

A private workspace package that independently verifies an
**AGP canonical bundle**:

```
agp/
  snapshot.json          ← manifest + counts + snapshotDigest
  records.ndjson         ← sorted record stream, one record per line
```

…and returns a deterministic verdict.

## Why private?

Per AGP MVP spec [OQ-6 default](../../docs/agp/agp-schema-open-question-defaults.md)
and Phase C of the implementation sequence: the verifier ships
**private and experimental** until a real-repo bundle trial pass
exercises it. The protocol (schemas + conformance corpus) is
public and stable; the implementation iterates.

## What it does

- Reads `snapshot.json` + `records.ndjson` from a bundle directory.
- Validates each record envelope and the snapshot manifest against
  the AGP v1 JSON Schemas in [`docs/agp/schemas/v1/`](../../docs/agp/schemas/v1/).
- Recomputes every record's `payloadHash` (BLAKE3 via
  `@noble/hashes`) and compares to the declared value.
- Recomputes every record's canonical `id` (`agp:<family>:<kind>:<payloadHash>`).
- Checks the manifest ↔ stream bijection (no missing/extra records,
  cross-references agree, counts match).
- Recomputes the `snapshotDigest` (SHA-256 via Node `crypto`) over
  the canonical factual projection.
- Checks records.ndjson sort order per spec §10.4.
- Checks the family ↔ plane invariant.
- Scans every payload string for absolute-path leaks.
- Verifies allowed hash algorithm prefixes (`b3:`, `sha256:`).
- Optionally cross-checks `attestation` records' subject digest
  against `snapshot.snapshotDigest`.

## What it does NOT do

- **No repository scanning.** Input is a bundle directory only.
- **No code execution.** Never runs `yarn`, `pnpm`, `npm`, `.pnp.cjs`, or anything else.
- **No network.** No fetches, no DNS.
- **No mutation** of the input directory.
- **No CLI integration.** No `arch-engine verify-agp` command exists.
- **No signature verification.** DSSE / Sigstore / SLSA / in-toto are explicitly out of scope.
- **No SPDX / CycloneDX projection consumption.**
- **No OPA / Rego.**
- **No `@arch-governance/*` dependency.**
- **No emitter runtime dependency.** The verifier re-implements
  JCS canonicalisation, BLAKE3, and SHA-256 independently, so a
  verifier-emitter drift surfaces as a digest mismatch instead of
  being silently consistent.

## Verdict model

| Verdict | Condition |
| --- | --- |
| `valid` | All required checks pass. |
| `valid_with_warnings` | All required checks pass; one or more *optional* checks emitted a warning (e.g. an attestation record references an envelope file that the verifier intentionally does not dereference). |
| `invalid` | A required schema or structural check failed. |
| `unsupported_schema` | The bundle declares an `agpVersion` major or record `schemaVersion` outside the verifier's supported set. |
| `tampered` | `snapshotDigest` mismatch, `payloadHash` mismatch, `id`-formula mismatch, manifest/stream non-bijection, duplicate record id / manifest id, manifest cross-reference disagreement, undeclared hash algorithm prefix, or attestation subject mismatch. |

## Programmatic API

```ts
import {
  verifyAgpBundle,
  verifyAgpBundleDirectory,
  isAgpVerifierError,
} from '@arch-engine/agp-verifier';

// Pure function: parsed bundle bag → verification result.
const result = verifyAgpBundle({
  bundle: {
    snapshot,           // parsed snapshot.json
    records,            // parsed records[] (in stream order)
    recordsRaw: [],     // optional: original line numbers + raw lines
    snapshotJsonText: '',
  },
  options: { strict: false, deterministic: true },
});
console.log(result.verdict);    // 'valid' | 'invalid' | ...
console.log(result.issues);     // structured AGP_VERIFIER_* issue list

// Filesystem wrapper: read snapshot.json + records.ndjson from disk.
const result2 = verifyAgpBundleDirectory({
  bundleDir: 'agp/',
  options: { strict: false },
});
```

## CLI

The local binary `agp-verify` is built into `dist/cli.js`. It is
NOT installed into a path; invoke it via the dist file directly:

```bash
node packages/agp-verifier/dist/cli.js --bundle agp/
node packages/agp-verifier/dist/cli.js --bundle agp/ --json
node packages/agp-verifier/dist/cli.js --bundle agp/ --strict
```

### Flags

| Flag | Required | Meaning |
| --- | --- | --- |
| `--bundle <dir>` | yes | Directory containing `snapshot.json` + `records.ndjson`. |
| `--json` | no | Emit a single JSON object on stdout. |
| `--strict` | no | Treat `valid_with_warnings` as exit 1. |
| `--version` | no | Print verifier version. |
| `--help` | no | Print usage. |

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | `valid` OR `valid_with_warnings` (without `--strict`) |
| `1` | `invalid` OR `tampered` |
| `2` | `unsupported_schema` OR usage / bundle path error |
| `5` | Internal verifier error |

No stack traces by default. Set `DEBUG=arch-engine:agp` to see internal traces.

## End-to-end example

```bash
# 1) Produce a JSON v2 report from any Arch-Engine command.
arch-engine inspect --json --json-schema=v2 --output report.json

# 2) Emit the AGP bundle (private emitter).
node packages/agp-emitter/dist/cli.js --from report.json --output agp/

# 3) Verify the bundle (private verifier).
node packages/agp-verifier/dist/cli.js --bundle agp/

# 4) Tamper:
sed -i.bak 's/"snapshotDigest":"sha256:[0-9a-f]*"/"snapshotDigest":"sha256:000…000"/' agp/snapshot.json
node packages/agp-verifier/dist/cli.js --bundle agp/   # exit 1, verdict: tampered
```

## Issue vocabulary

All issues carry an `AGP_VERIFIER_*` code:

| Code | Verdict impact |
| --- | --- |
| `AGP_VERIFIER_BUNDLE_NOT_FOUND` / `BUNDLE_NOT_DIRECTORY` / `SNAPSHOT_NOT_FOUND` / `RECORDS_NOT_FOUND` | thrown (exit 2) |
| `AGP_VERIFIER_SNAPSHOT_PARSE_FAILED` / `RECORD_PARSE_FAILED` | invalid |
| `AGP_VERIFIER_UNSUPPORTED_SCHEMA_VERSION` / `UNSUPPORTED_AGP_VERSION` | unsupported_schema |
| `AGP_VERIFIER_SCHEMA_VALIDATION_FAILED` | invalid |
| `AGP_VERIFIER_PAYLOAD_HASH_MISMATCH` | tampered |
| `AGP_VERIFIER_RECORD_ID_MISMATCH` / `RECORD_ID_FORMAT_INVALID` | tampered / invalid |
| `AGP_VERIFIER_DUPLICATE_RECORD_ID` / `DUPLICATE_MANIFEST_ID` | tampered |
| `AGP_VERIFIER_MANIFEST_RECORD_MISSING` / `RECORD_NOT_IN_MANIFEST` / `MANIFEST_CROSS_REF_MISMATCH` / `COUNT_MISMATCH` | invalid / tampered |
| `AGP_VERIFIER_SNAPSHOT_DIGEST_MISMATCH` | tampered |
| `AGP_VERIFIER_SORT_ORDER_INVALID` | invalid |
| `AGP_VERIFIER_PLANE_INVARIANT_FAILED` | invalid |
| `AGP_VERIFIER_ABSOLUTE_PATH_LEAK` | invalid |
| `AGP_VERIFIER_UNSUPPORTED_HASH_ALGORITHM` | invalid |
| `AGP_VERIFIER_ATTESTATION_SUBJECT_MISMATCH` | tampered |
| `AGP_VERIFIER_ATTESTATION_ENVELOPE_UNVERIFIED` | warning (valid_with_warnings) |
| `AGP_VERIFIER_INTERNAL_ERROR` | exit 5 |

## Determinism

Same input → same verdict, same `summary`, and (with
`options.deterministic: true`) no `checkedAt` wall-clock field.

## Limitations (MVP)

- No DSSE / Sigstore / SLSA / in-toto signature verification.
- No SPDX / CycloneDX projection consumption.
- No verifier-side conformance fixture rebuild (placeholder hashes
  in the v1 conformance corpus correctly resolve to `tampered`).
- No incremental verification (full re-check per invocation).
- No `arch-engine` subcommand integration.
- No `RFC 8785` number-format fidelity (re-implements emitter's
  `String(n)`-based numeric form so the two stay byte-aligned).

## Spec references

- [AGP Canonical Bundle and Emitter MVP Specification](../../docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md) §16
- [AGP Schema Open Question Defaults](../../docs/agp/agp-schema-open-question-defaults.md)
- [AGP Repo Extraction Plan](../../docs/agp/agp-repo-extraction-plan.md)
- [AGP v1 JSON Schemas](../../docs/agp/schemas/v1/)
- [AGP v1 Conformance Corpus](../../docs/agp/conformance/v1/)
- [AGP Emitter package](../agp-emitter/README.md)
