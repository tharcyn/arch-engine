import * as crypto from 'node:crypto';
import type { ValidatedTopologyDataset } from '../topology/external-topology-types.js';
import type { PolicyPackManifest } from './PolicyPackManifest.js';
import type { FederationFindingInspectionReport } from './inspectFederationEvaluationFindings.js';

export function computeEvaluationContextFingerprint(
    dataset: ValidatedTopologyDataset,
    packs: readonly PolicyPackManifest[],
    inspection: FederationFindingInspectionReport
): string {
    const hash = crypto.createHash('sha256');

    // 1. Topology snapshot identity
    const topologyId = dataset.dataset?.topology_dataset_identity || {};
    hash.update(JSON.stringify(topologyId));

    // 2. Policy pack fingerprint
    const packFingerprints = packs.map(p => `${p.policyPackId}@${p.signature || 'unsigned'}`).sort();
    hash.update(JSON.stringify(packFingerprints));

    // 3. Finding-set fingerprint
    const findingsIds = Object.entries(inspection.countsByCode)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([code, count]) => `${code}:${count}`);
    hash.update(JSON.stringify(findingsIds));

    return hash.digest('hex');
}
