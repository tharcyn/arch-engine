# CLI Readiness Matrix — @arch-engine/cli

## Overview

This matrix documents the implementation status and stability classification of all CLI commands in the `@arch-engine/cli` package as of v0.1.0-preview.

## Command Matrix

| Command | Status | Stability Level | Output Modes | Schema Contract |
|---|---|---|---|---|
| `doctor` | ✅ Implemented | `stable-preview` | text, `--json` | `schemas/cli-output-contract.json` |
| `inspect` | ✅ Implemented | `stable-preview` | text, `--json` | `schemas/cli-output-contract.json` |
| `check` | ✅ Implemented | `stable-preview` | text, `--json` | `schemas/cli-output-contract.json` |
| `analyze` | ✅ Implemented | `experimental-preview` | text, `--json` | Not yet schema-governed |
| `explain` | ✅ Implemented | `experimental-preview` | text, `--json` | Not yet schema-governed |

## Stability Level Definitions

| Level | Definition |
|---|---|
| `stable-preview` | Output shape is schema-governed and will not change without a minor version bump. Safe for CI integration. |
| `experimental-preview` | Functional but output shape may change between patch versions. Do not depend on specific field names in automation. |
| `reserved` | Command name is reserved but not yet implemented. Will return a helpful stub message if invoked. |

## Command Details

### `doctor` — Environment Confidence

Reports environment readiness and topology confidence:
- Workspace type detection (structured vs fallback)
- Node/package detection
- Coverage and connectivity metrics
- Domain distribution analysis
- Quality floor validation

**Exit codes:** 0 (healthy), 1 (fatal error)

### `inspect` — Topology Confidence

Outputs canonical topology summary without executing violation pipeline:
- Node and edge counts
- Authority crossings
- Confidence and coverage metrics
- Domain distribution
- Active adapters

**Exit codes:** 0 (complete), 1 (fatal error)

### `check` — Violation Detection

Full architecture pipeline execution:
- Stability scoring
- Authority crossing analysis
- Policy evaluation (if `arch-policy.yml` present)
- Regression detection (vs baseline artifact)
- Stability artifact generation

**Exit codes:** 0 (pass), 2 (blocker violations), 3 (coverage threshold), 5 (policy violations in enforce mode)

### `analyze` — Discovery & Insights

Stability scoring and blast radius summary:
- Weighted blast radius computation
- Conflict ratio analysis
- Graph stability index

**Exit codes:** 0 (complete), 1 (fatal error)

### `explain` — Reasoning Transparency

Reasoning trace and policy explanation:
- Entity relationship lookup
- Regression context explanation
- Policy violation explanation with source chain rendering

**Exit codes:** 0 (complete), 1 (fatal error)

## Global Options

| Option | Description |
|---|---|
| `--json` | Output results as JSON conforming to CLI output contract schema |
| `--no-color` | Disable colorized terminal output |
