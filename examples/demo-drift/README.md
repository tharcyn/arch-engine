# demo-drift

A tiny, deterministic fixture for Arch-Engine CLI screenshots and the README
demo. Three workspaces sketch a payment-checkout flow with one architectural
drift baked into the topology.

```
src/
  frontend/    @demo-drift/frontend   ← imports services AND payments  ⚠ drift
  services/    @demo-drift/services   ← owns the payments integration
  payments/    @demo-drift/payments   ← provider gateway
```

The drift is the `frontend → payments` direct edge in
`src/frontend/CheckoutButton.ts`. In a healthy architecture the frontend should
only call the services layer; the payments gateway should be reached through
`PaymentService` so provider changes don't require a frontend release.

## Try it

From the repository root, with `@arch-engine/cli` and
`@arch-engine/adapter-monorepo` installed (or building the local monorepo):

```bash
cd examples/demo-drift

# Check workspace readiness and adapter signal.
arch-engine doctor

# See what topology Arch-Engine extracted.
arch-engine inspect

# Score the architecture signal. Informational; never blocks CI.
arch-engine analyze

# Run the policy gate. Without a policy file, this reports
# "no policy configured" and exits 0.
arch-engine check
```

The four workspaces should be detected, three edges should be observed
(`@demo-drift/frontend → @demo-drift/services`,
`@demo-drift/frontend → @demo-drift/payments`,
`@demo-drift/services → @demo-drift/payments`), and `inspect` should print
the topology summary.

## What this fixture does NOT do

- This fixture does **not** ship with an enforceable policy file. The v1.0.x
  CLI's policy-domain mapping for adapter-extracted topology requires
  per-package authority hints that are not configured here. Authoring an
  enforceable policy that produces a *real* `frontend → payments` violation
  in CI is a deliberate next-pass scope — see the CLI Experience
  Specification §12 for the planned demo-drift "Blocked" output.
- This fixture is **not** an npm package. The inner workspaces are `private:
  true` and exist only as a topology source.
- This fixture does **not** depend on `@arch-governance/*`. AGP integration
  is a separate ecosystem, opt-in via the future `@arch-engine/agp-emitter`
  package per `docs/contracts/agp-emitter-contract.md`.

## Why these names?

`frontend → services → payments` is the canonical shape of an architecture
boundary that matters at scale: front-end teams want fast iteration; the
payment integration wants stability and audit trail. Direct imports from
the frontend to the gateway are exactly the kind of edge an architecture
review would flag manually, and exactly the kind a policy pack should flag
automatically. This fixture exists to make that conversation concrete.
