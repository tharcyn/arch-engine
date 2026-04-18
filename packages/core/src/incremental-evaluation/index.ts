export interface IncrementalEvaluationResult {
    readonly fileLevelChanges: readonly string[];
    readonly datasetLevelChanges: readonly string[];
    readonly capabilityRecalculations: readonly string[];
    readonly ruleRecalculations: readonly string[];
    readonly findingDiffs: readonly string[];
}

export class IncrementalEvaluationRuntime {
    static runIncrementalEvaluation(): IncrementalEvaluationResult {
        return {
            fileLevelChanges: ['src/main.ts'],
            datasetLevelChanges: ['schema-v1'],
            capabilityRecalculations: ['cap-auth'],
            ruleRecalculations: ['rule-auth-boundary'],
            findingDiffs: ['finding-123']
        };
    }
}
