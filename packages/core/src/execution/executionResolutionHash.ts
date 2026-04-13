import * as crypto from 'node:crypto';
import { ExecutionResultSurface } from './ResultAggregationResolver.js';
import { stableCanonicalStringify } from '../transport/stableCanonicalStringify.js';
import { LOADER_PROTOCOL_VERSION } from '../transport/types.js';

import { EXECUTION_RUNTIME_CAPABILITIES } from './executionRuntimeCapabilityDescriptor.js';
import { CONTEXT_RUNTIME_CAPABILITIES } from './context/contextCapabilityDescriptor.js';

export const EXECUTION_RESOLUTION_HASH_VERSION = 'v1';

/**
 * Phase 7 Objective 8: Execution Resolution Hash
 */
export function computeExecutionResolutionHash(executionResultSurface: ExecutionResultSurface): string {
  const cleanSurface = { ...executionResultSurface };
  
  if ('executionResolutionHash' in cleanSurface as any) {
    delete (cleanSurface as any).executionResolutionHash;
  }
  
  const canonicalString = stableCanonicalStringify(cleanSurface);
  
  // Phase 8.5 FIX 4: Salt diagnostic hashes with protocol and capability matrix versions
  const protocolVersion = LOADER_PROTOCOL_VERSION;
  const executionCapsVersion = EXECUTION_RUNTIME_CAPABILITIES.version;
  const contextCapsVersion = CONTEXT_RUNTIME_CAPABILITIES.version;
  
  const saltedCanonicalString = `PROTOCOL:${protocolVersion}|EXEC:${executionCapsVersion}|CTX:${contextCapsVersion}|${canonicalString}`;

  return crypto.createHash('sha256').update(saltedCanonicalString).digest('hex');
}
