import * as crypto from 'node:crypto';
import { EvaluationContextModel } from './EvaluationContextModel.js';
import { stableCanonicalStringify } from '../../transport/stableCanonicalStringify.js';

export const EXECUTION_CONTEXT_SERIALIZER_VERSION = 'v1';

export interface SerializedEvaluationContext {
  serializedEvaluationContext: string;
  executionContextHash: string;
}

/**
 * Phase 8 Objective 3: Execution Context Serializer
 *
 * Flattens the dynamically validated execution environment variables into a universally
 * transportable canonical serialized string and produces a deterministic hash boundary string.
 */
export class ExecutionContextSerializer {
  constructor(private context: EvaluationContextModel) {}

  public serialize(): SerializedEvaluationContext {
    // Stringify utilizing phase 4 locked topological hash standards
    const serializedEvaluationContext = stableCanonicalStringify(this.context);
    
    // Hash context structurally avoiding mutability of original identity domains
    const executionContextHash = crypto
      .createHash('sha256')
      .update(serializedEvaluationContext)
      .digest('hex');

    return {
      serializedEvaluationContext,
      executionContextHash
    };
  }
}
