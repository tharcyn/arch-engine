import { EvaluationContextModel } from './EvaluationContextModel.js';

import { stableCanonicalStringify } from '../../transport/stableCanonicalStringify.js';

export const CONTEXT_NORMALIZATION_PIPELINE_VERSION = 'v1';

/**
 * Phase 8 Objective 2: Context Normalization Pipeline
 *
 * Normalizes values deeply within the context structure. Ensures stable ordering,
 * stripping of undefined, canonicalization of numbers and string encodings.
 */
export class ContextNormalizationPipeline {
  constructor(private context: EvaluationContextModel) {}

  public normalize(): EvaluationContextModel {
    return this.deepNormalize(this.context) as EvaluationContextModel;
  }

  private deepNormalize(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      if (typeof obj === 'number') {
        // Canonicalize -0 to 0 natively
        return obj === 0 ? 0 : obj;
      }
      if (typeof obj === 'string') {
        // Use standard unicode normalization for deterministic equality
        return obj.normalize('NFC');
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      // Create new array, filtering undefined, normalizing elements
      const normalizedArray = obj
        .filter(item => item !== undefined)
        .map(item => this.deepNormalize(item));
        
      // Stable sort logic strictly for Arrays where primitive deterministic equivalence matters
      // Context arrays are explicitly forced to stable sort for cross-engine map equality.
      // E.g. [2, 1] -> [1, 2].
      normalizedArray.sort((a, b) => {
        const sa = typeof a === 'string' ? a : stableCanonicalStringify(a);
        const sb = typeof b === 'string' ? b : stableCanonicalStringify(b);
        return sa < sb ? -1 : sa > sb ? 1 : 0;
      });
      
      return normalizedArray;
    }

    // Is Object
    const normalizedObj: any = {};
    const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

    for (const key of keys) {
      normalizedObj[key] = this.deepNormalize(obj[key]);
    }

    return normalizedObj;
  }
}
