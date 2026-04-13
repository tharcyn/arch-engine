/**
 * ═══════════════════════════════════════════════════════════
 *  Entity Identity Hashing — Phase 5.5
 * ═══════════════════════════════════════════════════════════
 *
 *  Generates deterministic, stable, cross-platform entity IDs
 *  from namespace + class_name + repo-relative file_path.
 *
 *  Format: {type_prefix}_{slugified_short_name}_{8-char sha256}
 *
 *  Identity changes ONLY when:
 *    - namespace changes
 *    - class name changes
 *    - file location changes
 *
 *  Identity is stable under:
 *    - method changes
 *    - dependency changes
 *    - comment / whitespace changes
 */

import { createHash } from 'crypto';

const TYPE_PREFIXES: Record<string, string> = {
  model: 'mdl',
  service: 'svc',
  controller: 'ctrl',
  job: 'job',
  event: 'evt',
  route: 'rte',
  composable: 'cmp',
  store: 'str',
  openapi_path: 'api',
  frontend_route: 'frt',
};

/**
 * Slugify a PascalCase or camelCase name into kebab-case.
 *   InventoryLedgerService → inventory-ledger-service
 */
export function slugify(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function extractShortName(className: string): string {
  return className.split(/[\\/.]/).pop() || className;
}

export function computeHash(className: string, filePath: string): string {
  const hashInput = `${className}::${filePath}`;
  return createHash('sha256').update(hashInput).digest('hex').slice(0, 8);
}

/**
 * Generate a deterministic entity identity string.
 *
 * @param className  Fully-qualified class name (e.g. Com\Company\Core\DomainService)
 * @param filePath   Repo-root-relative path (e.g. src/core/DomainService.ts)
 * @param entityType Entity type key (model, service, controller, etc.)
 * @returns          Stable identity string, e.g. svc_domain-service_4b7e2e9b
 */
export function generateEntityId(
  className: string,
  filePath: string,
  entityType: string,
  options?: { typePrefixes?: Record<string, string> }
): string {
  const customPrefixes = options?.typePrefixes || {};
  const prefix = customPrefixes[entityType] || TYPE_PREFIXES[entityType] || entityType.slice(0, 3);
  const shortName = extractShortName(className);
  const slug = slugify(shortName);

  const hash = computeHash(className, filePath);

  return `${prefix}_${slug}_${hash}`;
}
