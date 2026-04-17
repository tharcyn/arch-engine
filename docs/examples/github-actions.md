# CI Pipeline Example (GitHub Actions)

Because Arch-Engine exposes a formalized adapter execution telemetry boundary, orchestrating it within CI pipelines like GitHub Actions is highly deterministic and cleanly decoupled from log parsing.

## Example Workflow Snippet

This snippet demonstrates a typical execution pass. Notice how the pipeline explicitly parses the strictly typed `adapterOutcome` JSON field.

```yaml
name: "Arch-Engine: Policy Evaluation"

on:
  push:
    branches:
      - main

jobs:
  evaluate-and-propose:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source
        uses: actions/checkout@v4

      - name: Generate and Execute Provider Plan
        id: engine_execution
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # 1. Evaluate policy and pipe neutral JSON to GitHub adapter
          # 2. Instruct adapter to execute mutative actions (--execute)
          # 3. Request machine-readable output (--json-output-plan)
          
          OUTPUT=$(arch-engine policies emit-policy-pr --json | arch-engine github create-policy-pr --execute --json-output-plan)
          
          # Use jq to extract the exact adapter lifecycle outcome
          OUTCOME=$(echo "$OUTPUT" | jq -r .adapterOutcome)
          
          echo "Engine finished with outcome: $OUTCOME"
          
          # Set step outputs for downstream pipeline conditional logic
          echo "outcome=$OUTCOME" >> $GITHUB_OUTPUT
          
      - name: Report Success
        if: steps.engine_execution.outputs.outcome == 'pr-created'
        run: echo "Successfully originated a new architectural proposal PR."
        
      - name: Report Update
        if: steps.engine_execution.outputs.outcome == 'pr-reused'
        run: echo "An existing proposal PR was seamlessly updated."

      - name: Handle Refusal
        if: steps.engine_execution.outputs.outcome == 'refused'
        run: |
          echo "Adapter explicitly refused to execute."
          exit 1
```

### Repository Verification Example
In the GitHub Actions environment, the GitHub adapter will automatically detect the standard `GITHUB_REPOSITORY` environment variable. It verifies this against the normalized payload hint. If someone takes an exported JSON payload from one repository's CI run and mistakenly pipes it to the adapter in another repository, the adapter will immediately abort the run, resulting in an `adapterOutcome: "refused"` signal.

### Branch Naming Example
The resulting PR in this example will automatically target the deterministic integrity branch:
`arch-engine/policy-update/ci/8f2c19a`
