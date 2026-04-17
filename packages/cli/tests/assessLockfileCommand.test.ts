import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';

const TEST_DIR = path.resolve(__dirname, '../.arch-engine-test-assess');
const REGISTRY_FILE = path.join(TEST_DIR, 'registry.json');
const LOCKFILE = path.join(TEST_DIR, 'policy-lock.json');

describe('assess-lockfile CLI command', () => {
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
    fs.writeFileSync(path.join(TEST_DIR, 'trust.json'), JSON.stringify({ requireSignatures: false }));
  });

  afterEach(() => {
    process.cwd = originalCwd;
    process.exit = originalExit;
    console.log = originalLog;
    process.argv = originalArgv;
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('missing lockfile exit code 1', async () => {
    if (fs.existsSync(LOCKFILE)) fs.rmSync(LOCKFILE);
    
    const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
    const mockLog = vi.fn();
    
    process.exit = mockExit as any;
    console.log = mockLog;
    process.argv = ['node', 'arch-engine', 'policies', 'assess-lockfile'];

    // We need to mock fetch so it doesn't try to reach localhost:9999
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ policyPackId: 'pack-a', version: '1.0.0', contentHash: 'hash-a' })
    });

    try {
        // override cwd for this test to point to our test dir so loadRemotePolicyPackMetadata reads registry from there
        process.cwd = () => TEST_DIR.replace('/.arch-engine', ''); // simulate root
        
        // Let's just mock process.cwd properly for the tested modules
        const index = await import('../src/index');
        
        vi.doMock('node:process', () => ({
            cwd: () => path.dirname(TEST_DIR)
        }));
        
        await index.main();
    } catch (e: any) {
        if (e.message !== 'mock-exit') throw e;
    }

    expect(mockLog).toHaveBeenCalledWith('Lockfile is missing');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
