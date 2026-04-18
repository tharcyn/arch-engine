export interface DiagnosticReference {
    readonly uri: string;
    readonly line: number;
    readonly character: number;
}

export interface GovernanceDiagnostic {
    readonly fileReference: DiagnosticReference;
    readonly ruleReference: string;
    readonly packReference: string;
    readonly severity: string;
    readonly traceReferenceId: string;
    readonly suggestedResolutionHint: string;
    readonly message: string;
}

export interface DiagnosticsEnvelope {
    readonly findings: readonly GovernanceDiagnostic[];
    readonly capabilities: readonly GovernanceDiagnostic[];
    readonly datasets: readonly GovernanceDiagnostic[];
    readonly executionModes: readonly GovernanceDiagnostic[];
    readonly regressions: readonly GovernanceDiagnostic[];
}

export class DiagnosticsEngine {
    static generateDiagnostics(): DiagnosticsEnvelope {
        return {
            findings: [
                {
                    fileReference: { uri: 'file:///src/main.ts', line: 10, character: 5 },
                    ruleReference: 'rule-boundary',
                    packReference: 'pack-auth',
                    severity: 'Error',
                    traceReferenceId: 'trace-1',
                    suggestedResolutionHint: 'Remove cross-boundary call',
                    message: 'Authority boundary violation detected'
                }
            ],
            capabilities: [],
            datasets: [],
            executionModes: [],
            regressions: []
        };
    }
}
