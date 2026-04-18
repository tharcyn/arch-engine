import { createHash } from 'crypto';

export function computeFederationExecutionHash(
    datasetIdentityHashes: readonly string[],
    capabilityIntersection: readonly string[],
    executionMode: string = 'federated'
): string {
    const sortedHashes = [...datasetIdentityHashes].sort();
    const sortedCapabilities = [...capabilityIntersection].sort();
    
    const payload = [
        executionMode,
        `datasets:${sortedHashes.join(',')}`,
        `capabilities:${sortedCapabilities.join(',')}`
    ].join('|');
    
    return createHash('sha256').update(payload).digest('hex');
}
