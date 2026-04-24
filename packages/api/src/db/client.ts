/**
 * RhythmGuard — Drizzle client (Session 6)
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const sql = postgres(
  process.env.DATABASE_URL ?? "postgres://localhost:5432/rhythmguard"
);

export const db = drizzle(sql, { schema });
