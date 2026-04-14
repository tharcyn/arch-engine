# Sample Monorepo Topology Extraction Example

This walkthrough demonstrates how `arch-engine doctor` extracts topology from a small TypeScript monorepo workspace.

## Workspace structure

```
examples/sample-monorepo/
├── package.json              (workspaces: ["packages/*"])
├── tsconfig.json
└── packages/
    ├── api/
    │   ├── package.json      (@sample/api → depends on @sample/shared)
    │   └── index.ts
    ├── web/
    │   ├── package.json      (@sample/web → depends on @sample/shared)
    │   └── index.ts
    └── shared/
        ├── package.json      (@sample/shared)
        └── index.ts
```

## Install

Install the CLI and workspace adapter:

```bash
npm install @arch-engine/cli
npm install @arch-engine/adapter-monorepo
```

## Run topology diagnostics

From within the `examples/sample-monorepo/` directory:

```bash
npx arch-engine doctor
```

## Expected output

```
✔ Workspace type resolved as: yarn-npm (highest confidence)
✔ Packages detected: 4 / 4 expected
✔ Connected nodes: 4
✔ Coverage: 100%
✔ Connectivity: 100%
✔ Confidence: HIGH (Structured yarn-npm workspace extraction)
✔ Authority crossings observed: 0

Domain Distribution:
  ● LIBRARY: 3
  ● UNCLASSIFIED: 1
```

> **Note:** The root workspace is counted as a detected node. The three sub-packages under `packages/` are classified as `LIBRARY` by the adapter's authority domain classifier. The root itself may appear as `UNCLASSIFIED` since it does not reside under a recognized domain directory.

### Topology interpretation

This workspace contains three packages:

- **shared** — Provides reusable functionality consumed by multiple packages.
- **api** — Consumes shared functionality.
- **web** — Consumes shared functionality.

The adapter detects workspace structure and dependency edges automatically. The extracted adjacency map contains:

```
@sample/api    → [@sample/shared]
@sample/web    → [@sample/shared]
@sample/shared → []
```

### Topology diagram

```
      shared
      /    \
   api      web
```

This structure represents a fan-in dependency pattern where multiple packages depend on a shared internal module.

Arch-Engine detects this topology automatically through workspace package relationships and dependency edges resolved by the monorepo adapter.

### Reproducing this example

Run the example locally:

```bash
cd examples/sample-monorepo
npm install
npm install @arch-engine/cli
npm install @arch-engine/adapter-monorepo
npx arch-engine doctor
```

This produces a topology extraction summary describing workspace structure, dependency connectivity, and classification confidence.

### Extending validation coverage

Install an architecture governance pack:

```bash
npm install @arch-engine/governance-pack-authority
```

Governance packs extend analysis beyond structural topology extraction by detecting architectural boundary crossings and invariant violations across package relationships.

This layered model allows topology extraction to remain lightweight while enabling progressive enforcement through optional policy extensions.

### Understanding the extraction result

In this example:

- **Coverage: 100%** — All workspace packages were detected.
- **Connectivity: 100%** — All dependency relationships were resolved into a coherent topology graph.
- **Confidence: HIGH** — The workspace structure matches a strongly recognizable monorepo topology pattern.
- **Authority crossings observed: 0** — No architectural boundary violations were detected.

Installing additional governance packs enables deeper semantic validation beyond structural connectivity.
