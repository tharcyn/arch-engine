# Annotation Surface Contract

The Arch-Engine annotation surface converts raw architectural governance evaluation hashes, regressions, and capability drop-offs into deterministic, readable CI evidence and PR/MR comments.

## Guarantees

1. **Deterministic Annotations**: Generating a comment or markdown payload from the exact same topological inputs and rule sets yields exactly the same byte-for-byte comment structure.
2. **Provider Neutrality**: Native `github` and `gitlab` adapter commands exist, but the core engine renders `FindingAnnotation` structures purely in a format-neutral manner before translation.
3. **Trace Linkage Guarantee**: Every finding explicitly maintains its `traceReferenceId`, ensuring developers can jump from a GitHub PR comment directly to a local `arch-engine evaluate trace` command to debug the failure lineage.
4. **CI Attachment Compatibility**: The `arch-engine report export` command provides pure, portable HTML and Markdown for upload as native pipeline artifacts, completely abstracted from the repository host.
5. **Snapshot Protection**: Comments will never change format invisibly. The format is locked in the CLI test suite.

This establishes the annotation layer as the definitive governance feedback loop for developers.
