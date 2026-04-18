export class DeploymentBlueprintRuntime {
    static listBlueprints(): string { return 'blueprints-listed'; }
    static inspectBlueprint(): string { return 'blueprint-inspected'; }
    static validateBlueprint(): string { return 'blueprint-validated'; }
}

export class BlueprintDescriptor {}
export class BlueprintCompatibilityResolver {}
export class BlueprintValidationRuntime {}
export class BlueprintProvisioningSurface {}
