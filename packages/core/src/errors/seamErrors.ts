export enum SeamConflictCode {
  SEAM_NOT_FOUND = 'SEAM_NOT_FOUND',
  SEAM_MERGE_VIOLATION = 'SEAM_MERGE_VIOLATION',
  SEAM_CORE_INVARIANT_SHADOW_ATTEMPT = 'SEAM_CORE_INVARIANT_SHADOW_ATTEMPT',
  SEAM_UNAUTHORIZED_OVERRIDE = 'SEAM_UNAUTHORIZED_OVERRIDE',
  SEAM_MULTIPLE_OVERLAYS_CONFLICT = 'SEAM_MULTIPLE_OVERLAYS_CONFLICT',
  SEAM_INACTIVE_BY_DEFAULT = 'SEAM_INACTIVE_BY_DEFAULT'
}

export class OverlaySeamError extends Error {
  code: SeamConflictCode;
  
  constructor(code: SeamConflictCode, message: string) {
    super(message);
    this.name = 'OverlaySeamError';
    this.code = code;
  }
}
