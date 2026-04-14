# @arch-engine/cli

Command-line interface for architecture topology extraction and validation.

## Installation
```bash
npm install @arch-engine/cli@rc
```

## Usage
```bash
npx arch-engine doctor
```

## Interpreting doctor output

The `arch-engine doctor` command analyzes repository topology readiness and architecture extraction confidence.

**Key signals:**

- **Coverage** — Percentage of repository nodes successfully extracted into the topology graph.
- **Connectivity** — Indicates whether relationships between nodes were resolved into a coherent graph structure.
- **Confidence** — Extraction confidence based on workspace structure detection and adapter signal strength.
- **Authority crossings** — Detected architectural boundary crossings between layers or domains.
- **Unclassified nodes** — Nodes detected but not assigned to an architectural domain. These can often be improved by installing adapters or governance policy packs.

> **Tip:** Install adapters (for example `@arch-engine/adapter-monorepo`) and governance packs to increase topology classification signal quality.

## Optional Extensions
Adapters are required for topology extraction. You must install a filesystem extraction adapter locally so the CLI can discover workspaces safely.
Example:
```bash
npm install @arch-engine/adapter-monorepo@rc
```

Governance packs are also optional extensions providing additional validation logic.
