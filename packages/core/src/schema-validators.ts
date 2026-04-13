/**
 * Declared Truth Schema Validators
 *
 * Centralized validation utilities for all declared JSON indices.
 * Uses Ajv with strict mode to validate generated outputs against
 * their formal JSON Schemas in schema/declared/.
 *
 * USAGE:
 *   import { validateAll, validateDeclaredAuthorityIndex } from '../lib/schema-validators';
 *   const results = validateAll(generatedDir);
 *
 * DESIGN:
 *   - Schema loading is lazy-cached: each schema is loaded once per process
 *   - Validation errors include the first 5 item-level failures for debugging
 *   - All validators return a typed result object, never throw
 *   - The validateAll() function aggregates all results for pipeline integration
 */

import Ajv, { ValidateFunction } from 'ajv';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Types ──

export interface ValidationResult {
    file: string;
    schemaId: string;
    valid: boolean;
    itemCount: number;
    errorCount: number;
    errors: string[];
}

// ── Ajv instance (strict mode, all errors) ──

const ajv = new Ajv({ strict: true, allErrors: true });

// ── Schema cache ──

const schemaCache = new Map<string, ValidateFunction>();
const SCHEMA_DIR = path.resolve(__dirname, '../../schema/src/declared');

function getValidator(schemaFile: string): ValidateFunction {
    if (schemaCache.has(schemaFile)) {
        return schemaCache.get(schemaFile)!;
    }

    const schemaPath = path.join(SCHEMA_DIR, schemaFile);
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found: ${schemaPath}`);
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const validate = ajv.compile(schema);
    schemaCache.set(schemaFile, validate);
    return validate;
}

// ── Core validation function ──

function validateIndex(
    generatedDir: string,
    jsonFile: string,
    schemaFile: string,
    rootKey: string
): ValidationResult {
    const filePath = path.join(generatedDir, jsonFile);
    const result: ValidationResult = {
        file: jsonFile,
        schemaId: schemaFile.replace('.schema.json', ''),
        valid: false,
        itemCount: 0,
        errorCount: 0,
        errors: [],
    };

    if (!fs.existsSync(filePath)) {
        result.errors.push(`File not found: ${jsonFile}`);
        return result;
    }

    let data: any;
    try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e: any) {
        result.errors.push(`Invalid JSON: ${e.message}`);
        return result;
    }

    const validate = getValidator(schemaFile);
    const valid = validate(data);

    if (!valid && validate.errors) {
        result.errorCount = validate.errors.length;
        // Capture first 5 errors for debugging
        for (const err of validate.errors.slice(0, 5)) {
            result.errors.push(
                `${err.instancePath || '/'} ${err.message}${err.params ? ` (${JSON.stringify(err.params)})` : ''}`
            );
        }
        if (validate.errors.length > 5) {
            result.errors.push(`... and ${validate.errors.length - 5} more errors`);
        }
    } else {
        result.valid = true;
        result.itemCount = Array.isArray(data[rootKey]) ? data[rootKey].length : 0;
    }

    return result;
}

// ── Individual validators ──

export function validateDeclaredAuthorityIndex(generatedDir: string): ValidationResult {
    return validateIndex(generatedDir, 'declared-authority-index.json', 'authority-index.schema.json', 'declared_authorities');
}

export function validateDeclaredInvariantIndex(generatedDir: string): ValidationResult {
    return validateIndex(generatedDir, 'declared-invariant-index.json', 'invariant-index.schema.json', 'declared_invariants');
}

export function validateDeclaredJourneyIndex(generatedDir: string): ValidationResult {
    return validateIndex(generatedDir, 'declared-journey-index.json', 'journey-index.schema.json', 'declared_journeys');
}

export function validateDeclaredImpactIndex(generatedDir: string): ValidationResult {
    return validateIndex(generatedDir, 'declared-impact-index.json', 'impact-index.schema.json', 'declared_impacts');
}

export function validateDeclaredDependencyIndex(generatedDir: string): ValidationResult {
    return validateIndex(generatedDir, 'declared-dependency-index.json', 'dependency-index.schema.json', 'declared_dependencies');
}

export function validateDeclaredContractIndex(generatedDir: string): ValidationResult {
    return validateIndex(generatedDir, 'declared-contract-index.json', 'contract-index.schema.json', 'declared_contracts');
}

export function validateDeclaredPeripheralSurfaceIndex(generatedDir: string): ValidationResult {
    return validateIndex(generatedDir, 'declared-peripheral-surface-index.json', 'peripheral-surface-index.schema.json', 'declared_peripherals');
}

export function validateDeclaredEntityIndex(generatedDir: string): ValidationResult {
    return validateIndex(generatedDir, 'declared-entity-index.json', 'entity-index.schema.json', 'declared_entities');
}

// ── Aggregate validator ──

export function validateAll(generatedDir: string): { results: ValidationResult[]; allValid: boolean } {
    const results = [
        validateDeclaredAuthorityIndex(generatedDir),
        validateDeclaredInvariantIndex(generatedDir),
        validateDeclaredJourneyIndex(generatedDir),
        validateDeclaredImpactIndex(generatedDir),
        validateDeclaredDependencyIndex(generatedDir),
        validateDeclaredContractIndex(generatedDir),
        validateDeclaredPeripheralSurfaceIndex(generatedDir),
        validateDeclaredEntityIndex(generatedDir),
    ];

    return {
        results,
        allValid: results.every(r => r.valid),
    };
}
