import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const PLAIN_OBJECT_GRAPH_CONTRACT_VERSION = 'v1';

const FORBIDDEN_TYPES = new Set(['function', 'symbol']);
const FORBIDDEN_CONSTRUCTORS = new Set([Date, Map, Set, WeakMap, WeakSet, RegExp, Promise]);

/**
 * Phase 4.13 Objective 1: Plain-Object Metadata Graph Safety
 *
 * Ensures executionMetadata contains only plain objects, arrays,
 * numbers, strings, booleans, and null. Rejects Date, Map, Set,
 * Function, Symbol, class instances, and prototype-extended objects.
 *
 * Traversal: recursive, deterministic key ordering, frozen-safe.
 */
export function assertPlainObjectGraph(value: any, path: string = 'root'): void {
  if (value === null || value === undefined) return;

  const type = typeof value;

  // Primitives are always safe
  if (type === 'number' || type === 'string' || type === 'boolean') return;

  // Reject forbidden types
  if (FORBIDDEN_TYPES.has(type)) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.LOADER_METADATA_NON_PLAIN_OBJECT_DETECTED,
      message: `Non-plain metadata at "${path}": ${type} detected. ` +
        `Only plain objects, arrays, strings, numbers, booleans, and null are allowed. ` +
        `Contract: ${PLAIN_OBJECT_GRAPH_CONTRACT_VERSION}`,
      stage: 'plainObjectGraphValidation'
    });
  }

  if (type !== 'object') return;

  // Reject known non-plain constructors
  for (const ctor of FORBIDDEN_CONSTRUCTORS) {
    if (value instanceof ctor) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.LOADER_METADATA_NON_PLAIN_OBJECT_DETECTED,
        message: `Non-plain metadata at "${path}": ${ctor.name} instance detected. ` +
          `Only plain objects, arrays, strings, numbers, booleans, and null are allowed. ` +
          `Contract: ${PLAIN_OBJECT_GRAPH_CONTRACT_VERSION}`,
        stage: 'plainObjectGraphValidation'
      });
    }
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      assertPlainObjectGraph(value[i], `${path}[${i}]`);
    }
    return;
  }

  // Reject non-plain-object prototypes (class instances)
  const proto = Object.getPrototypeOf(value);
  if (proto !== null && proto !== Object.prototype) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.LOADER_METADATA_NON_PLAIN_OBJECT_DETECTED,
      message: `Non-plain metadata at "${path}": non-plain prototype detected (class instance). ` +
        `Only plain objects are allowed. Contract: ${PLAIN_OBJECT_GRAPH_CONTRACT_VERSION}`,
      stage: 'plainObjectGraphValidation'
    });
  }

  // Recurse in deterministic key order
  const keys = Object.keys(value).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  for (const key of keys) {
    assertPlainObjectGraph(value[key], `${path}.${key}`);
  }
}
