import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';

const MOCK_ROOT = path.resolve(__dirname, '../.test-workspace-status');
const TEST_DIR = path.join(MOCK_ROOT, '.arch-engine');
const REGISTRY_FILE = path.join(TEST_DIR, 'registry.json');
const TRUSTFILE = path.join(TEST_DIR, 'trust.json');

describe('status CLI command', () => {
  const originalCwd = process.cwd;
  const originalExit = process.exit;
  const originalLog = console.log;
  const originalArgv = process.argv;

  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    process.cwd = () => MOCK_ROOT;
    
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify({ registries: ['http://localhost:9999'] }));
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

  test('reports blocked status and exits 1 for missing lockfile in strict mode', async () => {
    fs.writeFileSync(TRUSTFILE, JSON.stringify({
      enforcementMode: 'require-signature',
      lockfileSigners: {
        'test-key': {
          key: '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxI3V17l/gA08jIItZlYgZ59B3jJz4gK6H/GkO8V2sY\n-----END PRIVATE KEY-----',
          enabled: true,
          allowedOperations: ['verify']
        }
      }
    }));
    
    const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
    const mockLog = vi.fn();
    
    process.exit = mockExit as any;
    console.log = mockLog;
    process.argv = ['node', 'arch-engine', 'policies', 'status', '--json'];

    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ([])
    });

    try {
        const index = await import('../src/index');
        vi.doMock('node:process', () => ({ cwd: () => MOCK_ROOT }));
        await index.main();
    } catch (e: any) {
        if (e.message !== 'mock-exit') throw e;
    }

    expect(mockExit).toHaveBeenCalledWith(1);
    const jsonOutput = JSON.parse(mockLog.mock.calls[0][0]);
    expect(jsonOutput.status).toBe('blocked');
    expect(jsonOutput.enforcement.failureReason).toBe('MISSING_LOCKFILE');
  });

  test('reports invalid status and exits 1 for malformed keys', async () => {
    fs.writeFileSync(TRUSTFILE, JSON.stringify({
      enforcementMode: 'require-signature',
      lockfileSigners: {
        'test-key': {
          key: 'not-a-pem',
          enabled: true,
          allowedOperations: ['verify']
        }
      }
    }));
    
    const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
    const mockLog = vi.fn();
    
    process.exit = mockExit as any;
    console.log = mockLog;
    process.argv = ['node', 'arch-engine', 'policies', 'status', '--json'];

    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ([])
    });

    try {
        const index = await import('../src/index');
        vi.doMock('node:process', () => ({ cwd: () => MOCK_ROOT }));
        await index.main();
    } catch (e: any) {
        if (e.message !== 'mock-exit') throw e;
    }

    expect(mockExit).toHaveBeenCalledWith(1);
    const jsonOutput = JSON.parse(mockLog.mock.calls[0][0]);
    expect(jsonOutput.status).toBe('invalid');
  });

  test('reports ready status and exits 0 for permissive mode without lockfile', async () => {
    fs.writeFileSync(TRUSTFILE, JSON.stringify({
      enforcementMode: 'permissive'
    }));
    
    const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
    const mockLog = vi.fn();
    
    process.exit = mockExit as any;
    console.log = mockLog;
    process.argv = ['node', 'arch-engine', 'policies', 'status', '--json'];

    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ([])
    });

    try {
        const index = await import('../src/index');
        vi.doMock('node:process', () => ({ cwd: () => MOCK_ROOT }));
        await index.main();
    } catch (e: any) {
        if (e.message !== 'mock-exit') throw e;
    }

    expect(mockExit).toHaveBeenCalledWith(0);
    const jsonOutput = JSON.parse(mockLog.mock.calls[0][0]);
    expect(jsonOutput.status).toBe('ready');
  });
});
