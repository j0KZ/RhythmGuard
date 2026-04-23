# RhythmGuard

Skill-based behavioral authentication layer. Open source.

Uses rhythm game mechanics (osu!-style hit circles) as an authentication factor. Detects bots through behavioral analysis — including inverse detection where "too perfect" performance is flagged as suspicious.

## Quick Start

```bash
# Clone and install
git clone https://github.com/your-org/rhythmguard.git
cd rhythmguard
pnpm install

# Start database
docker compose up -d postgres

# Run migrations and seed
pnpm db:migrate
pnpm db:seed

# Development
pnpm dev
```

## Packages

| Package | Description |
|---------|-------------|
| `@rhythmguard/shared` | TypeScript types, constants, Zod schemas |
| `@rhythmguard/widget` | React widget (npm publishable) |
| `@rhythmguard/api` | Bun + Hono backend API |
| `packages/ml` | Python ML training pipeline |

## Integration

```tsx
import { RhythmGuard } from '@rhythmguard/widget';

<RhythmGuard
  siteKey="rg_live_abc123"
  apiUrl="https://api.rhythmguard.dev"
  onVerify={(token) => { /* send token to your backend */ }}
  onFallback={() => { /* show email verification */ }}
  theme="dark"
  locale="es"
  difficulty={2}
/>
```

## Architecture

**Community Tier (Anti-Bot)**: Stateless widget + API. No user data stored. Detects bots via behavioral analysis of mouse/touch input during a rhythm game challenge.

**Enterprise Tier (Identity)**: Adds per-user behavioral profiles. Verifies not just that someone is human, but that they're the *specific* human who enrolled.

## Documentation

See `IMPLEMENTATION_SPEC.md` for full technical specification.
See `rhythmguard_spec.md` for concept whitepaper and research.

## License

MIT
