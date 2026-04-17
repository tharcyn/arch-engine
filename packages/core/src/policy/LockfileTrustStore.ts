import * as fs from 'node:fs';
import type { LockfileSignerConfig, ResolvedSignerIdentity } from './LockfileSignerConfig';

export interface LockfileTrustStore {
  /**
   * Resolves a public key by its declared ID.
   * Return undefined if the key is unknown or untrusted.
   */
  getPublicKey(keyId: string): ResolvedSignerIdentity | undefined;
}

export class StaticLockfileTrustStore implements LockfileTrustStore {
  private readonly structuredSigners: Record<string, LockfileSignerConfig> = {};

  constructor(
    trustedKeys?: Record<string, string>,
    structuredSigners?: Record<string, LockfileSignerConfig>
  ) {
    if (trustedKeys) {
      for (const [keyId, key] of Object.entries(trustedKeys)) {
        this.structuredSigners[keyId] = {
          key,
          algorithm: 'ed25519',
          enabled: true,
          allowedOperations: ['verify']
        };
      }
    }
    
    if (structuredSigners) {
      for (const [keyId, config] of Object.entries(structuredSigners)) {
        this.structuredSigners[keyId] = config;
      }
    }
  }

  getPublicKey(keyId: string): ResolvedSignerIdentity | undefined {
    const config = this.structuredSigners[keyId];
    if (!config) return undefined;
    
    let pem: string | undefined;
    if (config.key.startsWith('-----BEGIN PUBLIC KEY-----')) {
        pem = config.key;
    } else {
        // Treat as path
        try {
            pem = fs.readFileSync(config.key, 'utf8');
        } catch {
            return undefined;
        }
    }

    return {
        pem,
        algorithm: config.algorithm || 'ed25519',
        enabled: config.enabled !== false,
        allowedOperations: config.allowedOperations || ['verify', 'sign'],
        role: config.role,
        status: config.status,
        replacementKeyId: config.replacementKeyId,
        note: config.note
    };
  }
}
