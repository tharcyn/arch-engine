export const URI_RESOLUTION_CONTRACT_VERSION = 'v1';

export interface PolicyURI {
  namespace: string;
  id: string;
  version?: string;
  range?: string;
}

/**
 * Normalization Rules (v1):
 * - namespace preserved exactly
 * - id preserved exactly
 * - version preserved exactly
 * - range preserved exactly
 * - no implicit lowercase transforms
 * - no trimming transforms
 * - no sorting transforms
 */
export function normalizeURI(uri: string): PolicyURI {
  // Expected grammar: policy://namespace/id[@version|@range]
  if (!uri.startsWith('policy://')) {
    throw new Error('Invalid URI scheme');
  }

  const withoutScheme = uri.slice('policy://'.length);
  const parts = withoutScheme.split('/');
  
  if (parts.length !== 2) {
    throw new Error('URI must follow policy://namespace/id pattern');
  }

  const namespace = parts[0];
  const tail = parts[1];
  
  // No transforms! Lossless extraction.
  let id = tail;
  let version: string | undefined;
  let range: string | undefined;

  const atIndex = tail.indexOf('@');
  if (atIndex !== -1) {
    id = tail.slice(0, atIndex);
    const identifier = tail.slice(atIndex + 1);
    
    // Simple heuristic for versions vs ranges for contract determinism
    // If it contains operators like ^ ~ > < it is a range.
    if (/[\^\~\>\<\=\s]/.test(identifier) || identifier.includes('.x') || identifier.includes('*')) {
      range = identifier;
    } else {
      // Direct hard version
      version = identifier;
    }
  }

  return { namespace, id, version, range };
}

export function serializeURI(uriArg: PolicyURI): string {
  let u = `policy://${uriArg.namespace}/${uriArg.id}`;
  if (uriArg.version) {
    u += `@${uriArg.version}`;
  } else if (uriArg.range) {
    u += `@${uriArg.range}`;
  }
  return u;
}
