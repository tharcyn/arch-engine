import * as crypto from 'node:crypto';
import { stableCanonicalStringify } from './stableCanonicalStringify.js';
import { LOADER_PROTOCOL_CAPABILITIES } from './loaderProtocolCapabilityDescriptor.js';
import { COMPOSITION_RUNTIME_CAPABILITIES } from '../composition/compositionRuntimeCapabilityDescriptor.js';
import { EXECUTION_RUNTIME_CAPABILITIES } from '../execution/executionRuntimeCapabilityDescriptor.js';
import { CONTEXT_RUNTIME_CAPABILITIES } from '../execution/context/contextCapabilityDescriptor.js';
import { LOADER_PROTOCOL_VERSION } from './types.js';
import { CAPABILITY_FEDERATION_DESCRIPTOR } from '../capability/capabilityFederationTypes.js';

import { deepFreezeDeterministic } from './deepFreezeDeterministic.js';

export const CAPABILITY_DESCRIPTOR_MATRIX_HASH_VERSION = 'v1';

/**
 * Phase 8.9 C-2 FIX: capabilityDescriptorConfig is frozen at declaration
 * to prevent adapter-side mutation of canonicalization version.
 */
export const capabilityDescriptorConfig = Object.freeze({
  capabilityMatrixCanonicalizationVersion: 'v1'
});

/**
 * Phase 8.6 Objective 1 / Phase 8.7 Update / Phase 8.8: Capability Descriptor Matrix Hash
 *
 * Computes a deterministic hash over the ACTIVE capability descriptors
 * that influence execution semantics. This is diagnostic-only and MUST NOT
 * become an identity surface.
 */
export function computeCapabilityDescriptorMatrixHash(): string {
  // Normalize descriptor ordering to prevent payload construction noise
  const matrix = {
    loaderProtocolCapabilityDescriptor: LOADER_PROTOCOL_CAPABILITIES,
    compositionRuntimeCapabilityDescriptor: COMPOSITION_RUNTIME_CAPABILITIES,
    executionRuntimeCapabilityDescriptor: EXECUTION_RUNTIME_CAPABILITIES,
    contextRuntimeCapabilityDescriptor: CONTEXT_RUNTIME_CAPABILITIES,
  };

  deepFreezeDeterministic(matrix, 'capabilityMatrixPayload');

  const canonicalPayload = stableCanonicalStringify(matrix);
  
  const protocolVersion = LOADER_PROTOCOL_VERSION;
  
  // Normalize descriptor version ordering identically
  const versions = [
    LOADER_PROTOCOL_CAPABILITIES.version,
    COMPOSITION_RUNTIME_CAPABILITIES.version,
    EXECUTION_RUNTIME_CAPABILITIES.version,
    CONTEXT_RUNTIME_CAPABILITIES.version,
    CAPABILITY_FEDERATION_DESCRIPTOR.version
  ].join('|');

  const payload = `PROTOCOL_VERSION:${protocolVersion}|CANONICALIZATION_VERSION:${capabilityDescriptorConfig.capabilityMatrixCanonicalizationVersion}|VERSIONS:${versions}|PAYLOAD:${canonicalPayload}`;

  return crypto.createHash('sha256').update(payload).digest('hex');
}
