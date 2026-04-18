export class PremiumCapabilityGateRuntime {
    static checkAccess(): string { return 'feature-access-checked'; }
}

export class FeatureAccessResolver {}
export class DeploymentModeGateResolver {}
export class EnterpriseOnlyCapabilityValidator {}
