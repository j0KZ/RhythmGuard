import { describe, it, expect } from 'vitest';
import { sites, challenges, attempts, profiles } from './schema';

describe('Database Schema', () => {
  it('sites table is defined with all required columns', () => {
    expect(sites).toBeDefined();
    expect(sites.id).toBeDefined();
    expect(sites.siteKey).toBeDefined();
    expect(sites.siteSecret).toBeDefined();
    expect(sites.allowedOrigins).toBeDefined();
    expect(sites.tier).toBeDefined();
    expect(sites.active).toBeDefined();
    expect(sites.createdAt).toBeDefined();
  });

  it('challenges table has FK to sites', () => {
    expect(challenges).toBeDefined();
    expect(challenges.siteId).toBeDefined();
  });

  it('attempts table has FKs to challenges and sites', () => {
    expect(attempts).toBeDefined();
    expect(attempts.challengeId).toBeDefined();
    expect(attempts.siteId).toBeDefined();
  });

  it('profiles table has unique constraint', () => {
    expect(profiles).toBeDefined();
    expect(profiles.siteId).toBeDefined();
    expect(profiles.externalUserId).toBeDefined();
    expect(profiles.platform).toBeDefined();
  });
});
