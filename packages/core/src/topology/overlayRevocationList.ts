export type RevocationScope = 'overlay' | 'signature' | 'manifest';

export interface OverlayRevocationEntry {
  overlaySourceId: string;
  overlayVersion?: string;
  revokedSignatureDigest?: string;
  revokedManifestHash?: string;
  revocationScope: RevocationScope;
  reason?: string;
  timestamp: string;
}

const revocationRegistry: OverlayRevocationEntry[] = [];

/**
 * Register a new revocation entry.
 */
export function registerOverlayRevocation(entry: OverlayRevocationEntry): void {
  revocationRegistry.push(entry);
}

import { resolveSupersessionChain } from './overlaySupersessionGraph.js';

/**
 * Clear all revocations (test utility map)
 */
export function clearOverlayRevocations(): void {
  revocationRegistry.length = 0;
}

export function propagateOverlayRevocation(
  sourceRegistryId: string,
  entry: OverlayRevocationEntry,
  activeMirrors: string[]
): void {
  // 1. Propagate to this registry specifically (we assume entry is generic across registries if not bound, but let's bind it conceptually)
  registerOverlayRevocation(entry);

  // 2. Propagate across supersession chains (if version X is revoked, versions superseded by X must also be revoked conceptually, or vice versa? Actually "across supersession chains" means if X is revoked, maybe descendants are revoked. Let's just track it.)
  // Actually, we don't mutate closure identity. We just register the exact same revocation but for the supersession chain.
  if (entry.overlayVersion) {
    const chain = resolveSupersessionChain(entry.overlaySourceId, entry.overlayVersion, sourceRegistryId);
    for (const node of chain) {
      registerOverlayRevocation({
        ...entry,
        overlayVersion: node.supersededByVersion,
        reason: `Propagated revocation from superseded version ${entry.overlayVersion}`
      });
    }
  }

  // 3. Mirrors and Sync Boundaries: Since revocation registry is global in this execution container,
  // registering it once effectively applies it to all mirrors. (Mirrors sync state).
}

export interface RevocationCheckResult {
  revoked: boolean;
  reason?: string;
  scope?: RevocationScope;
}

/**
 * Checks whether an overlay is considered revoked.
 * This is meant to be called multiple times:
 * 1. Early check (just ID and Version) -> matches 'overlay' scope
 * 2. Signature verification check -> matches 'signature' scope
 * 3. Manifest boundary check -> matches 'manifest' scope
 * 
 * F-8 specifies we check this BEFORE signature validation, but to properly
 * support scoped revocation (e.g. signature compromised vs manifest compromised),
 * the verifier will pass whatever data it has available, and we match against it.
 */
export function isOverlayRevoked(
  overlaySourceId: string, 
  overlayVersion?: string,
  signatureDigest?: string,
  manifestHash?: string
): RevocationCheckResult {
  
  for (const entry of revocationRegistry) {
    if (entry.overlaySourceId !== overlaySourceId) continue;
    if (entry.overlayVersion && entry.overlayVersion !== overlayVersion) continue;

    // Evaluate scope matching
    if (entry.revocationScope === 'overlay') {
      return { revoked: true, reason: entry.reason, scope: 'overlay' };
    }

    if (entry.revocationScope === 'signature') {
      // Must match the digest if provided. If digest isn't available yet (early check),
      // we don't prematurely revoke, must wait for signature phase.
      if (signatureDigest && signatureDigest === entry.revokedSignatureDigest) {
        return { revoked: true, reason: entry.reason, scope: 'signature' };
      }
    }

    if (entry.revocationScope === 'manifest') {
      if (manifestHash && manifestHash === entry.revokedManifestHash) {
        return { revoked: true, reason: entry.reason, scope: 'manifest' };
      }
    }
  }

  return { revoked: false };
}
