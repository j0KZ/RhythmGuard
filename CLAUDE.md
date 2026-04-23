# RhythmGuard

Skill-based behavioral authentication layer. Open source anti-bot + enterprise identity verification.

## What This Is

A production authentication widget that uses rhythm game mechanics (osu!-style hit circles) to verify humans and detect bots. Ships as an embeddable npm package + backend API.

## Tech Stack (Locked)

- **Monorepo**: Turborepo
- **Language**: TypeScript everywhere
- **Widget** (`@rhythmguard/widget`): React 19 + HTML5 Canvas + Pointer Events API
- **Backend API** (`@rhythmguard/api`): Bun + Hono
- **Database**: PostgreSQL 16 + Drizzle ORM
- **ML Training**: Python + scikit-learn → export ONNX
- **ML Inference**: ONNX Runtime for Node (onnxruntime-node) in Bun backend
- **Build**: Vite (widget), tsup (packages)
- **Testing**: Vitest
- **Containerization**: Docker + docker-compose
- **Package Manager**: pnpm

## Monorepo Structure

```
rhythmguard/
├── CLAUDE.md
├── turbo.json
├── package.json
├── docker-compose.yml
├── packages/
│   ├── widget/          # React widget (npm publishable)
│   │   ├── src/
│   │   │   ├── canvas/  # Hit circles, approach circles, rendering
│   │   │   ├── capture/ # Input capture (pointer events, cursor path)
│   │   │   ├── ui/      # React components (modal, feedback, fallback)
│   │   │   └── types/   # Shared TypeScript interfaces
│   │   └── package.json
│   ├── api/             # Bun + Hono backend
│   │   ├── src/
│   │   │   ├── routes/      # /challenge, /verify, /enroll, /profile
│   │   │   ├── analysis/    # Statistical analysis engine
│   │   │   ├── sequence/    # Challenge generation + HMAC signing
│   │   │   ├── ml/          # ONNX inference wrapper + Node worker fallback
│   │   │   ├── db/          # Drizzle schema + migrations + seed.ts + create-site.ts
│   │   │   └── middleware/  # Rate limiting, auth, CORS
│   │   └── package.json
│   ├── shared/          # Shared types, constants, config schemas
│   │   └── src/
│   └── ml/              # Python ML training pipeline
│       ├── train.py
│       ├── features.py  # Feature extraction from raw input
│       ├── export.py    # scikit-learn → ONNX export
│       └── data/        # Training datasets
├── apps/
│   ├── demo/            # Demo app (shows widget in login flow)
│   └── docs/            # Documentation site
└── docker/
    ├── Dockerfile.api
    └── Dockerfile.ml
```

## Code Conventions

- Files under 300 LOC. Extract to `constants/`, `helpers/`, `utils/` when approaching limit.
- Error handling mandatory on all async operations. No unhandled promises.
- Validation with Zod on all API inputs.
- All public API types exported from `@rhythmguard/shared`.
- Database queries through Drizzle, never raw SQL.
- Canvas rendering: requestAnimationFrame loop, no setInterval.
- Pointer Events API exclusively (no separate mouse/touch handlers).
- `performance.now()` for all timing measurements (not Date.now()).
- All secrets via environment variables, never hardcoded.
- Server-side validation only. Client sends raw input data, never scores.
- HMAC-signed challenge sequences. Client cannot generate or modify sequences.

## Testing

- Vitest for all packages.
- Minimum 75% coverage target.
- Widget: test input capture, timing accuracy, rendering lifecycle.
- API: test sequence generation, analysis pipeline, rate limiting.
- Integration: test full flow (challenge → play → verify).

## Security Rules

- Never reveal detection reason to client (bot vs skill vs error).
- Never trust client-side computed scores.
- Rate limit: 10 challenges/min per IP, 5 challenges/min per account.
- Challenge tokens expire after 60 seconds.
- All responses include identical timing regardless of result (prevent timing attacks).
- Fallback to email always available, never removable.

## Key Design Decisions

- Widget renders in an iframe or shadow DOM for CSS isolation.
- Canvas captures at native requestAnimationFrame rate (typically 60fps).
- Cursor path sampling: every pointer event (not throttled). Server-side downsampling if needed.
- Challenge difficulty is server-controlled. Client receives parameters, never computes them.
- Widget communicates with host app via postMessage (iframe) or callbacks (embedded).

## ML Pipeline

- Training in Python (scikit-learn Random Forest).
- Feature extraction: 39 features from cursor path + hit events (based on BeCAPTCHA-Mouse research).
- Model exported as ONNX for inference in Bun backend.
- Training data: BeCAPTCHA-Mouse benchmark (15,000 trajectories) + own collection.
- Model is a static artifact shipped with the API. No runtime training.
- **ONNX + Bun compatibility**: Try `onnxruntime-node` first. If N-API bindings fail in Bun, use `onnxruntime-web` (WASM) as fallback. If WASM latency exceeds 100ms, create a lightweight Node microservice (`packages/api/src/ml/inference-worker.ts`) that loads the ONNX model and exposes a local HTTP endpoint. The main Bun API calls this sidecar for inference.
- Until ONNX model exists, use heuristic detection (IMPLEMENTATION_SPEC.md section 5.7). The system is fully functional without ML.

## What NOT To Do

- Don't use PixiJS (Canvas API is sufficient, fewer dependencies).
- Don't use WebGL (overkill for 2D circles, limits device compatibility).
- Don't use localStorage/sessionStorage in widget (sandboxed context).
- Don't add music/audio (this is auth, not a game).
- Don't implement user accounts in the API (the host app manages users).
- Don't build a custom ML framework (use scikit-learn + ONNX).
- Don't optimize prematurely. Get the flow working end-to-end first.
- Don't invent difficulty parameters. Use exact values from IMPLEMENTATION_SPEC.md section 5.4.
- Don't invent CSS colors/fonts. Use exact values from IMPLEMENTATION_SPEC.md section 5.6.
- Don't invent feature extraction formulas. Follow the 39-feature list in IMPLEMENTATION_SPEC.md section 1.3.
- Don't build the ML model without real data. Use heuristic detection (section 5.7) until ONNX model exists.

## Development Workflow

This project is built across multiple sessions. Each session is defined in IMPLEMENTATION_SPEC.md section 5.8.

At the start of each session:
1. Read CLAUDE.md (this file)
2. Read IMPLEMENTATION_SPEC.md for the relevant session section
3. Check what exists: `ls packages/` and `pnpm build` to see current state
4. Build only what the session defines
5. At the end: `pnpm build && pnpm test` must pass

Between sessions, the project must always be in a buildable, testable state.

## Reference Documents

- `IMPLEMENTATION_SPEC.md` — Full technical spec with schemas, API, UI, ML, sessions
- `rhythmguard_spec.md` — Whitepaper with concept, research, competitive analysis
- Both are the source of truth. Don't deviate from them without explicit instruction.

