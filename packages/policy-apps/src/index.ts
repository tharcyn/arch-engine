export class PolicyAppRuntime {
    static installApp(): string { return 'app-installed'; }
    static runApp(): string { return 'app-running'; }
    static inspectApp(): string { return 'app-inspected'; }
}

export class PolicyAppManifest {}
export class PolicyAppExecutionDescriptor {}
export class PolicyAppCapabilityBinding {}
