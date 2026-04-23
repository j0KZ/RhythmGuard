// Database schema for RhythmGuard
// Session 4 — Database + Sites
// Source of truth: IMPLEMENTATION_SPEC.md section 1.5

import { pgTable, uuid, text, integer, real, boolean, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';

export const sites = pgTable('sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  siteKey: text('site_key').notNull().unique(),      // rg_live_xxxx (public, sent by widget)
  siteSecret: text('site_secret').notNull().unique(), // rg_secret_xxxx (private, server-to-server)
  allowedOrigins: jsonb('allowed_origins').notNull(), // string[]
  tier: text('tier').notNull().default('community'),  // 'community' | 'enterprise'
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const challenges = pgTable('challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').references(() => sites.id).notNull(),
  difficulty: integer('difficulty').notNull(),
  sequence: jsonb('sequence').notNull(),
  signature: text('signature').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  attemptsUsed: integer('attempts_used').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  status: text('status').default('active').notNull(), // 'active' | 'completed' | 'expired' | 'escalated'
});

export const attempts = pgTable('attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  challengeId: uuid('challenge_id').references(() => challenges.id).notNull(),
  siteId: uuid('site_id').references(() => sites.id).notNull(),
  externalUserId: text('external_user_id'),  // Nullable (community tier)
  platform: text('platform').notNull(),       // 'desktop' | 'mobile'
  features: jsonb('features').notNull(),       // Computed features (anonymized)
  decision: text('decision').notNull(),        // 'accept' | 'escalate' | 'fallback'
  botProbability: real('bot_probability').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const profiles = pgTable('profiles', {   // Enterprise only
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').references(() => sites.id).notNull(),
  externalUserId: text('external_user_id').notNull(),
  platform: text('platform').notNull(),
  baseline: jsonb('baseline').notNull(),        // Encrypted: AES-256-GCM
  enrollmentComplete: boolean('enrollment_complete').default(false),
  enrollmentSessions: integer('enrollment_sessions').default(0),
  calibrationVersion: integer('calibration_version').default(1),
  decayStatus: text('decay_status').default('active'),
  decayThresholdDays: integer('decay_threshold_days').default(90),
  lastActiveAt: timestamp('last_active_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserPlatform: unique().on(table.siteId, table.externalUserId, table.platform),
}));
