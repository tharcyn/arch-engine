# demo-drift

A tiny, deterministic fixture for Arch-Engine CLI screenshots and the README
demo. Three workspaces sketch a payment-checkout flow with one architectural
drift baked into the topology, and a one-rule policy that catches it.

```
src/
  frontend/    @demo-drift/frontend   ← imports services AND payments  ⚠ drift
  services/    @demo-drift/services   ← owns the payments integration
  payments/    @demo-drift/payments   ← provider gateway
.archengine/
  policy.yml                          ← forbids @demo-drift/frontend → @demo-drift/payments
```

The drift is the `frontend → payments` direct edge in
`src/frontend/CheckoutButton.ts`. In a healthy architecture the frontend
should only call the services layer; the payments gateway should be reached
through `PaymentService` so provider changes don't require a frontend
release.

## Try it

From the repository root, with `@arch-engine/cli` and
`@arch-engine/adapter-monorepo` installed (or building the local monorepo):

```bash
cd examples/demo-drift

# 1. Workspace readiness and adapter signal.
arch-engine doctor

# 2. The extracted topology — 4 nodes, 3 edges, including the drift edge.
arch-engine inspect

# 3. Architecture signal and risk. Informational; never blocks CI.
arch-engine analyze

# 4. The policy gate. THIS BLOCKS WITH AN EXIT 1.
arch-engine check
```

`arch-engine check` produces output of the form:

```
Blocked: 1 architecture violation.

  ✗ @demo-drift/frontend → @demo-drift/payments   (blocks CI)
    Rule:     frontend-must-not-touch-payment-gateway
    Severity: error

Fix: remove or re-route the offending edge(s) above, or update your policy
to allow them.
Exit 1: blocking architecture violations.
```

The non-zero exit code is what fails the CI gate. To make the violation go
away, remove the `import { PaymentGateway }` line from
`src/frontend/CheckoutButton.ts` and re-run `check`.

## What the policy does

`.archengine/policy.yml` declares one `forbid` rule:

```yaml
version: 1
mode: enforce
rules:
  forbid:
    - id: frontend-must-not-touch-payment-gateway
      from: '@demo-drift/frontend'
      to:   '@demo-drift/payments'
      severity: error
```

`arch-engine check` evaluates every workspace dependency edge against the
policy. The frontend → payments edge is forbidden, so it shows up as a
blocking violation in `enforce` mode. Switching `mode: enforce` to
`mode: advisory` would surface the same finding but exit 0 (CI does not
block; the warning still appears).

## What this fixture does NOT do

- This fixture does **not** depend on `@arch-governance/*`. AGP integration
  is a separate ecosystem, opt-in via the future `@arch-engine/agp-emitter`
  package per `docs/contracts/agp-emitter-contract.md`.
- The fixture's policy uses **exact node IDs** (`@demo-drift/frontend`,
  `@demo-drift/payments`) rather than abstract domain names. The v1.0.x
  policy evaluator matches `from` / `to` as path-style prefixes against the
  workspace node identifiers extracted by `@arch-engine/adapter-monorepo`.
  Domain-name policies (e.g. `from: frontend`, `to: payments`) require
  per-package authority hints from a future minor release.
- The fixture is **not** an npm package. The inner workspaces are `private:
  true` and exist only as a topology source.

## Why these names?

`frontend → services → payments` is the canonical shape of an architecture
boundary that matters at scale: front-end teams want fast iteration; the
payment integration wants stability and audit trail. Direct imports from
the frontend to the gateway are exactly the kind of edge an architecture
review would flag manually, and exactly the kind a policy pack should flag
automatically. This fixture exists to make that conversation concrete and
**reproducible** — running `arch-engine check` here always produces the
same blocked output, every machine, every run.
