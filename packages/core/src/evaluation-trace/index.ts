export interface EvaluationTraceStep {
    readonly traceStepId: string;
    readonly traceType: string;
    readonly inputContextHash: string;
    readonly decisionOutcome: string;
    readonly decisionReason: string;
    readonly relatedCapabilityIds: readonly string[];
    readonly relatedDatasetSchemas: readonly string[];
    readonly relatedExecutionModes: readonly string[];
    readonly providerScope: readonly string[];
    readonly datasetScope: readonly string[];
    readonly timestampDeterministicIndex: number;
}

export interface RuleActivationTrace extends EvaluationTraceStep {
    readonly traceType: 'RULE_ACTIVATION';
    readonly ruleId: string;
    readonly packId: string;
    readonly activationDecision: 'ruleEvaluated' | 'ruleSkipped' | 'ruleBlocked' | 'ruleSuppressed';
    readonly capabilityIntersectionStatus: string;
    readonly datasetEligibilityStatus: string;
    readonly executionModeEligibilityStatus: string;
}

export interface CapabilityGatingTrace extends EvaluationTraceStep {
    readonly traceType: 'CAPABILITY_GATING';
    readonly requestedCapability: string;
    readonly availableCapabilities: readonly string[];
    readonly intersectionResult: string;
    readonly missingCapabilities: readonly string[];
    readonly blockingProviders: readonly string[];
    readonly blockingDatasets: readonly string[];
    readonly blockingExecutionModes: readonly string[];
}

export interface DatasetEligibilityTrace extends EvaluationTraceStep {
    readonly traceType: 'DATASET_ELIGIBILITY';
    readonly requiredDatasetSchemas: readonly string[];
    readonly availableDatasetSchemas: readonly string[];
    readonly schemaIntersectionResult: string;
    readonly schemaMismatchReasons: readonly string[];
    readonly federationCompatibilityImpact: string;
}

export interface IdentityResolutionTrace extends EvaluationTraceStep {
    readonly traceType: 'IDENTITY_RESOLUTION';
    readonly nodeId: string;
    readonly collisionCategory: 'EXACT_DATASET_REPLAY' | 'CROSS_PROVIDER_IDENTITY_ALIAS' | 'DUPLICATE_PROVIDER_DATASET' | 'UNRESOLVABLE_IDENTITY_COLLISION';
    readonly providerPrecedenceNeutrality: boolean;
    readonly mergeJustification: string;
}

export interface FederationIntersectionTrace extends EvaluationTraceStep {
    readonly traceType: 'FEDERATION_MERGE';
    readonly providersMerged: readonly string[];
    readonly datasetsMerged: readonly string[];
    readonly identityCollisionParticipation: readonly string[];
    readonly deduplicationReason: string;
    readonly provenanceUnionBehavior: string;
    readonly intersectionCapabilityImpact: string;
}

export interface FindingGenerationTrace extends EvaluationTraceStep {
    readonly traceType: 'FINDING_GENERATION';
    readonly originatingRule: string;
    readonly originatingPack: string;
    readonly capabilityUsed: string;
    readonly datasetUsed: string;
    readonly executionModeUsed: string;
    readonly providerProvenance: readonly string[];
    readonly datasetProvenance: readonly string[];
    readonly federationMergeParticipation: readonly string[];
    readonly suppressionStatus: string;
    readonly deduplicationParticipation: readonly string[];
}

export interface EvaluationTraceEnvelope {
    readonly traces: readonly EvaluationTraceStep[];
    readonly traceHash: string;
}

export class EvaluationTraceEngine {
    private traces: EvaluationTraceStep[] = [];
    private currentIndex = 0;

    addTrace(trace: Omit<EvaluationTraceStep, 'traceStepId' | 'timestampDeterministicIndex'>) {
        this.currentIndex++;
        this.traces.push({
            ...trace,
            traceStepId: `trace-${this.currentIndex}`,
            timestampDeterministicIndex: this.currentIndex
        });
    }

    getTraces(): readonly EvaluationTraceStep[] {
        return this.traces;
    }
}
