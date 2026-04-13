export const MANIFEST_HYDRATION_CONTRACT_VERSION = 'v1';

export interface HydratedManifest {
  dependencies: string[];
  extends: string[];
  namespaces: Record<string, string>;
  issuerData: string[];
}

/**
 * Manifest Hydration Rules (v1):
 * - declared dependency ordering preserved
 * - declared extends ordering preserved
 * - declared namespace mapping preserved
 * - declared issuer metadata ordering preserved
 */
export function hydrateManifest(rawObj: any): HydratedManifest {
  // Simulates deterministic parsing guarantees. In v1 we ensure array map yields 1:1 order
  return {
    dependencies: Array.isArray(rawObj?.dependencies) ? [...rawObj.dependencies] : [],
    extends: Array.isArray(rawObj?.extends) ? [...rawObj.extends] : (typeof rawObj?.extends === 'string' ? [rawObj.extends] : []),
    namespaces: typeof rawObj?.namespaces === 'object' ? { ...rawObj.namespaces } : {},
    issuerData: Array.isArray(rawObj?.issuerData) ? [...rawObj.issuerData] : []
  };
}
