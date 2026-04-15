# Contributing to Arch-Engine

Thank you for your interest in contributing to Arch-Engine.

## Getting started

```bash
git clone https://github.com/tharcyn/arch-engine.git
cd arch-engine
npm install
npm run build
npm test
```

## Requirements

- Node.js ≥ 20
- npm 10+

## Development workflow

1. Create a feature branch from `main`.
2. Make your changes.
3. Run the full test suite: `npm test`
4. Run the type checker: `npm run typecheck`
5. Open a pull request against `main`.

## Pull request expectations

- All tests must pass (322 test files, 915 tests).
- No regressions to the public export surface.
- No modifications to snapshot determinism guarantees.
- Changes to CLI output format require updating the [CLI Surface Contract](docs/cli-surface-contract.md).

## Architecture invariants

Arch-Engine maintains strict architectural contracts. Please review:

- [Public Surface Contract](docs/public-surface-contract.md) — export stability guarantees
- [Determinism Contract](docs/determinism-contract.md) — hash stability requirements
- [Policy Pack Contract](docs/policy-pack-contract.md) — governance pack authoring rules

## Reporting issues

- **Bugs** — Use the [bug report template](https://github.com/tharcyn/arch-engine/issues/new?template=bug_report.md).
- **Features** — Use the [feature request template](https://github.com/tharcyn/arch-engine/issues/new?template=feature_request.md).
- **Security** — See [SECURITY.md](SECURITY.md).

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.
