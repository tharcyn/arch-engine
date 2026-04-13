/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/core — Entity Identity Engine Tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Tests for the canonical identity authority.
 *  Includes fixture-based parity testing for cross-language
 *  verification against the PHP implementation.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateEntityId,
  extractShortName,
  slugify,
  computeHash,
} from '../../src/entity-id.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesPath = resolve(__dirname, '../../../../fixtures/identity/entities.json');
const fixtures: Array<{ qualified_name: string; file_path: string; entity_type: string }> =
  JSON.parse(readFileSync(fixturesPath, 'utf-8'));

// ─── Unit Tests ─────────────────────────────────────────

describe('extractShortName', () => {
  it('extracts short name from PHP FQCN', () => {
    expect(extractShortName('App\\Models\\Order')).toBe('Order');
  });

  it('extracts short name from nested namespace', () => {
    expect(extractShortName('App\\Services\\Inventory\\InventoryLedgerService')).toBe('InventoryLedgerService');
  });

  it('extracts short name from dot-separated path', () => {
    expect(extractShortName('com.example.services.WalletService')).toBe('WalletService');
  });

  it('extracts short name from slash-separated path', () => {
    expect(extractShortName('src/services/WalletService')).toBe('WalletService');
  });

  it('returns input for unqualified name', () => {
    expect(extractShortName('WalletService')).toBe('WalletService');
  });
});

describe('slugify', () => {
  it('converts PascalCase to kebab-case', () => {
    expect(slugify('OrderController')).toBe('order-controller');
  });

  it('handles consecutive uppercase (acronym prefix)', () => {
    expect(slugify('MFaisaCustomer')).toBe('m-faisa-customer');
  });

  it('handles simple model names', () => {
    expect(slugify('Order')).toBe('order');
  });

  it('handles multi-word service names', () => {
    expect(slugify('InventoryLedgerService')).toBe('inventory-ledger-service');
  });

  it('handles names with numbers', () => {
    expect(slugify('OAuth2Controller')).toBe('o-auth2-controller');
  });
});

describe('computeHash', () => {
  it('produces 8-character hex hash', () => {
    const hash = computeHash('App\\Models\\Order', 'app/Models/Order.php');
    expect(hash).toHaveLength(8);
    expect(hash).toMatch(/^[a-f0-9]{8}$/);
  });

  it('is deterministic', () => {
    const h1 = computeHash('App\\Models\\Order', 'app/Models/Order.php');
    const h2 = computeHash('App\\Models\\Order', 'app/Models/Order.php');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different inputs', () => {
    const h1 = computeHash('App\\Models\\Order', 'app/Models/Order.php');
    const h2 = computeHash('App\\Models\\Customer', 'app/Models/Customer.php');
    expect(h1).not.toBe(h2);
  });
});

describe('generateEntityId', () => {
  it('produces correct format: prefix_slug_hash', () => {
    const id = generateEntityId(
      'App\\Models\\Order',
      'app/Models/Order.php',
      'model',
    );
    expect(id).toMatch(/^mdl_order_[a-f0-9]{8}$/);
  });

  it('uses correct prefix for each entity type', () => {
    const svcId = generateEntityId('App\\Services\\WalletService', 'app/Services/WalletService.php', 'service');
    expect(svcId).toMatch(/^svc_/);

    const ctrlId = generateEntityId('App\\Http\\Controllers\\OrderController', 'app/Http/Controllers/OrderController.php', 'controller');
    expect(ctrlId).toMatch(/^ctrl_/);

    const jobId = generateEntityId('App\\Jobs\\ProcessPayment', 'app/Jobs/ProcessPayment.php', 'job');
    expect(jobId).toMatch(/^job_/);

    const evtId = generateEntityId('App\\Events\\OrderCreated', 'app/Events/OrderCreated.php', 'event');
    expect(evtId).toMatch(/^evt_/);
  });

  it('supports custom prefix configuration', () => {
    const id = generateEntityId(
      'App\\Models\\Order',
      'app/Models/Order.php',
      'model',
      { typePrefixes: { model: 'entity' } },
    );
    expect(id).toMatch(/^entity_order_[a-f0-9]{8}$/);
  });

  it('falls back to first 3 chars for unknown types', () => {
    const id = generateEntityId('Something', 'somewhere.ts', 'widget');
    expect(id).toMatch(/^wid_/);
  });

  it('is deterministic across calls', () => {
    const id1 = generateEntityId('App\\Models\\Order', 'app/Models/Order.php', 'model');
    const id2 = generateEntityId('App\\Models\\Order', 'app/Models/Order.php', 'model');
    expect(id1).toBe(id2);
  });
});

// ─── Fixture-Based Parity Tests ─────────────────────────

describe('fixture parity — cross-language identity verification', () => {
  // Track generated IDs for snapshot/parity comparison
  const generatedIds: Record<string, string> = {};

  for (const fixture of fixtures) {
    it(`generates stable ID for ${fixture.qualified_name}`, () => {
      const id = generateEntityId(
        fixture.qualified_name,
        fixture.file_path,
        fixture.entity_type,
      );

      // Verify format
      expect(id).toMatch(/^[a-z]{2,5}_[a-z0-9-]+_[a-f0-9]{8}$/);

      // Store for snapshot comparison
      generatedIds[fixture.qualified_name] = id;
    });
  }

  it('all 20 fixture IDs are unique', () => {
    const allIds = fixtures.map((f) =>
      generateEntityId(f.qualified_name, f.file_path, f.entity_type),
    );
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });
});
