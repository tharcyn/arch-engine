import * as crypto from 'node:crypto';
import { EvaluationContextModel } from './EvaluationContextModel.js';
import { stableCanonicalStringify } from '../../transport/stableCanonicalStringify.js';
import { LOADER_PROTOCOL_VERSION } from '../../transport/types.js';

import { EXECUTION_RUNTIME_CAPABILITIES } from '../executionRuntimeCapabilityDescriptor.js';
import { CONTEXT_RUNTIME_CAPABILITIES } from './contextCapabilityDescriptor.js';

export const CONTEXT_RESOLUTION_HASH_VERSION = 'v1';

/**
 * Phase 8 Objective 8: Context Resolution Hash
 */
export function computeContextResolutionHash(normalizedContext: EvaluationContextModel): string {
  const canonicalString = stableCanonicalStringify(normalizedContext);
  
  const protocolVersion = LOADER_PROTOCOL_VERSION;
  const executionCapsVersion = EXECUTION_RUNTIME_CAPABILITIES.version;
  const contextCapsVersion = CONTEXT_RUNTIME_CAPABILITIES.version;
  
  const saltedCanonicalString = `PROTOCOL:${protocolVersion}|EXEC:${executionCapsVersion}|CTX:${contextCapsVersion}|${canonicalString}`;

  return crypto.createHash('sha256').update(saltedCanonicalString).digest('hex');
}
