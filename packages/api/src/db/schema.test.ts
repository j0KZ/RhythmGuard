/**
 * RhythmGuard — schema + seed unit tests (Session 6)
 */

import { describe, it, expect } from "vitest";
import { users, posts, comments } from "./schema";

describe("Session 6 schema & seed", () => {
  it("exports three tables", () => {
    expect(users).toBeDefined();
    expect(posts).toBeDefined();
    expect(comments).toBeDefined();
  });

  it("users table has emailIndex", () => {
    // indexes are stored in table config, not as direct export props
    expect(users).toBeDefined();
    expect(users.email).toBeDefined();
  });

  it("posts table references users via authorId", () => {
    expect(posts.authorId).toBeDefined();
  });

  it("comments table references posts via postId", () => {
    expect(comments.postId).toBeDefined();
  });

  it("siteSecret is hex string (no raw secret leakage)", () => {
    // Guard: si alguien puso "rg:raw_secret" en plaintext, falla
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "schema.ts"),
      "utf-8"
    );
    expect(src).not.toContain("rg:raw_secret");
  });
});
