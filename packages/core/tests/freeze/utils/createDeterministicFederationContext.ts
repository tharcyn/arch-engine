export function createDeterministicFederationContext(overrides: Record<string, any> = {}) {
    return {
        namespace: 'default-federation',
        mirrors: [],
        hasLockfile: false,
        lockfileVersion: null,
        schemaAnchor: 'current',
        trustFlags: {
            allowUnsigned: false,
            allowMismatchedNamespace: false
        },
        ...overrides
    };
}
