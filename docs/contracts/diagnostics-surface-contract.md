# Diagnostics Surface Contract

The Arch-Engine diagnostics surface formally bridges architectural governance out of the CI environment and directly into the author-time workflow of software engineers.

## Guarantees

1. **LSP Compatibility**: All diagnostics exported via \`arch-engine diagnostics workspace --json\` map 1:1 with the Microsoft Language Server Protocol specification. IDEs immediately recognize range, severity, and related reference data.
2. **Deterministic Feedback**: Local diagnostics use the exact same hash evaluation core as the CI gate runner. An author-time \"green\" guarantees a CI \"green\".
3. **Incremental Evaluation**: The \`IncrementalEvaluationRuntime\` ensures full dependency graph execution is short-circuited. Only rules mapping to modified lines/datasets run locally, providing sub-second feedback loops.
4. **Project Config Discovery**: Editor tooling automatically locates \`.arch-engine.yml\` up the directory tree to resolve environment contexts.
5. **Pre-Commit Enforcement**: The pre-commit generator wraps the \`gate local\` command, strictly enforcing \"shift-left\" policy adoption for severity thresholds.

This API ensures developers are never surprised by architectural failures during code review.
