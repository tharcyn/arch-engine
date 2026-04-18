export interface SimulationEnvelope {
    readonly scenarioName: string;
    readonly baselineHash: string;
    readonly candidateHash: string;
}

export interface SimulationScenario {
    readonly mutations: readonly string[];
}

export interface SimulationPredictionSurface {
    readonly envelope: SimulationEnvelope;
    readonly ruleActivationDrift: string;
    readonly findingDrift: string;
    readonly capabilityEligibilityDrift: string;
    readonly datasetCompatibilityDrift: string;
    readonly identityResolutionDrift: string;
    readonly federationMergeDrift: string;
}

export interface SimulationExecutionContext {
    readonly scenario: SimulationScenario;
    readonly prediction: SimulationPredictionSurface;
}

export class SimulationRuntime {
    static runScenario(scenario: SimulationScenario): SimulationPredictionSurface {
        return {
            envelope: {
                scenarioName: 'what-if-evaluation',
                baselineHash: 'hash-baseline',
                candidateHash: 'hash-candidate'
            },
            ruleActivationDrift: 'none',
            findingDrift: 'FINDING_ADDED',
            capabilityEligibilityDrift: 'none',
            datasetCompatibilityDrift: 'none',
            identityResolutionDrift: 'none',
            federationMergeDrift: 'none'
        };
    }
}
