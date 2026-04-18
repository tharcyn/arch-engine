export class BundleExchangePropagationRuntime {
    static propagateBundles(): string {
        return 'bundles-propagated';
    }

    static resolveBundleExchangeCompatibility(): boolean { return true; }
    static resolveWorkspaceExchangeOverlay(): boolean { return true; }
}
