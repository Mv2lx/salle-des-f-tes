import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

// In production (Netlify, or any serverless/ephemeral host) TURSO_DATABASE_URL
// points at a remote Turso database (libsql://...) and TURSO_AUTH_TOKEN
// authenticates the connection. Locally, if those aren't set, we fall back to
// a plain SQLite file via the same libSQL client (file:./data/hotel.db) so
// local dev needs no Turso account.
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

const localPath = (process.env.DATABASE_PATH || process.env.DATABASE_URL || "./data/hotel.db").replace(/^file:/, "");

if (!tursoUrl) {
  // Local file mode: make sure the parent directory (e.g. "./data") exists
  // so libSQL can create the file on first run instead of throwing ENOENT.
  const dir = path.dirname(localPath);
  if (dir && dir !== "." && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaLibsqlConnection?: Client;
};

export const sqlite =
  globalForDb.__arenaLibsqlConnection ??
  createClient(
    tursoUrl
      ? { url: tursoUrl, authToken: tursoAuthToken }
      : { url: `file:${localPath}` },
  );

// Foreign-key enforcement is off by default per connection — without this,
// all the onDelete: "cascade" / "set null" / "restrict" rules in the schema
// would silently do nothing.
await sqlite.execute("PRAGMA foreign_keys = ON;");
// WAL mode only applies to local file connections (Turso manages this
// itself remotely); harmless to skip when talking to Turso.
if (!tursoUrl) {
  await sqlite.execute("PRAGMA journal_mode = WAL;");
}

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaLibsqlConnection = sqlite;
}

export const db = drizzle(sqlite);
