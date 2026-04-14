# @arch-engine/adapter-monorepo

Federation-ready architecture extraction adapter for resolving workspace topologies deterministically without leaking framework-specific behavior.

## Purpose
This package connects the `@arch-engine/core` architecture reasoning pipeline to physical local disk layouts. It translates npm workspaces, yarn workspaces, and pnpm monorepos into deterministic architecture graph topologies.

## Why Optional?
To guarantee pure architectural determinism, the core SDK and CLI must remain decoupled from filesystem resolution behaviors. By keeping the adapter optional, consumers can integrate custom federation plugins, database-driven extraction logic, or cloud-hosted graphs without downloading unnecessary filesystem parsers.

## Installation
\`\`\`bash
npm install @arch-engine/adapter-monorepo@rc
\`\`\`

## CLI Integration
Once installed centrally, the \`arch-engine\` CLI dynamically resolves this package at runtime to perform workspace discovery. If missing, it gracefully suggests manual dependency inclusion.
