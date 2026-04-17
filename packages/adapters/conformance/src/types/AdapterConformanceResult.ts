export interface AdapterConformanceResult {
    readonly adapterName: string;
    readonly repositoryVerificationPassed: boolean;
    readonly schemaCompatibilityPassed: boolean;
    readonly branchNamingInvariantPassed: boolean;
    readonly duplicatePullRequestSuppressionPassed: boolean;
    readonly adapterOutcomeNormalizationPassed: boolean;
    readonly executionTelemetryShapePassed: boolean;
}
