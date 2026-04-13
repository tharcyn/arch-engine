import { OverlayHandlerMetadata, SeamOverrideHandler } from '../../../src/topology/seamContracts.js';
import { createSignatureEnvelopeString, computeSignedPayloadDigest } from '../../../src/topology/overlaySignatureEnvelope.js';

/**
 * Test utility to wrap a bare handler function into an OverlayHandlerMetadata envelope.
 * Uses deterministic default identity for test reproducibility.
 *
 * F-6: Generates proper signature envelopes when overlaySignature is not explicitly provided.
 */
export function wrapHandler(
  handler: SeamOverrideHandler,
  overrides?: Partial<Omit<OverlayHandlerMetadata, 'handler'>>
): OverlayHandlerMetadata {
  const sourceId = overrides?.overlaySourceId ?? 'test-source';
  const version = overrides?.overlayVersion ?? '1.0.0';
  const registrySource = overrides?.overlayRegistrySource ?? 'core';

  // Generate a valid signature envelope if not explicitly overridden
  const signature = overrides?.overlaySignature ?? createTestSignatureEnvelope(sourceId, version, registrySource);

  return {
    overlaySourceId: sourceId,
    overlayVersion: version,
    overlaySignature: signature,
    overlayRegistrySource: registrySource,
    handler
  };
}

/**
 * Create a valid test signature envelope for the given handler identity.
 * Uses the matching registry's default key ID.
 */
export function createTestSignatureEnvelope(
  overlaySourceId: string,
  overlayVersion: string,
  registrySource: string = 'core'
): string {
  const keyIdMap: Record<string, string> = {
    'core': 'core-ed25519-pubkey-001',
    'official': 'official-ed25519-pubkey-001',
    'partner': 'partner-ed25519-pubkey-001',
    'external': 'external-ed25519-pubkey-001'
  };
  const keyId = keyIdMap[registrySource] || 'external-ed25519-pubkey-001';
  const digest = computeSignedPayloadDigest(overlaySourceId, overlayVersion);

  return createSignatureEnvelopeString({
    algorithm: 'ed25519',
    keyId,
    signature: `test-sig-${overlaySourceId}-${overlayVersion}`,
    signedPayloadDigest: digest
  });
}
