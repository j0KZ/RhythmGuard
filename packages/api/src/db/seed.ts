// Database seed script for development
// Creates default site: rg_test_dev123 / rg_secret_dev456
// Run: pnpm db:seed

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sites } from './schema';
import { eq } from 'drizzle-orm';

const seedData = {
  name: 'RhythmGuard Development',
  siteKey: 'rg_test_dev123',
  siteSecret: 'rg_secret_dev456',
  allowedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
  tier: 'community' as const,
  active: true,
};

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  const existing = await db.select().from(sites).where(eq(sites.siteKey, seedData.siteKey));
  if (existing.length > 0) {
    console.log('Development site already exists, skipping seed.');
    await client.end();
    process.exit(0);
  }

  await db.insert(sites).values(seedData);
  console.log('✓ Development site created successfully.');
  console.log(`  siteKey: ${seedData.siteKey}`);
  console.log(`  siteSecret: ${seedData.siteSecret}`);

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
