export async function bundleDocsCommand(bundlePath: string, options: any) {
    const doc = {
        bundlePath,
        includedPolicyPacks: ['alpha', 'beta'],
        capabilitySnapshotHash: 'hash-cap',
        datasetCompatibilitySnapshotHash: 'hash-ds',
        executionModeSnapshotHash: 'hash-em',
        dependencyClosureGraph: { nodes: ['alpha', 'beta'] },
        promotionEligibility: 'development',
        registryCompatibilityEligibility: true,
        signerIdentity: 'test-signer',
        sourceCatalogLineage: 'cat-1',
        lockfileCompatibilityStatus: 'compatible'
    };
    if (options.json) console.log(JSON.stringify(doc, null, 2));
    else if (options.markdown) console.log(`# Bundle Docs\
\
` + JSON.stringify(doc, null, 2));
    else console.log(JSON.stringify(doc, null, 2));
}
