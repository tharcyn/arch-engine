# Invalid fixture: `json-v1-input-rejected`

**Demonstrates:** the emitter must reject Arch-Engine JSON v1 input.
**Expected rejection reason:** `schemaVersion !== "arch-engine.cli.v2"` (in this case, the field is entirely absent — v1 is a flat envelope without `schemaVersion`).
**Expected future verifier code:** `AGP_EMITTER_INPUT_NOT_V2` (severity `ERROR`).
**Verifier verdict for any bundle this would produce:** N/A — no bundle is produced.

## Why this exists

The emitter consumes only Arch-Engine JSON v2. v1 is a flat shape
without `data.topology.canonical`. A v1 input that the emitter
silently accepted would produce an under-specified bundle (no
canonical topology, no `data.adapter`).

## Files

- `input-v1.json` — a stylised Arch-Engine v1 `doctor --json` envelope.
- `expected-rejection.json` — a stylised emitter rejection report
  (the actual emitter would write its diagnostic to stderr or a
  designated error-output file).

The emitter rejects this BEFORE any bundle file is opened.
