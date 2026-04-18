export class PolicySubscriptionRuntime {
    static subscribeToPublisher(): string { return 'subscribed-publisher'; }
    static subscribeToRegistry(): string { return 'subscribed-registry'; }
    static subscribeToBundleChannel(): string { return 'subscribed-bundle-channel'; }
    static subscribe(): string { return 'subscribed'; }
}

export class BundleSubscriptionResolver {}
export class RegistrySubscriptionResolver {}
export class WorkspacePolicyOverlaySubscriber {}
