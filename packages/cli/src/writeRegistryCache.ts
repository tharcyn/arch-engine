import * as fs from 'node:fs';
import * as path from 'node:path';

export function writeRegistryCache(cacheMap: Record<string, any[]>): void {
    const dir = path.resolve(process.cwd(), '.arch-engine/cache');
    const file = path.join(dir, 'registry-cache.json');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    // Atomic write behavior
    const tempFile = path.join(dir, `registry-cache.json.tmp.${Date.now()}`);
    fs.writeFileSync(tempFile, JSON.stringify(cacheMap, null, 2), 'utf8');
    fs.renameSync(tempFile, file);
}
