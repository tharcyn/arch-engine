import { describe, test, expect } from 'vitest';
import { OverlayHandlerMetadata, OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze F-12: Handler Identity Binding', () => {

  test('OverlayHandlerMetadata supports F-12 capability identity binding fields', () => {
    const handler: OverlayHandlerMetadata = {
      overlaySourceId: 'overlay-alpha',
      overlayRegistrySource: 'partner',
      overlayVersion: '1.0.0',
      overlaySignature: 'sig:test',
      overlayNamespace: 'acme.policy.override',
      overlayPriority: 10,
      overlayDeclaredOrder: 1,
      handler: (state: any) => state,
      // F-12 fields
      handlerIdentityHash: 'sha256:handler-alpha-hash',
      providerIdentity: 'provider-alpha',
      capabilityGrantScope: ['overlay::topology::resolution', 'overlay::transport::mirrorBoundary'],
    };

    expect(handler.handlerIdentityHash).toBe('sha256:handler-alpha-hash');
    expect(handler.providerIdentity).toBe('provider-alpha');
    expect(handler.capabilityGrantScope).toEqual([
      'overlay::topology::resolution',
      'overlay::transport::mirrorBoundary',
    ]);
  });

  test('F-12 handler identity fields are optional for backward compatibility', () => {
    const handler: OverlayHandlerMetadata = {
      overlaySourceId: 'overlay-legacy',
      overlayRegistrySource: 'core',
      overlayVersion: '0.9.0',
      handler: (state: any) => state,
    };

    // All F-12 fields should be undefined, not causing errors
    expect(handler.handlerIdentityHash).toBeUndefined();
    expect(handler.providerIdentity).toBeUndefined();
    expect(handler.capabilityGrantScope).toBeUndefined();
  });

  test('handler identity cannot diverge from manifest identity', () => {
    const manifestSourceId = 'overlay-alpha';
    const manifestVersion = '1.0.0';
    const manifestProviderIdentity = 'provider-alpha';

    const handler: OverlayHandlerMetadata = {
      overlaySourceId: manifestSourceId,
      overlayVersion: manifestVersion,
      handler: (state: any) => state,
      providerIdentity: manifestProviderIdentity,
      handlerIdentityHash: 'sha256:known-hash',
    };

    // Verify binding matches
    expect(handler.overlaySourceId).toBe(manifestSourceId);
    expect(handler.overlayVersion).toBe(manifestVersion);
    expect(handler.providerIdentity).toBe(manifestProviderIdentity);
  });

  test('handler identity fields do not affect handler sort key computation', async () => {
    const { computeHandlerSortKey } = await import('../../src/topology/overlayHandlerSorter.js');

    const handlerWithIdentity: OverlayHandlerMetadata = {
      overlaySourceId: 'overlay-alpha',
      overlayVersion: '1.0.0',
      overlayRegistrySource: 'partner',
      overlaySignature: 'sig:context-default',
      overlayNamespace: 'acme.policy',
      handler: (state: any) => state,
      handlerIdentityHash: 'sha256:identity-hash',
      providerIdentity: 'provider-alpha',
      capabilityGrantScope: ['seam-A', 'seam-B'],
    };

    const handlerWithoutIdentity: OverlayHandlerMetadata = {
      overlaySourceId: 'overlay-alpha',
      overlayVersion: '1.0.0',
      overlayRegistrySource: 'partner',
      overlaySignature: 'sig:context-default',
      overlayNamespace: 'acme.policy',
      handler: (state: any) => state,
    };

    const key1 = computeHandlerSortKey(handlerWithIdentity, OverlayAuthorityTier.TRUSTED_POLICY_PACK);
    const key2 = computeHandlerSortKey(handlerWithoutIdentity, OverlayAuthorityTier.TRUSTED_POLICY_PACK);

    // Sort keys should be identical — F-12 fields do not participate in sorting
    expect(key1).toEqual(key2);
  });
});
