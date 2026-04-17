# Adapter Branch Reuse Policy

Adapters must deterministically resolve what happens when an execution run attempts to mutate a branch that already exists upstream.

## The Duplicate PR Prevention Guarantee

When a payload mathematically derives a branch name that is already present in the upstream provider, the adapter initiates its Reuse Detection sequence.

1. **Branch Reuse:** The adapter forces an update to the upstream branch (`branchReused: true`), ensuring the latest commit SHA accurately reflects the current payload state.
2. **Existing PR Detection:** Before creating a new Pull/Merge Request, the adapter queries the provider API to detect if an active Request is already attached to that specific branch head.

If an existing open Request is discovered:
- The adapter intentionally **halts** further creation logic.
- It suppresses duplicate PR creation to prevent polluting repository maintainer queues.
- It returns structured telemetry indicating `existingPullRequestDetected: true`.
- It maps the overall run to `adapterOutcome: 'pr-reused'`, elevating the existing Request URL and ID in the response payload.

If an existing open Request is *not* discovered (e.g., the branch exists but the previous PR was closed):
- The adapter successfully opens a new Request against the reused branch.
- It maps the overall run to `adapterOutcome: 'pr-created'`.

## Why Block Duplicate Creation?

Failing to block duplicate creation introduces "silent branch reuse drift" in parallel CI runs, scheduled automation jobs, and manual retries. By explicitly policing the edge case where the target branch and a target Request already exist, Arch-Engine allows pipelines to be completely stateless and highly repetitive, safely relying on the adapter to maintain a single, clean convergence state in the provider UI.
