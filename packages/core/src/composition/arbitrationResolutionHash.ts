import * as crypto from 'node:crypto';
import { ArbitrationDecisionGraph } from './ArbitrationDecisionGraph.js';
import { stableCanonicalStringify } from '../transport/stableCanonicalStringify.js';
import { LOADER_PROTOCOL_VERSION } from '../transport/types.js';

import { EXECUTION_RUNTIME_CAPABILITIES } from '../execution/executionRuntimeCapabilityDescriptor.js';
import { CONTEXT_RUNTIME_CAPABILITIES } from '../execution/context/contextCapabilityDescriptor.js';

export const ARBITRATION_RESOLUTION_HASH_VERSION = 'v1';

/**
 * Phase 6 Objective 9: Deterministic Arbitration Hash Surface
 */
export function computeArbitrationResolutionHash(decisionGraph: ArbitrationDecisionGraph): string {
  const canonicalString = stableCanonicalStringify(decisionGraph);
  
  const protocolVersion = LOADER_PROTOCOL_VERSION;
  const executionCapsVersion = EXECUTION_RUNTIME_CAPABILITIES.version;
  const contextCapsVersion = CONTEXT_RUNTIME_CAPABILITIES.version;
  
  const saltedCanonicalString = `PROTOCOL:${protocolVersion}|EXEC:${executionCapsVersion}|CTX:${contextCapsVersion}|${canonicalString}`;

  return crypto.createHash('sha256').update(saltedCanonicalString).digest('hex');
}
