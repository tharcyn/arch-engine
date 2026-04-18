import { runDatasetIngestionPipeline } from '../topology/DatasetIngestionPipeline.js';
import type { ValidatedTopologyDataset } from '../topology/external-topology-types.js';
import { extractLockfileDatasetIdentity } from '../policy/extractLockfileDatasetIdentity.js';
import { createHash } from 'crypto';

export interface ProviderDatasetInput {
    readonly providerId: string;
    readonly datasetPath: string;
}

export interface FederatedTopologyDatasetEnvelope {
    readonly datasets: readonly ValidatedTopologyDataset[];
    readonly datasetIdentityHashes: readonly string[];
    readonly datasetCapabilityIntersection: Readonly<Record<string, boolean>>;
    readonly datasetCapabilityUnion: Readonly<Record<string, boolean>>;
    readonly providerDatasetMap: Readonly<Record<string, ValidatedTopologyDataset>>;
}

function stableStringify(obj: any): string {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const k of keys) {
    if (obj[k] !== undefined) {
      parts.push(`${k}:${stableStringify(obj[k])}`);
    }
  }
  return `{${parts.join(',')}}`;
}

export function loadFederatedTopologyDatasets(inputs: readonly ProviderDatasetInput[]): FederatedTopologyDatasetEnvelope {
    const sortedInputs = [...inputs].sort((a, b) => a.providerId.localeCompare(b.providerId));
    
    const datasets: ValidatedTopologyDataset[] = [];
    const datasetIdentityHashes: string[] = [];
    const providerDatasetMap: Record<string, ValidatedTopologyDataset> = {};
    const datasetCapabilityIntersection: Record<string, boolean> = {};
    const datasetCapabilityUnion: Record<string, boolean> = {};
    let isFirst = true;
    
    // Check for collisions
    const seenIdentities = new Set<string>();

    for (const input of sortedInputs) {
        if (providerDatasetMap[input.providerId]) {
            throw new Error(`Duplicate provider identity detected: ${input.providerId}`);
        }

        const validatedDataset = runDatasetIngestionPipeline(input.datasetPath);
        
        const extracted = extractLockfileDatasetIdentity(validatedDataset as any);
        const identityHash = createHash('sha256').update(stableStringify(extracted.identity)).digest('hex');
        
        if (seenIdentities.has(identityHash)) {
            throw new Error(`Dataset identity collision detected for provider ${input.providerId}`);
        }
        seenIdentities.add(identityHash);
        
        datasets.push(validatedDataset);
        datasetIdentityHashes.push(identityHash);
        providerDatasetMap[input.providerId] = validatedDataset;

        const manifest = extracted.capabilityManifest || {};
        
        if (isFirst) {
            for (const key of Object.keys(manifest)) {
                datasetCapabilityIntersection[key] = manifest[key];
                datasetCapabilityUnion[key] = manifest[key];
            }
            isFirst = false;
        } else {
            for (const key of Object.keys(datasetCapabilityIntersection)) {
                if (manifest[key] !== datasetCapabilityIntersection[key]) {
                    delete datasetCapabilityIntersection[key];
                }
            }
            for (const key of Object.keys(manifest)) {
                if (manifest[key] === true) {
                    datasetCapabilityUnion[key] = true;
                }
            }
        }
    }
    
    return {
        datasets,
        datasetIdentityHashes,
        datasetCapabilityIntersection,
        datasetCapabilityUnion,
        providerDatasetMap
    };
}
