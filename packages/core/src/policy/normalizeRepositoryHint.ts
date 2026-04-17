export function normalizeRepositoryHint(input: string): string {
    let normalized = input.trim();
    
    if (normalized.startsWith('http://')) {
        normalized = normalized.substring(7);
    } else if (normalized.startsWith('https://')) {
        normalized = normalized.substring(8);
    }
    
    if (normalized.startsWith('github.com/')) {
        normalized = normalized.substring(11);
    } else if (normalized.startsWith('gitlab.com/')) {
        normalized = normalized.substring(11);
    }
    
    return normalized;
}
