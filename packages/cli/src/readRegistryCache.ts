import * as fs from 'node:fs';
import * as path from 'node:path';

export function readRegistryCache(): Record<string, any[]> | null {
    const file = path.resolve(process.cwd(), '.arch-engine/cache/registry-cache.json');
    if (!fs.existsSync(file)) return null;
    
    try {
        const content = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
    } catch {
        // silent corruption rejection
    }
    
    return null;
}
