import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';

const MOCK_ROOT = path.resolve(__dirname, '../.test-workspace');
const TEST_DIR = path.join(MOCK_ROOT, '.arch-engine');
const REGISTRY_FILE = path.join(TEST_DIR, 'registry.json');
const LOCKFILE = path.join(TEST_DIR, 'policy-lock.json');

describe('refresh-lockfile CLI command', () => {
  const originalCwd = process.cwd;
  const originalExit = process.exit;
  const originalLog = console.log;
  const originalArgv = process.argv;

  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    process.cwd = () => path.resolve(__dirname, '..');
    
    // Setup a dummy registry.json
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify({ registries: ['http://localhost:9999'] }));
    
    // Setup trust.json
    fs.writeFileSync(path.join(TEST_DIR, 'trust.json'), JSON.stringify({ 
      requireSignatures: false,
      signerLockfileKeys: {
        'test-key': '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxI3V17l/gA08jIItZlYgZ59B3jJz4gK6H/GkO8V2sY\n-----END PRIVATE KEY-----'
      }
    }));
  });

  afterEach(() => {
    process.cwd = originalCwd;
    process.exit = originalExit;
    console.log = originalLog;
    process.argv = originalArgv;
    if (fs.existsSync(MOCK_ROOT)) {
      fs.rmSync(MOCK_ROOT, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  test('atomic write behavior during refresh', async () => {
    const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
    const mockLog = vi.fn();
    
    process.exit = mockExit as any;
    console.log = mockLog;
    process.argv = ['node', 'arch-engine', 'policies', 'refresh-lockfile', '--sign', 'test-key'];

    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ policyPackId: 'pack-a', version: '1.0.0', contentHash: 'hash-a' })
    });

    try {
        process.cwd = () => MOCK_ROOT; 
        const index = await import('../src/index');
        
        vi.doMock('node:process', () => ({
            cwd: () => MOCK_ROOT
        }));
        
        await index.main();
    } catch (e: any) {
        if (e.message !== 'mock-exit') throw e;
    }

    expect(mockExit).toHaveBeenCalledWith(0);
    expect(fs.existsSync(LOCKFILE)).toBe(true);
    const written = JSON.parse(fs.readFileSync(LOCKFILE, 'utf-8'));
    expect(written.signatures?.[0].signatureAlgorithm).toBe('ed25519');
    expect(written.signatures?.[0].signatureKeyId).toBe('test-key');
  });
});
