import type { PolicyRegistryLockEntry } from './PolicyRegistryLockfile';

export function canonicalizeRegistryLockfilePayload(registries: readonly PolicyRegistryLockEntry[]): string {
  // stable stringify of the lockEntries only
  // registries are already deterministically ordered when written
  return JSON.stringify(registries);
}
