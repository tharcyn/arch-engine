export interface AnnotationEnvelope {
    readonly executionHash: string;
    readonly federationExecutionHash: string;
    readonly capabilityIntersectionHash: string;
    readonly datasetCompatibilityHash: string;
    readonly lockfileCompatibilityStatus: string;
    readonly bundleCompatibilityStatus: string;
}

export interface AnnotationSummary {
    readonly envelope: AnnotationEnvelope;
    readonly status: string;
    readonly totalFindings: number;
}

export interface FindingAnnotation {
    readonly findingId: string;
    readonly originatingRule: string;
    readonly originatingPack: string;
    readonly severity: string;
    readonly providerProvenance: readonly string[];
    readonly datasetProvenance: readonly string[];
    readonly capabilityUsed: string;
    readonly executionModeUsed: string;
    readonly traceReferenceId: string;
}

export interface RegressionAnnotation {
    readonly driftType: string;
    readonly driftDescription: string;
}

export interface CapabilityAnnotation {
    readonly missingCapability: string;
    readonly blockingProvider: string;
    readonly blockingDatasetSchema: string;
    readonly blockingExecutionMode: string;
}

export interface DatasetAnnotation {
    readonly mismatchReason: string;
}

export interface IdentityAnnotation {
    readonly collisionReason: string;
}

export interface MergeAnnotation {
    readonly provider: string;
}

export class AnnotationRenderer {
    static renderFindingAnnotation(finding: FindingAnnotation): string {
        return `Finding [\${finding.findingId}]: \${finding.severity} from \${finding.originatingRule} in \${finding.originatingPack} (\${finding.capabilityUsed})`;
    }

    static renderRegressionAnnotation(regression: RegressionAnnotation): string {
        return `⚠️ Governance regression detected:\
\${regression.driftDescription}`;
    }

    static renderCapabilityAnnotation(capability: CapabilityAnnotation): string {
        return `Blocked by missing capability: \${capability.missingCapability} (Provider: \${capability.blockingProvider}, Dataset: \${capability.blockingDatasetSchema})`;
    }
}
