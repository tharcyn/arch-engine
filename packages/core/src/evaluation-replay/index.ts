export interface EvaluationReplayEnvelope {
    readonly baselineExecutionHash: string;
    readonly candidateExecutionHash: string;
    readonly baselineCapabilityIntersectionHash: string;
    readonly candidateCapabilityIntersectionHash: string;
    readonly baselineDatasetCompatibilityHash: string;
    readonly candidateDatasetCompatibilityHash: string;
    readonly baselineFederationExecutionHash: string;
    readonly candidateFederationExecutionHash: string;
}

export interface ReplayComparisonResult {
    readonly isIdentical: boolean;
    readonly driftClassifications: readonly ReplayDriftClassification[];
}

export interface ReplayDriftClassification {
    readonly driftType: string;
    readonly severity: string;
    readonly description: string;
}

export interface EvaluationReplayContext {
    readonly envelope: EvaluationReplayEnvelope;
    readonly result: ReplayComparisonResult;
}

export class EvaluationReplayRuntime {
    static generateEnvelope(): EvaluationReplayEnvelope {
        return {
            baselineExecutionHash: 'hash-baseline-exec',
            candidateExecutionHash: 'hash-candidate-exec',
            baselineCapabilityIntersectionHash: 'hash-baseline-cap',
            candidateCapabilityIntersectionHash: 'hash-candidate-cap',
            baselineDatasetCompatibilityHash: 'hash-baseline-ds',
            candidateDatasetCompatibilityHash: 'hash-candidate-ds',
            baselineFederationExecutionHash: 'hash-baseline-fed',
            candidateFederationExecutionHash: 'hash-candidate-fed',
        };
    }
}
