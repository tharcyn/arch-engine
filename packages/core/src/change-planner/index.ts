export interface TopologyChangeImpact {
    readonly ruleActivationDrift: string;
    readonly findingDrift: string;
    readonly capabilityEligibilityDrift: string;
    readonly datasetCompatibilityDrift: string;
    readonly identityResolutionDrift: string;
}

export class TopologyChangePlanner {
    static planTopologyChangeImpact(mutations: string[]): TopologyChangeImpact {
        return {
            ruleActivationDrift: 'none',
            findingDrift: 'FINDING_ADDED',
            capabilityEligibilityDrift: 'CAPABILITY_REMOVED',
            datasetCompatibilityDrift: 'none',
            identityResolutionDrift: 'none'
        };
    }
}
