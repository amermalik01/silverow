// lib/migration/migration.service.ts

import { migrationRegistry } from "./migration.registry";
import { MigrationModule, MigrationContext, MigrationRow } from "./migration.types";

export async function validateMigration(
  module: MigrationModule,
  rows: MigrationRow[],
  context: MigrationContext,
) {
  const handler = migrationRegistry[module];

  if (!handler) throw new Error("Migration module not registered");

  return handler.validate(rows, context);
}

export async function executeMigration(
  module: MigrationModule,
  rows: MigrationRow[],
  context: MigrationContext,
) {
  const handler = migrationRegistry[module];

  if (!handler) throw new Error("Migration module not registered");

  return handler.execute(rows, context);
}
