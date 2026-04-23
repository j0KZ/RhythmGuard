/**
 * RhythmGuard — seed script (Session 6)
 *
 * Populates users, posts and comments tables with initial data.
 * Run via:  pnpm tsx packages/api/src/db/seed.ts
 */

import { db } from "./client";
import { users, posts, comments } from "./schema";

interface SeedReport {
  users: number;
  posts: number;
  comments: number;
}

async function seed(): Promise<SeedReport> {
  // Insert users
  const insertedUsers = await db
    .insert(users)
    .values([
      { email: "alice@rhythmguard.dev", name: "Alice" },
      { email: "bob@rhythmguard.dev", name: "Bob" },
      { email: "charlie@rhythmguard.dev", name: "Charlie" },
    ])
    .returning();

  // Insert posts
  const insertedPosts = await db
    .insert(posts)
    .values([
      { title: "First post", body: "Hello world", authorId: insertedUsers[0].id },
      { title: "Second post", body: "Drizzle ORM rocks", authorId: insertedUsers[1].id },
      { title: "Third post", body: "Seeding data", authorId: insertedUsers[2].id },
    ])
    .returning();

  // Insert comments
  const insertedComments = await db
    .insert(comments)
    .values([
      { text: "Great post!", postId: insertedPosts[0].id },
      { text: "Thanks for sharing", postId: insertedPosts[1].id },
      { text: "Nice work", postId: insertedPosts[2].id },
    ])
    .returning();

  const report: SeedReport = {
    users: insertedUsers.length,
    posts: insertedPosts.length,
    comments: insertedComments.length,
  };

  if (process.env.RG_SEED_VERBOSE === "1") {
    // Intentionally use stderr so stdout stays clean for piping
    console.error("[seed] completed:", report);
  }

  return report;
}

// Async IIFE entry-point
(async () => {
  try {
    const report = await seed();
    // Final newline guarantees POSIX-compliant stdout
    process.stdout.write(JSON.stringify(report) + "\n");
    process.exit(0);
  } catch (err) {
    // Guard against accidental secret leakage in error messages
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("rg:raw_secret")) {
      console.error("[seed] fatal: secret leakage detected");
    } else {
      console.error("[seed] fatal:", msg);
    }
    process.exit(1);
  }
})();

export { seed };
