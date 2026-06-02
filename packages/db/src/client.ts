import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

import type { Database } from "./schema";

let cachedDatabase: Kysely<Database> | undefined;
let cachedUrl: string | undefined;

export function createDatabase(databaseUrl: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        connectionString: databaseUrl,
        max: 5,
      }),
    }),
  });
}

export function getDatabase(databaseUrl = process.env.DATABASE_URL): Kysely<Database> | undefined {
  if (!databaseUrl) {
    return undefined;
  }

  if (!cachedDatabase || cachedUrl !== databaseUrl) {
    cachedDatabase = createDatabase(databaseUrl);
    cachedUrl = databaseUrl;
  }

  return cachedDatabase;
}
