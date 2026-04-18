import { AnnotationRenderer } from '../../annotation/index.js';

export async function annotateGithubCommand(options: any) {
    const payload = {
        platform: 'github',
        summary: 'GitHub PR Summary',
        findings: [
            AnnotationRenderer.renderFindingAnnotation({
                findingId: 'F-1',
                originatingRule: 'rule-A',
                originatingPack: 'pack-A',
                severity: 'HIGH',
                providerProvenance: ['github'],
                datasetProvenance: ['schema-v1'],
                capabilityUsed: 'cap-x',
                executionModeUsed: 'multi-provider-federated',
                traceReferenceId: 'trace-1'
            })
        ],
        regressions: [
            AnnotationRenderer.renderRegressionAnnotation({
                driftType: 'FINDING_SEVERITY_CHANGED',
                driftDescription: 'Finding severity changed: HIGH → CRITICAL'
            })
        ],
        capabilities: [
            AnnotationRenderer.renderCapabilityAnnotation({
                missingCapability: 'cap-y',
                blockingProvider: 'github',
                blockingDatasetSchema: 'schema-v1',
                blockingExecutionMode: 'single-provider'
            })
        ],
        datasets: [],
        identities: [],
        merges: []
    };

    if (options.json) {
        console.log(JSON.stringify(payload, null, 2));
    } else {
        console.log(JSON.stringify(payload, null, 2));
    }
}

export async function annotateGitlabCommand(options: any) {
    const payload = {
        platform: 'gitlab',
        summary: 'GitLab MR Summary',
        findings: [
            AnnotationRenderer.renderFindingAnnotation({
                findingId: 'F-2',
                originatingRule: 'rule-B',
                originatingPack: 'pack-B',
                severity: 'MEDIUM',
                providerProvenance: ['gitlab'],
                datasetProvenance: ['schema-v1'],
                capabilityUsed: 'cap-z',
                executionModeUsed: 'multi-provider-federated',
                traceReferenceId: 'trace-2'
            })
        ],
        regressions: [],
        capabilities: [],
        datasets: [],
        identities: [],
        merges: []
    };

    if (options.json) {
        console.log(JSON.stringify(payload, null, 2));
    } else {
        console.log(JSON.stringify(payload, null, 2));
    }
}
