export type RegistrySourceType = 'local' | 'filesystem-mirror' | 'remote-catalog' | 'offline-snapshot';

export type RegistryTrustLevel = 'verified-internal' | 'verified-ecosystem' | 'unverified';

export interface RegistrySourceDescriptor {
    readonly registrySourceId: string;
    readonly registrySourceType: RegistrySourceType;
    readonly registrySourcePriority: number; // Ascending order
    readonly registryTrustLevel: RegistryTrustLevel;
    readonly catalogLocation: string;
    readonly catalogFormatVersion: string;
    readonly signatureRequirement: 'required' | 'optional' | 'none';
}
