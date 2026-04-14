# @arch-engine/cli

Command-line interface for architecture topology extraction and validation.

## Installation
```bash
npm install @arch-engine/cli
```

## Adapter Dependency
Adapters are required for topology extraction. You must install a filesystem extraction adapter locally so the CLI can discover workspaces safely:
```bash
npm install @arch-engine/adapter-monorepo
```

Governance packs are also optional extensions providing additional validation logic.
