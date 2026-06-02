import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");
const migrationsDir = path.join(repoRoot, "db", "migrations");
const args = new Set(process.argv.slice(2));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required. Example: postgres://loi_vao:loi_vao_dev@localhost:5432/loi_vao");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await ensureMigrationsTable();

  const migrations = await readMigrations();
  const applied = await readAppliedMigrations();

  if (args.has("--status")) {
    printStatus(migrations, applied);
    process.exit(0);
  }

  if (applied.size === 0 && (await hasExistingSchema())) {
    if (!args.has("--baseline-existing")) {
      throw new Error(
        "Database already has Loi Vao tables but no schema_migrations history. " +
          "Run with --baseline-existing only if this DB was initialized from the current db/migrations files.",
      );
    }

    await baselineMigrations(migrations);
    console.log(`Baselined ${migrations.length} migrations.`);
    process.exit(0);
  }

  await verifyAppliedChecksums(migrations, applied);

  let appliedCount = 0;
  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      continue;
    }

    await applyMigration(migration);
    appliedCount += 1;
    console.log(`Applied ${migration.name}`);
  }

  if (appliedCount === 0) {
    console.log("No pending migrations.");
  } else {
    console.log(`Applied ${appliedCount} migration(s).`);
  }
} finally {
  await client.end().catch(() => undefined);
}

async function ensureMigrationsTable() {
  await client.query(`
    create table if not exists public.schema_migrations (
      filename text primary key,
      checksum_sha256 text not null,
      applied_at timestamptz not null default now()
    )
  `);
}

async function readMigrations() {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  return Promise.all(
    files.map(async (name) => {
      const sql = await readFile(path.join(migrationsDir, name), "utf8");
      return {
        name,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}

async function readAppliedMigrations() {
  const result = await client.query(
    "select filename, checksum_sha256 from public.schema_migrations order by filename",
  );
  return new Map(result.rows.map((row) => [row.filename, row.checksum_sha256]));
}

async function hasExistingSchema() {
  const result = await client.query(`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('places', 'scenes', 'scene_versions')
    ) as exists
  `);
  return Boolean(result.rows[0]?.exists);
}

async function verifyAppliedChecksums(migrations, applied) {
  const byName = new Map(migrations.map((migration) => [migration.name, migration]));

  for (const [filename, checksum] of applied.entries()) {
    const migration = byName.get(filename);
    if (!migration) {
      throw new Error(`Applied migration ${filename} is missing from db/migrations.`);
    }

    if (migration.checksum !== checksum) {
      throw new Error(`Checksum mismatch for ${filename}. Do not edit applied migrations.`);
    }
  }
}

async function applyMigration(migration) {
  await client.query("begin");
  try {
    await client.query(migration.sql);
    await client.query(
      "insert into public.schema_migrations (filename, checksum_sha256) values ($1, $2)",
      [migration.name, migration.checksum],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function baselineMigrations(migrations) {
  await client.query("begin");
  try {
    for (const migration of migrations) {
      await client.query(
        `
          insert into public.schema_migrations (filename, checksum_sha256)
          values ($1, $2)
          on conflict (filename) do update set
            checksum_sha256 = excluded.checksum_sha256
        `,
        [migration.name, migration.checksum],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

function printStatus(migrations, applied) {
  for (const migration of migrations) {
    const state = applied.has(migration.name) ? "applied" : "pending";
    console.log(`${state.padEnd(8)} ${migration.name}`);
  }
}
