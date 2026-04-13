import { OverlaySeamRegistry } from './seamRegistry.js';
import { OverlaySeamError, SeamConflictCode } from '../errors/seamErrors.js';
import { OverlaySeamContract } from './seamContracts.js';

export function validateSeamNamespace(seamId: string | keyof typeof OverlaySeamRegistry): OverlaySeamContract {
  const seamStr = String(seamId);

  // 1. Syntactic validation
  const parts = seamStr.split('::');
  if (parts.length !== 3 || parts[0] !== 'overlay') {
    throw new OverlaySeamError(SeamConflictCode.SEAM_NOT_FOUND, `Invalid seam syntax. Expected overlay::<layer>::<boundary>. Got: ${seamStr}`);
  }

  // 2. Semantic validation
  const registryEntry = OverlaySeamRegistry[seamStr];
  if (!registryEntry) {
    throw new OverlaySeamError(SeamConflictCode.SEAM_NOT_FOUND, `Unregistered overlay seam boundary: ${seamStr}`);
  }

  return registryEntry;
}
