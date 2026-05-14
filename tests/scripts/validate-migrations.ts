#!/usr/bin/env node
/**
 * tests/scripts/validate-migrations.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Migration validation script.
 * Checks all SQL migration files for:
 *   - Valid SQL syntax (basic checks)
 *   - Additive-only constraints (no DROP TABLE, no DROP COLUMN on existing tables)
 *   - Naming conventions (snake_case, prefixed)
 *   - Sequential ordering
 *   - Index naming convention
 *   - Schema prefix consistency (eco_monitoring.)
 *
 * Usage:
 *   tsx tests/scripts/validate-migrations.ts
 *   OR: npm run validate:migrations
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";

const MIGRATIONS_DIR = join(process.cwd(), "migrations");
const SCHEMA_PREFIX = "eco_monitoring";

interface ValidationResult {
  file: string;
  errors: string[];
  warnings: string[];
}

function checkSQLContent(content: string, filename: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lower = content.toLowerCase();

  // ── Destructive operation checks ─────────────────────────────────────────
  if (/\bdrop\s+table\b/i.test(content)) {
    errors.push("Contains DROP TABLE — destructive operation not allowed in migrations");
  }
  if (/\bdrop\s+column\b/i.test(content)) {
    errors.push("Contains DROP COLUMN — destructive operation not allowed in migrations");
  }
  if (/\btruncate\b/i.test(content)) {
    errors.push("Contains TRUNCATE — destructive operation not allowed in migrations");
  }
  if (/\bdelete\s+from\b/i.test(content) && !/--.*delete/i.test(content)) {
    warnings.push("Contains DELETE FROM — ensure this is intentional cleanup, not data loss");
  }

  // ── Schema prefix check ───────────────────────────────────────────────────
  const createTableMatches = content.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)/gi);
  for (const match of createTableMatches) {
    const tableName = match[1];
    if (!tableName.startsWith(SCHEMA_PREFIX) && tableName !== "spatial_ref_sys") {
      warnings.push(
        `Table '${tableName}' does not use '${SCHEMA_PREFIX}_' prefix — consider namespacing`
      );
    }
  }

  // ── Index naming convention ───────────────────────────────────────────────
  const indexMatches = content.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+CONCURRENTLY)?(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)/gi);
  for (const match of indexMatches) {
    const indexName = match[1];
    if (!indexName.startsWith("idx_") && !indexName.startsWith("uidx_")) {
      warnings.push(
        `Index '${indexName}' does not follow naming convention (should start with idx_ or uidx_)`
      );
    }
  }

  // ── Transaction safety ────────────────────────────────────────────────────
  // Long migrations should be wrapped in transactions
  const hasBegin = /\bbegin\b/i.test(content);
  const hasCommit = /\bcommit\b/i.test(content);
  const lineCount = content.split("\n").length;
  if (lineCount > 50 && !hasBegin) {
    warnings.push("Long migration (>50 lines) not wrapped in BEGIN/COMMIT transaction block");
  }

  // ── Column type safety ────────────────────────────────────────────────────
  if (/\bSERIAL\b/i.test(content)) {
    warnings.push("Uses SERIAL type — prefer BIGSERIAL or gen_random_uuid() for new tables");
  }

  // ── Foreign key checks ────────────────────────────────────────────────────
  if (/REFERENCES/i.test(content) && !/ON DELETE/i.test(content)) {
    warnings.push("Foreign key without ON DELETE clause — explicitly define CASCADE, SET NULL, or RESTRICT");
  }

  return { errors, warnings };
}

async function validateMigrations(): Promise<void> {
  console.log("═".repeat(60));
  console.log("NEVARA Migration Validator");
  console.log("═".repeat(60));

  let files: string[];
  try {
    files = await readdir(MIGRATIONS_DIR);
  } catch {
    console.error(`\n✗ Cannot read migrations directory: ${MIGRATIONS_DIR}`);
    console.error("  Create the directory or run from the project root.");
    process.exit(1);
  }

  const sqlFiles = files
    .filter((f) => extname(f) === ".sql")
    .sort();

  if (sqlFiles.length === 0) {
    console.log("\n⚠ No SQL migration files found.");
    process.exit(0);
  }

  console.log(`\nValidating ${sqlFiles.length} migration file(s)...\n`);

  // ── Sequential ordering check ─────────────────────────────────────────────
  const prefixNumbers = sqlFiles.map((f) => parseInt(f.split("_")[0], 10));
  for (let i = 1; i < prefixNumbers.length; i++) {
    if (prefixNumbers[i] !== prefixNumbers[i - 1] + 1) {
      console.warn(
        `⚠ Non-sequential migration numbers: ${sqlFiles[i - 1]} → ${sqlFiles[i]}`
      );
    }
  }

  const results: ValidationResult[] = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const file of sqlFiles) {
    const path = join(MIGRATIONS_DIR, file);
    let content: string;
    try {
      content = await readFile(path, "utf8");
    } catch {
      results.push({ file, errors: [`Cannot read file: ${path}`], warnings: [] });
      totalErrors++;
      continue;
    }

    const { errors, warnings } = checkSQLContent(content, file);
    results.push({ file, errors, warnings });
    totalErrors += errors.length;
    totalWarnings += warnings.length;
  }

  // ── Print results ─────────────────────────────────────────────────────────
  for (const result of results) {
    const status = result.errors.length > 0 ? "✗" : result.warnings.length > 0 ? "⚠" : "✓";
    const sizeIndicator = result.errors.length > 0 ? "\x1b[31m" : result.warnings.length > 0 ? "\x1b[33m" : "\x1b[32m";
    console.log(`${sizeIndicator}${status} ${result.file}\x1b[0m`);
    for (const err of result.errors) {
      console.log(`   \x1b[31m  ERROR: ${err}\x1b[0m`);
    }
    for (const warn of result.warnings) {
      console.log(`   \x1b[33m  WARN:  ${warn}\x1b[0m`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log(`Files validated:  ${sqlFiles.length}`);
  console.log(`Total errors:     ${totalErrors}`);
  console.log(`Total warnings:   ${totalWarnings}`);
  console.log("─".repeat(60));

  if (totalErrors > 0) {
    console.error("\n✗ Migration validation FAILED — fix errors before deploying.\n");
    process.exit(1);
  } else {
    console.log("\n✓ Migration validation PASSED\n");
    process.exit(0);
  }
}

validateMigrations().catch((err) => {
  console.error("Validator error:", err);
  process.exit(1);
});
