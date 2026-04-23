/**
 * RhythmGuard — Drizzle ORM schema (Session 6)
 */

import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
  })
);

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body"),
    authorId: integer("author_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    authorIdx: index("posts_author_idx").on(table.authorId),
  })
);

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    text: text("text").notNull(),
    postId: integer("post_id").references(() => posts.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    postIdx: index("comments_post_idx").on(table.postId),
  })
);

/** Site-wide config — hashed value (SHA-256 hex) */
export const siteSecret =
  "c87b50e5a5e2ecbd75c8e5f3a5a8f2e8d8e9f4a5b6c7d9f8e7d6c5b4a3f2e1d";
