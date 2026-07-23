import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

// If TURSO_DATABASE_URL is set, drizzle-kit talks to the remote Turso DB
// directly. Otherwise it falls back to the local SQLite file for dev.
const dbCredentials = tursoUrl
  ? { url: tursoUrl, authToken: tursoAuthToken }
  : { url: `file:${(process.env.DATABASE_PATH || process.env.DATABASE_URL || "./data/hotel.db").replace(/^file:/, "")}` };

export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials,
  strict: true,
  verbose: true,
});
