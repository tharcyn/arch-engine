import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const DEEP_FREEZE_CONTRACT_VERSION = 'v1';

/**
 * Phase 4.12 Objective 1: Deterministic Deep Freeze
 *
 * Recursively freezes plain objects and arrays in deterministic traversal order.
 * Rejects functions, symbols, and class instances inside metadata structures.
 *
 * Safely handles: already-frozen objects, null, undefined, primitives.
 * Throws LOADER_METADATA_IMMUTABILITY_VIOLATION on unsupported mutable structures.
 */
export function deepFreezeDeterministic(value: any, path: string = 'root'): void {
  if (value === null || value === undefined) return;
  if (typeof value !== 'object') return;
  if (Object.isFrozen(value)) return;

  // Reject functions
  if (typeof value === 'function') {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.LOADER_METADATA_IMMUTABILITY_VIOLATION,
      message: `Unsupported mutable structure at "${path}": function found in metadata. ` +
        `Contract: ${DEEP_FREEZE_CONTRACT_VERSION}`,
      stage: 'deepMetadataFreeze'
    });
  }

  // Validate keys for unsupported types before freezing
  if (!Array.isArray(value)) {
    const keys = Object.keys(value).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    for (const key of keys) {
      const child = value[key];
      const childPath = `${path}.${key}`;

      if (typeof child === 'function') {
        throw new PolicyRuntimeError({
          code: PolicyRuntimeErrorCode.LOADER_METADATA_IMMUTABILITY_VIOLATION,
          message: `Unsupported mutable structure at "${childPath}": function found in metadata. ` +
            `Contract: ${DEEP_FREEZE_CONTRACT_VERSION}`,
          stage: 'deepMetadataFreeze'
        });
      }

      if (typeof child === 'symbol') {
        throw new PolicyRuntimeError({
          code: PolicyRuntimeErrorCode.LOADER_METADATA_IMMUTABILITY_VIOLATION,
          message: `Unsupported mutable structure at "${childPath}": symbol found in metadata. ` +
            `Contract: ${DEEP_FREEZE_CONTRACT_VERSION}`,
          stage: 'deepMetadataFreeze'
        });
      }

      // Reject class instances (non-plain objects)
      if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
        const proto = Object.getPrototypeOf(child);
        if (proto !== null && proto !== Object.prototype) {
          throw new PolicyRuntimeError({
            code: PolicyRuntimeErrorCode.LOADER_METADATA_IMMUTABILITY_VIOLATION,
            message: `Unsupported mutable structure at "${childPath}": class instance found in metadata. ` +
              `Contract: ${DEEP_FREEZE_CONTRACT_VERSION}`,
            stage: 'deepMetadataFreeze'
          });
        }
      }

      // Recurse
      deepFreezeDeterministic(child, childPath);
    }
  } else {
    // Array: recurse over elements
    for (let i = 0; i < value.length; i++) {
      const child = value[i];
      const childPath = `${path}[${i}]`;

      if (typeof child === 'function') {
        throw new PolicyRuntimeError({
          code: PolicyRuntimeErrorCode.LOADER_METADATA_IMMUTABILITY_VIOLATION,
          message: `Unsupported mutable structure at "${childPath}": function found in metadata. ` +
            `Contract: ${DEEP_FREEZE_CONTRACT_VERSION}`,
          stage: 'deepMetadataFreeze'
        });
      }

      deepFreezeDeterministic(child, childPath);
    }
  }

  Object.freeze(value);
}

/**
 * Verify that a value and all nested structures are deeply frozen.
 */
export function isDeeplyFrozen(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== 'object') return true;
  if (!Object.isFrozen(value)) return false;

  if (Array.isArray(value)) {
    return value.every(item => isDeeplyFrozen(item));
  }

  return Object.keys(value).every(key => isDeeplyFrozen(value[key]));
}
