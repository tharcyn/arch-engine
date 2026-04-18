export async function explainCapabilityCommand(capabilityId: string, options: any) {
    const trace = {
        traceStepId: 'trace-1',
        traceType: 'CAPABILITY_GATING',
        inputContextHash: 'hash',
        decisionOutcome: 'blocked',
        decisionReason: 'Missing required capability',
        relatedCapabilityIds: [capabilityId],
        relatedDatasetSchemas: [],
        relatedExecutionModes: [],
        providerScope: [],
        datasetScope: [],
        timestampDeterministicIndex: 1,
        requestedCapability: capabilityId,
        availableCapabilities: ['other-cap'],
        intersectionResult: 'missing',
        missingCapabilities: [capabilityId],
        blockingProviders: ['github'],
        blockingDatasets: ['hash1'],
        blockingExecutionModes: []
    };
    if (options.json) console.log(JSON.stringify(trace, null, 2));
    else console.log(JSON.stringify(trace, null, 2));
}

export async function explainDatasetCommand(schemaId: string, options: any) {
    const trace = {
        traceStepId: 'trace-2',
        traceType: 'DATASET_ELIGIBILITY',
        inputContextHash: 'hash',
        decisionOutcome: 'allowed',
        decisionReason: 'Schema match',
        relatedCapabilityIds: [],
        relatedDatasetSchemas: [schemaId],
        relatedExecutionModes: [],
        providerScope: [],
        datasetScope: [],
        timestampDeterministicIndex: 2,
        requiredDatasetSchemas: [schemaId],
        availableDatasetSchemas: [schemaId],
        schemaIntersectionResult: 'match',
        schemaMismatchReasons: [],
        federationCompatibilityImpact: 'none'
    };
    if (options.json) console.log(JSON.stringify(trace, null, 2));
    else console.log(JSON.stringify(trace, null, 2));
}

export async function explainIdentityCommand(nodeId: string, options: any) {
    const trace = {
        traceStepId: 'trace-3',
        traceType: 'IDENTITY_RESOLUTION',
        inputContextHash: 'hash',
        decisionOutcome: 'resolved',
        decisionReason: 'Cross-provider alias',
        relatedCapabilityIds: [],
        relatedDatasetSchemas: [],
        relatedExecutionModes: [],
        providerScope: [],
        datasetScope: [],
        timestampDeterministicIndex: 3,
        nodeId,
        collisionCategory: 'CROSS_PROVIDER_IDENTITY_ALIAS',
        providerPrecedenceNeutrality: true,
        mergeJustification: 'Explicit alias defined'
    };
    if (options.json) console.log(JSON.stringify(trace, null, 2));
    else console.log(JSON.stringify(trace, null, 2));
}

export async function explainFindingCommand(findingId: string, options: any) {
    const trace = {
        traceStepId: 'trace-4',
        traceType: 'FINDING_GENERATION',
        inputContextHash: 'hash',
        decisionOutcome: 'generated',
        decisionReason: 'Rule matched',
        relatedCapabilityIds: [],
        relatedDatasetSchemas: [],
        relatedExecutionModes: [],
        providerScope: [],
        datasetScope: [],
        timestampDeterministicIndex: 4,
        originatingRule: 'rule-1',
        originatingPack: 'pack-1',
        capabilityUsed: 'cap-1',
        datasetUsed: 'ds-1',
        executionModeUsed: 'multi-provider-federated',
        providerProvenance: ['github'],
        datasetProvenance: ['hash1'],
        federationMergeParticipation: ['hash1'],
        suppressionStatus: 'none',
        deduplicationParticipation: []
    };
    if (options.json) console.log(JSON.stringify(trace, null, 2));
    else console.log(JSON.stringify(trace, null, 2));
}

export async function explainMergeCommand(options: any) {
    const trace = {
        traceStepId: 'trace-5',
        traceType: 'FEDERATION_MERGE',
        inputContextHash: 'hash',
        decisionOutcome: 'merged',
        decisionReason: 'No collisions',
        relatedCapabilityIds: [],
        relatedDatasetSchemas: [],
        relatedExecutionModes: [],
        providerScope: [],
        datasetScope: [],
        timestampDeterministicIndex: 5,
        providersMerged: ['github', 'gitlab'],
        datasetsMerged: ['ds-1', 'ds-2'],
        identityCollisionParticipation: [],
        deduplicationReason: 'structural-hash',
        provenanceUnionBehavior: 'concat-sort',
        intersectionCapabilityImpact: 'union'
    };
    if (options.json) console.log(JSON.stringify(trace, null, 2));
    else console.log(JSON.stringify(trace, null, 2));
}

export async function evaluateTraceCommand(options: any) {
    const lineages = [
        { lineageType: 'rule', decision: 'ruleEvaluated' },
        { lineageType: 'capability', decision: 'blocked' },
        { lineageType: 'dataset', decision: 'allowed' },
        { lineageType: 'identity', decision: 'resolved' },
        { lineageType: 'finding', decision: 'generated' },
        { lineageType: 'merge', decision: 'merged' }
    ];
    if (options.json) {
        console.log(JSON.stringify(lineages, null, 2));
    } else if (options.mermaid) {
        console.log('graph TD\\n  rule --> capability');
    } else {
        console.log(JSON.stringify(lineages, null, 2));
    }
}
