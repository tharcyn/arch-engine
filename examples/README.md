# Examples

Executable examples demonstrating `@arch-engine/core` capabilities.

Each example is a self-contained directory with its own policy, topology,
expected output, and documentation. Examples are designed to be:

- **Deterministic** — identical inputs always produce identical outputs
- **Self-verifying** — expected output snapshots enable automated replay verification
- **Standalone** — no external registry or network dependencies required
- **Educational** — each example explains the specific enforcement behavior it demonstrates

---

## Available Examples

### [policy-pack-minimal](./policy-pack-minimal/)

A minimal three-layer architecture policy demonstrating:

| Capability | What It Proves |
|---|---|
| Layer enforcement | `frontend → services → infrastructure` dependency direction |
| Tier precedence | Higher-tier domains cannot import from lower-tier domains |
| Violation detection | Forbidden `frontend → infrastructure` edge detected deterministically |
| policyHash stability | SHA-256 canonical hash is reproducible across environments |
| Snapshot replay | Expected output is byte-stable across runs and Node versions |

**Start here** if you are evaluating `@arch-engine/core` for the first time.

See [policy-pack-minimal/run-example.md](./policy-pack-minimal/run-example.md) for a
step-by-step execution walkthrough.

### [trusted-fallback](./trusted-fallback/)

A capability federation example demonstrating provider fallback resolution
with mirror equivalence, trust scoring, and deterministic single-candidate
selection.

---

## Adding New Examples

Each example directory should contain:

| File | Purpose |
|---|---|
| `README.md` | High-level overview and architecture context |
| `manifest.json` | Pack metadata and schema authority references |
| `policy.yml` or equivalent | Policy definition |
| `topology.json` or equivalent | Input graph / provider descriptors |
| `expected-output.snapshot.json` | Byte-stable expected output for replay verification |
| `run-example.md` | Step-by-step execution walkthrough |

Expected output snapshots must contain **no timestamps, filesystem paths,
or environment-dependent values**.
