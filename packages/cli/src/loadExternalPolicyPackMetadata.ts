// Loads metadata from installed @arch-engine policy-pack packages
// enabling organization-level governance pack discovery
// without executing external policy logic
//
// External policy packs may define JSON-based rule surfaces
// identical to workspace packs.
// These rules execute through the deterministic sandbox engine
// without dynamic imports or runtime plugin execution.
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PolicyPackMetadata } from '@arch-engine/core';
import { validatePolicyPackManifest, validatePolicyPackCompatibility } from '@arch-engine/core';

export function loadExternalPolicyPackMetadata(): PolicyPackMetadata[] {
  const dirPath = path.resolve(process.cwd(), 'node_modules/@arch-engine');
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return [];
  }

  let files: string[];
  try {
    files = fs.readdirSync(dirPath);
  } catch (e) {
    return [];
  }

  const metadataArray: PolicyPackMetadata[] = [];

  for (const file of files) {
    if (!file.startsWith('policy-pack-')) {
      continue;
    }

    try {
      const packPath = path.join(dirPath, file);
      if (!fs.statSync(packPath).isDirectory()) {
        continue;
      }

      const filePath = path.join(packPath, 'policy-pack.json');
      if (!fs.existsSync(filePath)) {
        continue;
      }

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
        metadataArray.push(metadata);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return metadataArray;
}
