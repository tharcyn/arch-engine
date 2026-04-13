import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * ═══════════════════════════════════════════════════════════
 *  CLI JSON Contract Enforcement
 * ═══════════════════════════════════════════════════════════
 *
 *  Validates that the CLI output contract schema
 *  (schemas/cli-output-contract.json) is structurally valid
 *  and that canonical output samples conform to it.
 *
 *  This test validates schema structure and conformance.
 *  Full CLI invocation tests require workspace context
 *  and are covered by integration tests in @arch-engine/cli.
 */

const SCHEMA_PATH = path.resolve(__dirname, '../../../schemas/cli-output-contract.json');

describe('CLI JSON contract enforcement', () => {

  it('CLI output contract schema exists and is valid JSON Schema', () => {
    expect(fs.existsSync(SCHEMA_PATH), 'CLI output contract schema not found').toBe(true);

    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
    expect(schema.$schema).toBeDefined();
    expect(schema.schemaVersion).toBe('R0-v1');
    expect(schema.$defs).toBeDefined();
  });

  it('DoctorOutput schema validates conforming sample', () => {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
    const ajv = new Ajv({ strict: false });
    const validate = ajv.compile(schema.$defs.DoctorOutput);

    const conformingSample = {
      environment: 'npm-workspace',
      extractionMode: 'structured',
      topologyConfidence: 0.85,
      topologyConfidenceLabel: 'HIGH',
      confidenceDescription: 'HIGH (0.85)',
      detectedNodes: 12,
      expectedNodes: 15,
      connectedNodes: 10,
      coverage: 0.8,
      connectivity: 0.67,
      crossings: 3,
      domainDistribution: { COMMERCE: 4, INVENTORY: 3, IDENTITY: 2 },
      domainIntegrity: { degraded: false, message: null },
      warnings: [],
      autoInitialized: false,
      hasPolicyFile: false
    };

    const valid = validate(conformingSample);
    expect(valid).toBe(true);
  });

  it('InspectOutput schema validates conforming sample', () => {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
    const ajv = new Ajv({ strict: false });
    const validate = ajv.compile(schema.$defs.InspectOutput);

    const conformingSample = {
      nodes: 12,
      edges: 45,
      crossings: 3,
      confidence: 0.85,
      topologyConfidenceLabel: 'HIGH',
      confidenceDescription: 'HIGH (0.85)',
      coverage: 0.8,
      connectivity: 0.67,
      extractionMode: 'structured',
      workspaceType: 'npm-workspace',
      domainDistribution: { COMMERCE: 4 },
      warnings: [],
      adaptersActive: ['adapter-monorepo']
    };

    const valid = validate(conformingSample);
    expect(valid).toBe(true);
  });

  it('CheckOutput schema validates conforming sample', () => {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
    const ajv = new Ajv({ strict: false });
    const validate = ajv.compile(schema.$defs.CheckOutput);

    const conformingSample = {
      score: 0.78,
      classification: 'STABLE',
      stabilityTier: 'STABLE',
      topologyConfidenceLabel: 'HIGH',
      coverage: 0.8,
      connectivity: 0.67,
      extractionMode: 'structured',
      topologyConfidence: 0.85,
      authorityCrossings: 3,
      blockerCrossings: 0,
      warnings: [],
      executionMetrics: {
        extractionMs: 45,
        pipelineMs: 12,
        totalMs: 57
      },
      artifactPath: '.arch-engine/stability-score.json'
    };

    const valid = validate(conformingSample);
    expect(valid).toBe(true);
  });

  it('DoctorOutput schema rejects non-conforming sample', () => {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
    const ajv = new Ajv({ strict: false });
    const validate = ajv.compile(schema.$defs.DoctorOutput);

    // This sample has an illegal extra field
    const nonConforming = {
      environment: 'npm-workspace',
      extractionMode: 'structured',
      topologyConfidence: 0.85,
      topologyConfidenceLabel: 'HIGH',
      confidenceDescription: 'HIGH (0.85)',
      detectedNodes: 12,
      expectedNodes: 15,
      connectedNodes: 10,
      coverage: 0.8,
      connectivity: 0.67,
      crossings: 3,
      domainDistribution: {},
      domainIntegrity: { degraded: false, message: null },
      warnings: [],
      autoInitialized: false,
      hasPolicyFile: false,
      _internalTrustScore: 0.95  // FORBIDDEN: numeric score leakage
    };

    const valid = validate(nonConforming);
    expect(valid).toBe(false);
  });

  it('diagnostic sovereignty schema exists and is valid', () => {
    const diagnosticSchemaPath = path.resolve(__dirname, '../../../schemas/diagnostics/R0-v1.json');
    expect(fs.existsSync(diagnosticSchemaPath), 'Diagnostic schema not found').toBe(true);

    const schema = JSON.parse(fs.readFileSync(diagnosticSchemaPath, 'utf-8'));
    expect(schema.schemaVersion).toBe('R0-v1');
    expect(schema.$defs.DiagnosticEntry.additionalProperties).toBe(false);
  });

  it('descriptor schema exists and is valid', () => {
    const descriptorSchemaPath = path.resolve(__dirname, '../../../schemas/descriptors/v1.json');
    expect(fs.existsSync(descriptorSchemaPath), 'Descriptor schema not found').toBe(true);

    const schema = JSON.parse(fs.readFileSync(descriptorSchemaPath, 'utf-8'));
    expect(schema.schemaVersion).toBe('v1');
    expect(schema.additionalProperties).toBe(false);
  });
});
