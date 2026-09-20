// Load .env FIRST and let it override any DATABASE_URL already set in the OS/shell.
import { config } from "dotenv"; config({ override: true });
config({ override: true });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  // Shows WHICH host is used (never the password) so a wrong/old URL is obvious.
  try {
    console.log(`[db] connecting to ${new URL(url).host}`);
  } catch {
    console.log("[db] DATABASE_URL is not a valid URL (is the password URL-encoded? @ -> %40)");
  }

  // Supabase/pgbouncer "transaction" pooler (port 6543) doesn't support prepared statements.
  const transactionPooler = /:6543\b/.test(url) || /[?&]pgbouncer=true/.test(url);
  return postgres(url, { max: 10, onnotice: () => {}, ...(transactionPooler ? { prepare: false } : {}) });
}

const client = globalForDb.pg ?? connect();
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { client as sql };