// Loads workspace-level governance pack metadata
// enabling repository-scoped policy discovery
// without modifying built-in policy-pack registry
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PolicyPackMetadata } from '@arch-engine/core';
import { validatePolicyPackManifest, validatePolicyPackCompatibility } from '@arch-engine/core';

export function loadLocalPolicyPackMetadata(): PolicyPackMetadata[] {
  const dirPath = path.resolve(process.cwd(), '.arch-engine/policies');
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return [];
  }

  const files = fs.readdirSync(dirPath);
  const metadataArray: PolicyPackMetadata[] = [];

  for (const file of files) {
    if (!file.endsWith('.policy.json')) {
      continue;
    }

    try {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      if (validatePolicyPackManifest(parsed)) {
        if (!validatePolicyPackCompatibility(parsed).compatible) {
          continue;
        }
        const metadata: any = {
          policyPackId: parsed.policyPackId,
          description: parsed.description,
          category: parsed.category,
        };
        if (parsed.rules) {
          metadata.rules = parsed.rules;
        }
        if (parsed.dependencies) {
          metadata.dependencies = parsed.dependencies;
        }
        if (parsed.requiredDatasetCapabilities) {
          metadata.requiredDatasetCapabilities = parsed.requiredDatasetCapabilities;
        }
        if (parsed.optionalDatasetCapabilities) {
          metadata.optionalDatasetCapabilities = parsed.optionalDatasetCapabilities;
        }
        if (parsed.requiredMutationClasses) {
          metadata.requiredMutationClasses = parsed.requiredMutationClasses;
        }
        if (parsed.requiredAuthorityScopes) {
          metadata.requiredAuthorityScopes = parsed.requiredAuthorityScopes;
        }
        if (parsed.requiredSurfaceConfidenceKeys) {
          metadata.requiredSurfaceConfidenceKeys = parsed.requiredSurfaceConfidenceKeys;
        }
        if (parsed.requiredTrustBoundaryRules) {
          metadata.requiredTrustBoundaryRules = parsed.requiredTrustBoundaryRules;
        }
        metadataArray.push(metadata);
      }
    } catch {
      // Reject invalid files silently
    }
  }

  return metadataArray;
}
