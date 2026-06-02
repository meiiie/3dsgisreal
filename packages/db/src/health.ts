import { sql, type Kysely } from "kysely";

import type { Database } from "./schema";

export type DatabaseRuntimeStatus = {
  connected: boolean;
  databaseName: string | null;
  postgresVersion: string | null;
  postgisAvailable: boolean;
  migrationTableExists: boolean;
  appliedMigrationCount: number;
  latestMigration: string | null;
  requiredTables: Record<string, boolean>;
};

const requiredTableNames = [
  "profiles",
  "project_members",
  "places",
  "place_privacy_reviews",
  "scenes",
  "scene_versions",
  "scene_hotspots",
  "capture_sessions",
  "processing_jobs",
  "user_place_library",
  "user_quiz_attempts",
] as const;

export async function getDatabaseRuntimeStatus(db: Kysely<Database>): Promise<DatabaseRuntimeStatus> {
  const [serverRow, postgisRow, migrationRow, tableRows] = await Promise.all([
    readServerRow(db),
    readPostgisRow(db),
    readMigrationRow(db),
    readRequiredTableRows(db),
  ]);

  return {
    connected: true,
    databaseName: serverRow.databaseName,
    postgresVersion: serverRow.postgresVersion,
    postgisAvailable: postgisRow.available,
    migrationTableExists: migrationRow.exists,
    appliedMigrationCount: migrationRow.count,
    latestMigration: migrationRow.latest,
    requiredTables: Object.fromEntries(
      requiredTableNames.map((name) => [name, tableRows.has(name)]),
    ) as Record<string, boolean>,
  };
}

async function readServerRow(db: Kysely<Database>) {
  const result = await sql<{ databaseName: string; postgresVersion: string }>`
    select
      current_database() as "databaseName",
      version() as "postgresVersion"
  `.execute(db);

  return result.rows[0] ?? { databaseName: "", postgresVersion: "" };
}

async function readPostgisRow(db: Kysely<Database>) {
  const result = await sql<{ available: boolean }>`
    select exists (
      select 1
      from pg_extension
      where extname = 'postgis'
    ) as "available"
  `.execute(db);

  return result.rows[0] ?? { available: false };
}

async function readMigrationRow(db: Kysely<Database>) {
  const existsResult = await sql<{ exists: boolean }>`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'schema_migrations'
    ) as "exists"
  `.execute(db);
  const exists = Boolean(existsResult.rows[0]?.exists);

  if (!exists) {
    return { exists: false, count: 0, latest: null };
  }

  const result = await sql<{ count: string; latest: string | null }>`
    select
      count(*)::text as "count",
      max(filename) as "latest"
    from public.schema_migrations
  `.execute(db);
  const row = result.rows[0];

  return {
    exists: true,
    count: Number.parseInt(row?.count ?? "0", 10) || 0,
    latest: row?.latest ?? null,
  };
}

async function readRequiredTableRows(db: Kysely<Database>) {
  const result = await sql<{ tableName: string }>`
    select table_name as "tableName"
    from information_schema.tables
    where table_schema = 'public'
      and table_name = any(${requiredTableNames}::text[])
  `.execute(db);

  return new Set(result.rows.map((row) => row.tableName));
}
