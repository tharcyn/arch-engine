import { ARCH_ENGINE_VERSION } from '../version.js';
import type { PolicyPackManifest } from './PolicyPackManifest';
import type { PolicyPackCompatibilityResult } from './PolicyPackCompatibilityResult';

// Ensures policy-pack.json declares compatibility
// with the running Arch-Engine runtime version
// preventing execution of incompatible governance packs
export function validatePolicyPackCompatibility(
  manifest: PolicyPackManifest
): PolicyPackCompatibilityResult {
  const actualVersion = ARCH_ENGINE_VERSION;
  const expectedVersion = manifest.engineCompatibility;

  if (!expectedVersion) {
    return { compatible: true, expectedVersion, actualVersion };
  }

  if (expectedVersion === actualVersion) {
    return { compatible: true, expectedVersion, actualVersion };
  }

  if (expectedVersion.startsWith('^')) {
    try {
      const expectedMajor = expectedVersion.substring(1).split('.')[0];
      const actualMajor = actualVersion.split('.')[0];
      if (expectedMajor && actualMajor && expectedMajor === actualMajor) {
        return { compatible: true, expectedVersion, actualVersion };
      }
    } catch {
      return { compatible: false, expectedVersion, actualVersion };
    }
  }

  return { compatible: false, expectedVersion, actualVersion };
}
