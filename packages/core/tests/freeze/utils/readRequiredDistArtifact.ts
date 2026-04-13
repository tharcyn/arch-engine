import fs from 'node:fs';

export function readRequiredDistArtifact(path: string): string {
  if (!fs.existsSync(path)) {
    throw new Error(
      `[FREEZE_DIST_ARTIFACT_MISSING] Required artifact missing: ${path}`
    );
  }

  return fs.readFileSync(path, 'utf8');
}
