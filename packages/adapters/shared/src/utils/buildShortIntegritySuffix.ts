export function buildShortIntegritySuffix(hash: string): string {
    return hash.slice(0, 7).toLowerCase();
}
