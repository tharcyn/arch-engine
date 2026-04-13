import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';
import { HydratedPolicyManifest } from './types.js';

export const MANIFEST_CAPABILITY_VALIDATION_VERSION = 'v1';

export enum CapabilityNegotiationMode {
  STRICT = 'STRICT',
  WARN = 'WARN',
  FALLBACK = 'FALLBACK',
  SIMULATE = 'SIMULATE'
}

export interface LoaderRuntimeCapabilities {
  engineVersion: string;
  supportedLayers: string[];
  supportedDomains: string[];
  providedCapabilities?: string[];
  negotiationMode?: CapabilityNegotiationMode;
}

export function validateManifestCapabilities(
  manifest: HydratedPolicyManifest,
  namespace: string,
  policyId: string,
  runtimeConfig: LoaderRuntimeCapabilities,
  stackEntry?: any // Allowing passing entry to attach warnings
): {
  missingCapabilities: string[];
  incompatibleLayers: string[];
  incompatibleDomains: string[];
} {
  const meta = manifest.manifestMetadata || {};
  const {
    engineVersion,
    policyLayer,
    domain,
    requiredCapabilities = [],
    fallbackCapabilities = []
  } = meta;

  const mode = runtimeConfig.negotiationMode || CapabilityNegotiationMode.STRICT;

  const missingCaps: string[] = [];
  const provided = runtimeConfig.providedCapabilities || [];

  if (requiredCapabilities.length > 0) {
    for (const req of requiredCapabilities) {
      if (!provided.includes(req)) {
        missingCaps.push(req);
      }
    }
  }

  const isEngineIncompatible = engineVersion && runtimeConfig.engineVersion && (engineVersion > runtimeConfig.engineVersion);
  const incompatibleLayers = (policyLayer && !runtimeConfig.supportedLayers.includes(policyLayer)) ? [policyLayer] : [];
  const incompatibleDomains = (domain && !runtimeConfig.supportedDomains.includes(domain)) ? [domain] : [];

  const hasIncompatibilities = isEngineIncompatible || incompatibleLayers.length > 0 || incompatibleDomains.length > 0 || missingCaps.length > 0;

  const result = {
    missingCapabilities: missingCaps,
    incompatibleLayers,
    incompatibleDomains
  };

  if (hasIncompatibilities) {
    if (mode === CapabilityNegotiationMode.SIMULATE) {
      if (stackEntry) {
        stackEntry.simulatedCapabilityCompatibility = result;
      }
      return result;
    }

    if (mode === CapabilityNegotiationMode.WARN) {
      if (stackEntry) {
        if (!stackEntry.negotiationWarnings) stackEntry.negotiationWarnings = [];
        stackEntry.negotiationWarnings.push({
          code: 'CAPABILITY_NEGOTIATION_WARNING',
          missingCapabilities: missingCaps,
          policyId
        });
      }
      return result;
    }

    if (mode === CapabilityNegotiationMode.FALLBACK) {
      // Phase 4.8 Fix: Fallback must cover ALL missing capabilities, not just any single match.
      // Each missing required capability must have a corresponding fallback that IS provided.
      const fallbackCoversAll = missingCaps.length > 0 && missingCaps.every((mc: string) => {
        return fallbackCapabilities.some((fc: string) => provided.includes(fc) && fc === mc) ||
               fallbackCapabilities.some((fc: string) => provided.includes(fc));
      });
      // Stricter: every missing cap must have a provided fallback that substitutes for it.
      // Since we don't have a substitution map, require that the fallback set fully covers
      // the missing set size-wise AND all fallbacks are provided.
      const allFallbacksProvided = fallbackCapabilities.length >= missingCaps.length &&
        fallbackCapabilities.filter((fc: string) => provided.includes(fc)).length >= missingCaps.length;
      if (allFallbacksProvided && fallbackCapabilities.length > 0) {
        if (stackEntry) {
          if (!stackEntry.executionMetadata) stackEntry.executionMetadata = {};
          stackEntry.executionMetadata.capabilityFallbackApplied = true;
        }
        return result;
      }
    }

    // STRICT or FALLBACK failed
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.MANIFEST_CAPABILITY_INCOMPATIBLE,
      message: 'Manifest capability incompatible with loader runtime',
      stage: 'manifestHydration',
      contractVersion: MANIFEST_CAPABILITY_VALIDATION_VERSION,
      policyId,
      policyNamespace: namespace,
      missingCapabilities: missingCaps,
      requiredEngineVersion: engineVersion,
      runtimeEngineVersion: runtimeConfig.engineVersion,
      negotiationMode: mode,
      fallbackApplied: false,
      loaderStageMetadata: {
        contractVersion: MANIFEST_CAPABILITY_VALIDATION_VERSION,
        namespace,
        validationStage: 'validateManifestCapabilities'
      }
    });
  }

  return result;
}
