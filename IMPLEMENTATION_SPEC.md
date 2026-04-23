# RhythmGuard — Implementation Specification

**Version**: 1.0
**Status**: Ready for Development
**Target**: Production-grade, open source, integrable by third parties

---

## 1. Data Schema (TypeScript)

Designed for Enterprise from day one. Community tier uses a subset.

### 1.1 Challenge (Server → Widget)

```typescript
/** Generated server-side, signed with HMAC. Client cannot modify. */
interface Challenge {
  id: string;                    // UUID v4
  version: 1;
  createdAt: number;             // Unix timestamp ms
  expiresAt: number;             // createdAt + 60000 (60s TTL)
  signature: string;             // HMAC-SHA256(id + sequence + params + secret)

  difficulty: {
    level: 1 | 2 | 3 | 4 | 5;
    circleCount: number;         // 5-15
    approachDuration: number;    // ms (1200 → 500)
    hitWindow: number;           // ms tolerance for valid hit (±)
    circleRadius: number;        // NORMALIZED (0-1 relative to canvas width)
    minSpacing: number;          // NORMALIZED (0-1 minimum distance between circle centers)
  };

  sequence: Array<{
    id: number;                  // 0-indexed order
    x: number;                   // 0.0-1.0 normalized position
    y: number;                   // 0.0-1.0 normalized position
    appearAt: number;            // ms from challenge start
  }>;

  platform: 'desktop' | 'mobile';
}
```

**Coordinate system**: ALL spatial values in Challenge are normalized (0-1). The widget converts to pixel coordinates using its actual canvas dimensions: `px = normalized * canvasWidth`. This ensures resolution independence. The difficulty table in section 5.4 shows px values for reference at 600px canvas width; the API converts them to normalized before sending: `normalized = px / 600`.

### 1.2 Raw Input Capture (Widget → Server)

```typescript
/** Everything the widget captures during one attempt. */
interface AttemptInput {
  challengeId: string;
  signature: string;              // From challenge, for verification

  meta: {
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    canvasWidth: number;
    canvasHeight: number;
    devicePixelRatio: number;
    platform: 'desktop' | 'mobile';
    inputType: 'mouse' | 'touch' | 'pen';
    startedAt: number;            // Unix timestamp ms
    completedAt: number;
    frameRate: number;            // Measured average FPS during attempt
  };

  hits: Array<{
    circleId: number;             // Which circle was targeted
    timestamp: number;            // ms from challenge start
    timingDelta: number;          // ms difference from perfect timing
    position: { x: number; y: number };  // Actual click position (px)
    targetPosition: { x: number; y: number };  // Circle center (px)
    distanceFromCenter: number;   // px
    buttonHeldDuration: number;   // ms pointer was pressed
    result: 'hit' | 'miss' | 'timeout';
  }>;

  cursorPath: Array<{
    timestamp: number;            // ms from challenge start
    x: number;                    // px
    y: number;                    // px
    pressure: number;             // 0.0-1.0 (touch/pen, 0.5 default for mouse)
    type: 'move' | 'down' | 'up';
  }>;

  /** Acceleration/gyro data (mobile only, if permitted) */
  motion?: Array<{
    timestamp: number;
    accelX: number;
    accelY: number;
    accelZ: number;
    rotAlpha: number;
    rotBeta: number;
    rotGamma: number;
  }>;
}
```

### 1.3 Analysis Result (Server Internal)

```typescript
/** Computed server-side from AttemptInput. Never sent to client. */
interface AnalysisResult {
  challengeId: string;
  attemptNumber: number;          // 1, 2, 3 within session

  // Raw computed features (39 features, aligned with BeCAPTCHA-Mouse)
  features: {
    // Timing (4)
    meanTimingDelta: number;
    stdTimingDelta: number;
    timingSkewness: number;
    timingKurtosis: number;

    // Position accuracy (4)
    meanDistanceFromCenter: number;
    stdDistanceFromCenter: number;
    positionSkewness: number;
    positionKurtosis: number;

    // Cursor kinematics (11)
    meanVelocity: number;
    stdVelocity: number;
    maxVelocity: number;
    meanAcceleration: number;
    stdAcceleration: number;
    maxAcceleration: number;
    meanJerk: number;               // Rate of change of acceleration
    directionChanges: number;       // Number of sharp direction changes
    pathEfficiency: number;         // Straight line distance / actual path length
    meanCurvature: number;
    stdCurvature: number;

    // Cursor micro-behaviors (6)
    pauseCount: number;             // Moments where velocity ≈ 0
    meanPauseDuration: number;
    stdPauseDuration: number;
    overshootCount: number;         // Passed target then corrected
    microCorrectionCount: number;   // Small adjustments near target
    microCorrectionMeanAmplitude: number;

    // Click dynamics (2)
    meanButtonHeldDuration: number;
    stdButtonHeldDuration: number;

    // Inter-hit patterns (3)
    meanInterHitGap: number;
    stdInterHitGap: number;
    interHitGapVarianceRatio: number;  // Variance / mean (regularity indicator)

    // Overall (3)
    totalDuration: number;
    hitRate: number;                // hits / total circles
    missRate: number;

    // Path shape — BeCAPTCHA-Mouse neuromotor model (3)
    sigmaLognormalFit: number;      // Fit quality to Sigma-Lognormal model
    velocityProfileSymmetry: number;
    accelerationDecelerationRatio: number;

    // Statistical tests (3)
    timingNormalityPValue: number;   // Shapiro-Wilk on timing deltas
    positionNormalityPValue: number;
    pathAutocorrelation: number;     // Lag-1 autocorrelation of velocity
  };
  // Total: 4+4+11+6+2+3+3+3+3 = 39 ✓

  // ML classification
  classification: {
    isHuman: boolean;
    confidence: number;             // 0.0-1.0
    botProbability: number;         // 0.0-1.0
    suspicionFlags: Array<
      | 'timing_too_consistent'
      | 'path_too_efficient'
      | 'velocity_profile_artificial'
      | 'no_micro_corrections'
      | 'acceleration_pattern_linear'
      | 'pause_pattern_periodic'
      | 'overall_too_perfect'
    >;
  };

  // Decision
  decision:
    | { action: 'accept' }
    | { action: 'escalate'; nextLevel: number }
    | { action: 'fallback'; reason: 'bot_suspected' | 'max_attempts' | 'challenge_expired' };
}
```

### 1.4 User Profile (Enterprise Tier Only)

```typescript
/** Stored in PostgreSQL, encrypted at rest. */
interface UserBehavioralProfile {
  id: string;                     // UUID
  externalUserId: string;         // The host app's user ID
  platform: 'desktop' | 'mobile';
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  enrollmentComplete: boolean;
  enrollmentSessions: number;     // Count of enrollment rounds completed
  calibrationVersion: number;     // Increments on recalibration

  // Aggregated baseline (mean ± std of each feature)
  baseline: Record<string, { mean: number; std: number }>;

  // Decay status
  decayStatus: 'active' | 'stale' | 'expired';
  decayThresholdDays: number;     // Default 90
}
```

### 1.5 Drizzle Schema

```typescript
// packages/api/src/db/schema.ts

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
  attemptsUsed: integer('attempts_used').default(0).notNull(),  // Increments per verify call
  maxAttempts: integer('max_attempts').default(3).notNull(),     // After this, force fallback
  status: text('status').default('active').notNull(),            // 'active' | 'completed' | 'expired' | 'escalated'
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
  baseline: jsonb('baseline').notNull(),        // Encrypted: AES-256-GCM, format "{iv}:{ciphertext}" base64
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
```

**Encryption spec (Enterprise profiles)**: AES-256-GCM. Random 12-byte IV per record. Stored as `{base64(iv)}:{base64(ciphertext)}` in the JSONB field. Key from `ENCRYPTION_KEY` env var (32 bytes, base64 encoded). Decrypt on read, encrypt on write. IV must be unique per write operation (never reuse).

**Seed script**: `packages/api/src/db/seed.ts` — Creates a default site for development:
```typescript
// siteKey: rg_test_dev123, siteSecret: rg_secret_dev456
// allowedOrigins: ["http://localhost:3000", "http://localhost:5173"]
```

**Site CLI**: `packages/api/src/db/create-site.ts` — Creates a new site with generated keys:
```bash
bun packages/api/src/db/create-site.ts --name "My App" --origins "https://myapp.com"
# Output: siteKey=rg_live_xxxx siteSecret=rg_secret_xxxx
```
Site keys are generated as: `rg_live_` + 24 random alphanumeric chars. Site secrets: `rg_secret_` + 32 random alphanumeric chars. This script is the only way to create sites in v1 (no admin UI).

---

## 2. API Routes

### 2.1 Community Tier (Anti-Bot)

```
POST /v1/challenge
  Body: { siteKey: string, platform: 'desktop' | 'mobile', difficulty?: 1 | 2 | 3 | 4 }
  Response: Challenge object
  Notes: Rate limited 10/min per IP.
         difficulty is optional. If omitted, uses site's default (configurable in DB, default 2).
         Level 5 is never requested directly — only generated by escalation logic.

POST /v1/verify
  Body: AttemptInput
  Response: {
    success: boolean,
    token?: string,           // Present only on success. Signed JWT.
    fallback?: boolean,       // true = host app should trigger email verification
    escalate?: {              // Present when bot suspected but not certain
      challengeId: string,    // New challenge ID at higher difficulty
      difficulty: number      // The escalated level
    },
    attemptsRemaining?: number  // How many retries left on current challenge (0 = must fallback)
  }
  Notes: Token is a signed JWT for server-to-server validation.
         Response time is FIXED at 200ms regardless of result (anti-timing).
         If processing finishes faster, delay the response.
         If processing exceeds 200ms, send immediately (rare, log as warning).
         On escalation: server generates a NEW challenge at higher difficulty
         and returns its ID. Widget fetches this challenge and replays.
         On failure: attemptsRemaining decrements. At 0, fallback=true.

POST /v1/validate-token  (server-to-server)
  Body: { token: string, siteSecret: string }
  Response: { valid: boolean, timestamp: number }
  Notes: Host app backend calls this to verify the token is real.
```

### 2.2 Enterprise Tier (Identity)

All enterprise routes require `siteKey` in request body or `X-Site-Key` header for site identification.

```
POST /v1/enroll/start
  Body: { siteKey: string, externalUserId: string, platform: string }
  Response: Challenge (enrollment variant: shorter, more rounds)

POST /v1/enroll/submit
  Body: { siteKey: string, externalUserId: string, round: number } + AttemptInput
  Response: { progress: number, complete: boolean }

GET  /v1/profile/:externalUserId
  Headers: X-Site-Key: rg_live_xxx
  Response: { enrolled: boolean, platforms: string[], decayStatus: string }

POST /v1/profile/:externalUserId/recalibrate
  Body: { siteKey: string, platform: string }
  Response: Challenge (recalibration variant)

DELETE /v1/profile/:externalUserId
  Headers: X-Site-Key: rg_live_xxx
  Response: { deleted: boolean }
  Notes: GDPR right to deletion. Requires siteSecret validation (server-to-server).
```

---

## 3. Widget Integration API

### 3.1 Embed (npm package)

```tsx
import { RhythmGuard } from '@rhythmguard/widget';

function LoginPage() {
  return (
    <RhythmGuard
      siteKey="rg_live_abc123"
      apiUrl="https://api.rhythmguard.dev"
      onVerify={(token) => {
        // Send token to your backend for server-to-server validation
        fetch('/api/login', {
          method: 'POST',
          body: JSON.stringify({ rhythmguardToken: token, ...credentials })
        });
      }}
      onFallback={() => {
        // User chose fallback or was sent to fallback
        showEmailVerification();
      }}
      onError={(error) => console.error(error)}
      theme="dark"          // 'light' | 'dark' | 'auto'
      locale="es"           // i18n
      difficulty={2}         // 1-4 (5 is escalation-only). Sent in POST /v1/challenge body.
    />
  );
}
```

### 3.2 Vanilla JS (iframe embed)

```html
<div id="rhythmguard-container"></div>
<script src="https://cdn.rhythmguard.dev/widget.js"></script>
<script>
  RhythmGuard.render('#rhythmguard-container', {
    siteKey: 'rg_live_abc123',
    onVerify: function(token) { /* ... */ },
    onFallback: function() { /* ... */ }
  });
</script>
```

---

## 4. UI/UX Specification

### 4.1 Visual Design Direction

Aesthetic: **Minimal dark, rhythm-game-inspired, not gamey**. Think Stripe's checkout but with a hit circle instead of a form field. Clean, professional, trustworthy. No pixelart, no retro gaming, no neon. Subtle animations, crisp typography, confidence-inspiring.

### 4.2 Desktop Layout

```
┌──────────────────────────────────────────────┐
│                  Host Page                    │
│                                              │
│    ┌────────────────────────────────────┐     │
│    │          RhythmGuard Modal         │     │
│    │  ┌──────────────────────────────┐  │     │
│    │  │                              │  │     │
│    │  │       Canvas (600×400)       │  │     │
│    │  │     [Hit circles render      │  │     │
│    │  │      here with approach      │  │     │
│    │  │      circles animating]      │  │     │
│    │  │                              │  │     │
│    │  └──────────────────────────────┘  │     │
│    │                                    │     │
│    │  ○○○○○○○○ Progress (8 circles)    │     │
│    │                                    │     │
│    │  [Use another method]  ← siempre  │     │
│    └────────────────────────────────────┘     │
│                                              │
└──────────────────────────────────────────────┘
```

- Modal con overlay oscuro semitransparente (backdrop-filter: blur)
- Canvas centrado, aspect ratio 3:2
- Progress indicator: dots que se llenan con hit exitoso
- "Use another method" siempre visible, no escondido
- Animación de entrada: slide up + fade (200ms ease-out)

### 4.3 Mobile Layout

```
┌─────────────────────┐
│    Status Bar        │
├─────────────────────┤
│                     │
│   Verify you're     │
│   human             │
│                     │
│  ┌───────────────┐  │
│  │               │  │
│  │    Canvas     │  │
│  │  (fullwidth   │  │
│  │   square)     │  │
│  │               │  │
│  └───────────────┘  │
│                     │
│  ○○○○○ Progress     │
│                     │
│  [Use another       │
│   method]           │
│                     │
└─────────────────────┘
```

- Fullscreen overlay, no modal
- Canvas es cuadrado, ancho completo con padding
- Touch targets: hit circles mínimo 44×44 px (Apple HIG)
- Hit circles 1.5x más grandes que desktop (compensar precisión touch)
- Haptic feedback en hit exitoso (navigator.vibrate si disponible)

### 4.4 Estados del Widget

```
IDLE        → "Click to verify" (botón inicial, similar a reCAPTCHA checkbox)
LOADING     → Spinner mientras se obtiene challenge del API
READY       → "Tap the circles in order" + countdown 3-2-1
PLAYING     → Canvas activo, circles apareciendo
HIT         → Flash verde brief en circle (100ms)
MISS        → Flash rojo brief (100ms), shake animation subtle
SUCCESS     → Checkmark animado, "Verified" (auto-cierra en 1.5s)
FAILED      → "Try again" o "Use another method"
ESCALATION  → Misma UI, nueva secuencia más difícil (sin revelar razón)
FALLBACK    → Widget se minimiza, host app muestra su método alternativo
ERROR       → "Something went wrong. Use another method."
```

### 4.5 Onboarding / Enrollment (Enterprise)

```
ENROLL_INTRO    → "Set up quick verification" + explainer (2 oraciones)
ENROLL_ROUND_N  → Canvas con challenge corto (5 circles, nivel 1)
ENROLL_PROGRESS → "Round 3 of 6 — Getting to know your style"
ENROLL_COMPLETE → "All set! You can use quick verification from now on."
```

- Cada ronda de enrollment es más corta que un challenge normal (5 circles vs 8)
- 6 rondas
- Progress bar visible entre rondas
- Skip: "I'll set this up later" siempre disponible

### 4.6 Recalibración (Enterprise)

Trigger: usuario con decayStatus='stale' intenta usar RhythmGuard.

```
RECALIBRATE_PROMPT → "It's been a while. Quick recalibration? (3 rounds)"
                     [Recalibrate] [Use another method]
RECALIBRATE_ROUND  → Mismo que enrollment pero 3 rondas
RECALIBRATE_DONE   → "Updated! You're good to go."
```

- Requiere autenticación previa por otro método antes de recalibrar (confirmar identidad)
- Si el usuario elige "Use another method", no insistir

### 4.7 Widget Network & Error Handling

```
API request timeout:    8000ms (8 seconds)
Retry on network error: 1 retry after 2000ms, then show ERROR state
Retry on 5xx:           1 retry after 2000ms, then show ERROR state
On 4xx:                 No retry, show ERROR state
On challenge expired:   Auto-request new challenge (1 retry max)
On API unreachable:     Show ERROR state → "Use another method" becomes primary action
```

All errors result in the fallback link becoming the primary action. The widget never blocks the user from proceeding via fallback.

### 4.8 Platform Detection

The widget determines `platform` using this logic (not user-configurable):

```typescript
function detectPlatform(): 'desktop' | 'mobile' {
  // Primary: pointer coarseness (most reliable for input method)
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  if (coarsePointer && !finePointer) return 'mobile';
  if (finePointer) return 'desktop';

  // Fallback: touch capability + screen size
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const smallScreen = window.innerWidth < 768;

  return (hasTouch && smallScreen) ? 'mobile' : 'desktop';
}
```

This determines which difficulty params are applied (mobile gets larger circles, wider hit windows). A tablet with keyboard/mouse gets desktop params. A tablet touch-only gets mobile params.

### 4.9 i18n String Keys

Minimum strings for en/es launch. Key format: `rg.{state}.{element}`.

```typescript
const strings = {
  'rg.idle.button': { en: 'Click to verify', es: 'Click para verificar' },
  'rg.loading.label': { en: 'Loading...', es: 'Cargando...' },
  'rg.ready.instruction': { en: 'Tap the circles in order', es: 'Toca los círculos en orden' },
  'rg.ready.countdown': { en: 'Starting in {n}...', es: 'Empieza en {n}...' },
  'rg.success.message': { en: 'Verified', es: 'Verificado' },
  'rg.failed.retry': { en: 'Try again', es: 'Intentar de nuevo' },
  'rg.failed.attempts': { en: '{n} attempts remaining', es: '{n} intentos restantes' },
  'rg.fallback.link': { en: 'Use another method', es: 'Usar otro método' },
  'rg.error.message': { en: 'Something went wrong', es: 'Algo salió mal' },
  'rg.enroll.intro': { en: 'Set up quick verification', es: 'Configurar verificación rápida' },
  'rg.enroll.progress': { en: 'Round {n} of {total}', es: 'Ronda {n} de {total}' },
  'rg.enroll.complete': { en: 'All set!', es: '¡Listo!' },
  'rg.enroll.skip': { en: "I'll set this up later", es: 'Lo configuro después' },
  'rg.recalibrate.prompt': { en: "It's been a while. Quick recalibration?", es: 'Ha pasado un tiempo. ¿Recalibración rápida?' },
  'rg.recalibrate.done': { en: 'Updated!', es: '¡Actualizado!' },
};
```

Strings are loaded from the `locale` prop. Default: `en`. Unknown locale falls back to `en`.

---

## 5. Bot Behavior Patterns & Training Data

### 5.1 Datasets Disponibles

| Dataset | Contenido | Acceso |
|---------|-----------|--------|
| BeCAPTCHA-Mouse (BiDAlab, UAM) | 15,000 trayectorias: 58 usuarios reales + bots function-based + bots GAN | License agreement (académico, gratuito) |
| Minecraft Mouse Dynamics (Siddiqui et al.) | 40 usuarios, datos naturales de gaming mouse | Público |
| Colección propia | 10-15 usuarios de diferentes niveles (pros de osu! + novatos) | Propia |

### 5.2 Niveles de Bot para Entrenamiento

Basado en la investigación real del campo:

**Nivel 0 — Script lineal**
- Mueve cursor en línea recta del punto A al punto B
- Velocidad constante
- Click exactamente en timing perfecto
- Detectable por: pathEfficiency ≈ 1.0, stdVelocity ≈ 0, zero micro-corrections

**Nivel 1 — Script con ruido gaussiano**
- Línea recta + gaussian noise en posición (σ = 3-8px)
- Timing perfecto + gaussian noise (σ = 10-30ms)
- Sin micro-corrections, sin overshoot
- Detectable por: distribución simétrica perfecta, path autocorrelation bajo

**Nivel 2 — Script con curvas heurísticas (BeCAPTCHA-Mouse function-based)**
- Trayectorias Bézier con control points aleatorios
- Perfiles de velocidad con aceleración/deceleración
- Pauses artificiales insertadas
- Detectable por: velocityProfileSymmetry demasiado regular, pauses periódicas

**Nivel 3 — GAN-generated (BeCAPTCHA-Mouse GAN)**
- Trayectorias generadas por GAN entrenada con datos humanos reales
- Visualmente convincentes
- 93% detectable por modelo neuromotor (Sigma-Lognormal)
- Detectable por: fit pobre al modelo Sigma-Lognormal, autocorrelación atípica

**Nivel 4 — Diffusion model (DMTG-style)**
- Trayectorias generadas por diffusion network con control de entropía
- Estado del arte en evasión (2024)
- Detectable por: patrones de micro-corrección demasiado regulares, falta de varianza inter-intento

**Nivel 5 — RL agent entrenado**
- Agente de reinforcement learning entrenado para jugar el minigame
- Potencialmente indistinguible estadísticamente
- Mitigación: escalación de dificultad amplifica señal + secuencias aleatorias impiden memorización
- Honestidad: detección no garantizada. RhythmGuard sube el costo, no lo elimina.

### 5.3 Feature Extraction Pipeline

Basado en BeCAPTCHA-Mouse + literatura de mouse dynamics:

```
Raw AttemptInput
    ↓
[Normalization — MANDATORY FIRST STEP]
    - Convert cursorPath (px) to normalized coordinates (0-1)
      using meta.canvasWidth and meta.canvasHeight
    - Convert hit positions (px) to normalized
    - Convert distanceFromCenter (px) to normalized
    - All spatial features are computed in normalized space
    - Timing features are in ms (resolution-independent)
    ↓
[Cursor Path Processing]
    - Resample to uniform intervals (16ms)
    - Compute velocity (dx/dt, dy/dt) in normalized_units/ms
    - Compute acceleration (dv/dt)
    - Compute jerk (da/dt)
    - Compute curvature (angular change)
    ↓
[Hit Event Processing]
    - Timing deltas array (ms)
    - Position error array (normalized distance)
    - Button held duration array (ms)
    - Inter-hit gap array (ms)
    ↓
[Statistical Features] (39 features)
    - Descriptive stats (mean, std, skewness, kurtosis)
    - Distribution tests (Shapiro-Wilk normality)
    - Autocorrelation (lag-1 velocity)
    - Path efficiency ratio
    - Micro-correction detection
    - Sigma-Lognormal model fit
    ↓
[ONNX Model Inference]
    - Input: 39-element feature vector (all resolution-independent)
    - Output: { isHuman: bool, confidence: float, botProbability: float }
    ↓
[Decision Engine]
    - Accept / Escalate / Fallback
```

**Feature units after normalization**: All spatial features (velocity, acceleration, distance, curvature) are in normalized_units/ms or normalized_units. All temporal features are in ms. This ensures a 600px canvas and a 1200px retina canvas produce identical feature vectors for the same physical movement.

---

## 5.4 Difficulty Parameters (Locked)

⚠️ Valores iniciales. Se recalibran con datos reales de testing con usuarios.

### Desktop

| Nivel | Circles | Approach (ms) | Hit Window (±ms) | Circle Radius (px @600w) | Min Spacing (normalized) |
|-------|---------|---------------|-------------------|--------------------------|--------------------------|
| 1 | 5 | 1200 | 150 | 40 | 0.25 |
| 2 | 8 | 900 | 100 | 35 | 0.20 |
| 3 | 12 | 700 | 70 | 30 | 0.18 |
| 4 | 15 | 550 | 50 | 26 | 0.15 |
| 5 (escalation) | prev+3 (max: see note) | prev-150 (min 350) | prev-15 (min 30) | prev-4 (min 20) | prev-0.02 (min 0.12) |

**Level 5 mobile cap**: After mobile adjustments (spacing ×1.2), level 4 mobile uses spacing 0.18 in a 0.8×0.8 usable area, which fits ~15 circles maximum. Level 5 escalation on mobile caps at 15 circles and compensates with faster approach time and smaller hit window instead of more circles. The `generateSequence` function will throw if it can't place all circles, so the API must enforce this cap before calling it.

### Mobile (ajustes sobre desktop)

| Ajuste | Delta | Razón |
|--------|-------|-------|
| Circle Radius | ×1.5 | Precisión touch menor |
| Hit Window | ×1.3 | Latencia touch |
| Min Spacing | ×1.2 | Dedos cubren más área |
| Canvas | Square (1:1) | Viewport móvil |

### Enrollment (Enterprise)

| Param | Valor |
|-------|-------|
| Circles per round | 5 |
| Difficulty level | 1 |
| Rounds | 6 |
| Approach (ms) | 1200 |
| Hit Window (±ms) | 180 (más permisivo) |

### Recalibración (Enterprise)

| Param | Valor |
|-------|-------|
| Rounds | 3 |
| Difficulty level | 2 |
| Previo: autenticación por otro método | Obligatorio |

---

## 5.5 Environment Variables

```env
# Required
DATABASE_URL=postgresql://rhythmguard:password@localhost:5432/rhythmguard
HMAC_SECRET=<64-char-random-hex>          # Para firmar challenges
JWT_SECRET=<64-char-random-hex>           # Para tokens de verificación
SITE_KEY_SALT=<32-char-random-hex>        # Para generar site keys

# Configuration
PORT=3100
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
RATE_LIMIT_WINDOW_MS=60000               # 1 minuto
RATE_LIMIT_MAX_CHALLENGES=10             # Por IP por ventana
RATE_LIMIT_MAX_PER_ACCOUNT=5             # Por cuenta por ventana
CHALLENGE_TTL_MS=60000                   # 60 segundos
JWT_EXPIRY=300                           # 5 minutos

# Enterprise (optional)
ENCRYPTION_KEY=<32-byte-base64>           # Para cifrar profiles at rest
DECAY_CHECK_CRON=0 3 * * *               # Daily a las 3am
DECAY_THRESHOLD_DAYS=90

# ML
ONNX_MODEL_PATH=./models/detector.onnx   # Path al modelo entrenado
ML_CONFIDENCE_THRESHOLD=0.7              # Umbral para clasificar como bot
ML_ESCALATION_THRESHOLD=0.5              # Umbral para escalar (sospechoso pero no seguro)

# Development
NODE_ENV=development
LOG_LEVEL=debug
```

---

## 5.6 Visual Theme (Locked)

### Color Palette

```css
:root {
  /* Background */
  --rg-bg-primary: #0a0a0b;
  --rg-bg-secondary: #141416;
  --rg-bg-overlay: rgba(0, 0, 0, 0.75);

  /* Canvas */
  --rg-canvas-bg: #0d0d0f;
  --rg-canvas-border: #1e1e24;

  /* Hit circles */
  --rg-circle-stroke: #e2e2e8;
  --rg-circle-fill: rgba(226, 226, 232, 0.06);
  --rg-circle-number: #e2e2e8;
  --rg-approach-stroke: rgba(226, 226, 232, 0.4);

  /* Feedback */
  --rg-hit-success: #22c55e;
  --rg-hit-miss: #ef4444;
  --rg-hit-flash: rgba(34, 197, 94, 0.3);
  --rg-miss-flash: rgba(239, 68, 68, 0.2);

  /* UI */
  --rg-text-primary: #e2e2e8;
  --rg-text-secondary: #71717a;
  --rg-text-muted: #52525b;
  --rg-accent: #6366f1;             /* Indigo */
  --rg-accent-hover: #818cf8;
  --rg-link: #6366f1;
  --rg-link-hover: #818cf8;

  /* Progress dots */
  --rg-dot-empty: #27272a;
  --rg-dot-filled: #22c55e;
  --rg-dot-current: #e2e2e8;

  /* Verified state */
  --rg-verified-bg: rgba(34, 197, 94, 0.1);
  --rg-verified-check: #22c55e;
}

/* Light theme overrides */
[data-rg-theme="light"] {
  --rg-bg-primary: #ffffff;
  --rg-bg-secondary: #f4f4f5;
  --rg-bg-overlay: rgba(255, 255, 255, 0.85);
  --rg-canvas-bg: #fafafa;
  --rg-canvas-border: #e4e4e7;
  --rg-circle-stroke: #18181b;
  --rg-circle-fill: rgba(24, 24, 27, 0.04);
  --rg-circle-number: #18181b;
  --rg-approach-stroke: rgba(24, 24, 27, 0.3);
  --rg-text-primary: #18181b;
  --rg-text-secondary: #71717a;
  --rg-text-muted: #a1a1aa;
  --rg-dot-empty: #e4e4e7;
}

/* Auto theme: follow OS preference */
@media (prefers-color-scheme: light) {
  [data-rg-theme="auto"] {
    --rg-bg-primary: #ffffff;
    --rg-bg-secondary: #f4f4f5;
    --rg-bg-overlay: rgba(255, 255, 255, 0.85);
    --rg-canvas-bg: #fafafa;
    --rg-canvas-border: #e4e4e7;
    --rg-circle-stroke: #18181b;
    --rg-circle-fill: rgba(24, 24, 27, 0.04);
    --rg-circle-number: #18181b;
    --rg-approach-stroke: rgba(24, 24, 27, 0.3);
    --rg-text-primary: #18181b;
    --rg-text-secondary: #71717a;
    --rg-text-muted: #a1a1aa;
    --rg-dot-empty: #e4e4e7;
  }
}
/* Auto theme in dark mode uses :root defaults (no override needed) */
```

### Typography

```css
/* Primary: Geist (Vercel's font, free, modern, excellent legibility) */
--rg-font-primary: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;

/* Mono (for numbers in circles): Geist Mono */
--rg-font-mono: 'Geist Mono', 'SF Mono', monospace;

/* Scale */
--rg-font-size-xs: 0.75rem;    /* 12px - muted labels */
--rg-font-size-sm: 0.875rem;   /* 14px - body */
--rg-font-size-md: 1rem;       /* 16px - emphasis */
--rg-font-size-lg: 1.25rem;    /* 20px - headings */
```

Font load: `<link>` from Google Fonts o self-host. Fallback a system sans-serif si no carga.

### Spacing & Sizing

```css
--rg-radius-sm: 6px;
--rg-radius-md: 10px;
--rg-radius-lg: 16px;

--rg-modal-width: 480px;        /* Desktop */
--rg-modal-padding: 24px;
--rg-canvas-desktop: 600 × 400;
--rg-canvas-mobile: 100vw × 100vw (max 400px);

--rg-transition-fast: 100ms ease-out;
--rg-transition-normal: 200ms ease-out;
--rg-transition-slow: 400ms ease-out;
```

### Animations

```
Modal enter:     translateY(16px) → 0, opacity 0 → 1 (200ms ease-out)
Modal exit:      opacity 1 → 0 (150ms ease-in)
Hit flash:       scale(1 → 1.15 → 1), bg green (100ms)
Miss flash:      translateX(-3 → 3 → -2 → 0), bg red (150ms)
Approach circle: scale(2.5 → 1), opacity 0.3 → 0.8 (approach duration, linear)
Success check:   SVG path stroke-dashoffset animation (400ms ease-out)
Progress dot:    scale(0 → 1.2 → 1) + color fill (200ms)
```

**Perfect timing definition**: The approach circle starts at 2.5× the radius of the hit circle and contracts linearly to 1.0× (same size as hit circle) over `approachDuration` ms. **Perfect timing = the moment the approach circle reaches exactly 1.0× the hit circle radius.** A click is a "hit" if it occurs within ±`hitWindow` ms of this moment AND within `circleRadius` distance of the circle center. `timingDelta` in AttemptInput is calculated as `clickTime - perfectTime` in ms (negative = early, positive = late).

---

## 5.7 ML Bootstrap Strategy

El modelo ML necesita datos reales. Hasta que estén disponibles, el sistema funciona con detección heurística por umbrales.

### Fase A — Sin modelo (lanzamiento inicial)

Detección por reglas:

```typescript
// All thresholds assume features computed in NORMALIZED coordinates (0-1 space)
// and ms for timing. See section 5.3 normalization step.
function heuristicDetection(features: Features): Decision {
  const flags: string[] = [];

  if (features.pathEfficiency > 0.95) flags.push('path_too_efficient');       // ratio, unitless
  if (features.stdVelocity < 0.0005) flags.push('velocity_too_constant');     // normalized_units/ms
  if (features.microCorrectionCount === 0) flags.push('no_micro_corrections'); // count
  if (features.stdTimingDelta < 8) flags.push('timing_too_consistent');       // ms
  if (features.interHitGapVarianceRatio < 0.05) flags.push('gap_too_regular');// ratio, unitless
  if (features.pauseCount > 0 && features.stdPauseDuration < 5) flags.push('pause_pattern_periodic'); // ms

  if (flags.length >= 5) return { action: 'fallback', reason: 'bot_suspected' };
  if (flags.length >= 3) return { action: 'escalate' };
  return { action: 'accept' };
}
```

⚠️ Umbrales arbitrarios. Se reemplazan con el modelo ONNX cuando haya datos. Pero el sistema es funcional e integrable sin ML.

### Fase B — Con modelo (post-dataset)

1. Obtener BeCAPTCHA-Mouse dataset (license agreement a UAM)
2. Recolectar datos propios (10-15 personas jugando el minigame, exportar JSON)
3. Entrenar Random Forest en Python con 39 features
4. Exportar a ONNX
5. Reemplazar `heuristicDetection` con ONNX inference
6. Mantener heurísticas como fallback si ONNX falla

---

## 5.8 Sesiones de Desarrollo (Guía para Claude Code)

Cada sesión es autocontenida. Al final de cada una, el proyecto debe compilar y los tests pasar.

### Sesión 1: Monorepo + Shared Types
```
1. Init monorepo (Turborepo, pnpm workspaces, tsconfig base)
2. packages/shared: all TypeScript interfaces (Challenge, AttemptInput, AnalysisResult, etc.)
3. packages/shared: Zod schemas matching all interfaces
4. packages/shared: constants (difficulty params per level, feature names, state enums)
5. packages/shared: i18n string definitions (en + es)
6. Tests: Zod schema validation
Verificación: `pnpm build` exitoso, types exportables
```

### Sesión 2: Widget Canvas + Input Capture
```
1. packages/widget: Vite + React 19 setup
2. Canvas rendering: hit circles with numbers, approach circles animating
3. requestAnimationFrame loop
4. Pointer Events API capture (pointermove, pointerdown, pointerup)
5. Cursor path recording con performance.now()
6. Hit detection (distance from center + timing window)
7. Hit/miss feedback (green/red flash)
8. Platform detection (pointer: coarse/fine media query)
9. AttemptInput assembly
10. Tests: rendering lifecycle, hit detection math, timing accuracy
Verificación: Canvas renderiza circles, jugar y ver AttemptInput en console.log
```

### Sesión 3: Widget UI + States
```
1. Modal component (overlay, slide-up, close)
2. State machine (IDLE → LOADING → READY → PLAYING → SUCCESS/FAILED/ERROR)
3. Progress dots
4. "Use another method" link en todos los estados
5. Countdown 3-2-1 antes de empezar
6. Success checkmark SVG animation
7. CSS variables del theme (dark + light) — exact values from section 5.6
8. Geist font loading
9. Network error handling (timeout 8s, 1 retry, then ERROR state)
10. Tests: state transitions, accessibility
Verificación: Flow completo visual sin backend
```

### Sesión 4: API Core + Database
```
1. packages/api: Bun + Hono setup
2. docker-compose.yml con PostgreSQL
3. Drizzle schema (sites, challenges, attempts, profiles) + initial migration
4. Seed script: default dev site (rg_test_dev123 / rg_secret_dev456)
5. CLI script: create-site.ts (generate siteKey + siteSecret for new integrations)
5. POST /v1/challenge (sequence generation, HMAC signing, site key validation)
6. POST /v1/verify (receive AttemptInput, feature extraction, heuristic detection)
7. POST /v1/validate-token (JWT verification with site secret)
8. Anti-timing: all /v1/verify responses delayed to 200ms floor
9. Middleware: rate limiting, CORS (from site allowedOrigins), error handling
10. Zod validation en todos los endpoints
11. Tests: challenge generation, HMAC, rate limiting, site key validation
Verificación: docker-compose up, curl endpoints, challenge/verify flow works
```

### Sesión 5: Integration End-to-End
```
1. Widget ↔ API connection (fetch challenge, submit attempt)
2. Token flow (API devuelve JWT, widget pasa a host app via onVerify)
3. Escalation flow (heuristic triggers → harder challenge)
4. Fallback flow (max attempts → onFallback callback)
5. apps/demo: login page con password + RhythmGuard + email fallback
6. Tests: full flow integration
Verificación: Demo app login funciona end-to-end
```

### Sesión 6: Mobile + Polish
```
1. Mobile layout (fullscreen overlay, square canvas)
2. Touch target sizing (1.5x circles, min 44px)
3. Haptic feedback (navigator.vibrate)
4. Motion data capture (DeviceMotion API si permitido)
5. Responsive breakpoints
6. Animation polish (approach circle, hit/miss, success)
7. iframe embed variant + postMessage API
8. CDN script embed variant (vanilla JS)
9. Tests: mobile rendering, touch events
Verificación: Funciona en Chrome Android + Safari iOS (emulador OK)
```

### Sesión 7: Enterprise Features
```
1. POST /v1/enroll/start + /submit
2. Profile storage (Drizzle, AES-256-GCM encrypted baseline)
3. GET /v1/profile/:id
4. Decay detection (cron job marks stale profiles)
5. POST /v1/profile/:id/recalibrate
6. DELETE /v1/profile/:id (GDPR)
7. Widget enrollment UI (6 rounds, progress bar, skip option)
8. Widget recalibration prompt
9. Tests: enrollment flow, decay, deletion, encryption roundtrip
Verificación: Enrollment completo, profile guardado cifrado, decay detectado
```

### Sesión 8: ML Pipeline
```
Prerequisito: BeCAPTCHA-Mouse dataset descargado + datos propios recolectados

1. packages/ml: Python setup (requirements.txt: scikit-learn, onnx, skl2onnx, numpy, scipy)
2. Feature extraction pipeline (39 features from raw data — match AnalysisResult.features exactly)
3. Data loading (BeCAPTCHA-Mouse format + own JSON format)
4. Train Random Forest (scikit-learn)
5. Evaluate (accuracy, false positive rate, confusion matrix per bot level)
6. Export ONNX (skl2onnx)
7. API: load ONNX model at startup (try onnxruntime-node, fallback onnxruntime-web)
8. API: replace heuristic detection with ONNX inference, keep heuristic as fallback
9. Benchmark inference latency (target <50ms)
Verificación: Model loads, inference <50ms, accuracy per bot level logged
```

### Sesión 9: Documentation + Publish
```
1. apps/docs: documentation site (Vite + markdown or Astro)
2. Quick Start guide (5 min integration: npm install, add component, configure API)
3. Full API reference (all endpoints, request/response schemas)
4. Security model documentation
5. npm publish config (@rhythmguard/widget, @rhythmguard/shared)
6. README.md en cada package
7. CHANGELOG.md
8. LICENSE (MIT)
Verificación: npm pack genera package válido, docs site renderiza, README completo
```

**Dashboard (admin config, metrics) es post-v1.** No tiene sesión asignada. Se construye después del lanzamiento cuando haya datos reales de uso que visualizar.

---

## 6. Sequence Generation Algorithm

```typescript
function generateSequence(difficulty: DifficultyParams, platform: 'desktop' | 'mobile'): CircleSequence {
  const circles: Circle[] = [];
  const canvasW = 1.0;  // Normalized coordinates
  const canvasH = platform === 'mobile' ? 1.0 : 0.667;  // 1:1 mobile, 3:2 desktop
  const margin = 0.1;   // 10% margin from edges
  const minSpacing = difficulty.minSpacing;  // Normalized

  for (let i = 0; i < difficulty.circleCount; i++) {
    let x, y;
    let placementAttempts = 0;
    const maxPlacementAttempts = 200;
    do {
      x = margin + Math.random() * (canvasW - 2 * margin);
      y = margin + Math.random() * (canvasH - 2 * margin);
      placementAttempts++;
    } while (
      placementAttempts < maxPlacementAttempts &&
      circles.some(c =>
        Math.hypot(c.x - x, c.y - y) < minSpacing
      )
    );

    if (placementAttempts >= maxPlacementAttempts) {
      throw new Error(
        `Cannot place circle ${i + 1}/${difficulty.circleCount} ` +
        `with minSpacing ${minSpacing} in canvas ${canvasW}x${canvasH}. ` +
        `Reduce circleCount or minSpacing.`
      );
    }

    circles.push({
      id: i,
      x,
      y,
      appearAt: i * (difficulty.approachDuration * 0.6),  // Staggered appearance
    });
  }

  return circles;
}

// Max circles per canvas (approximate, Poisson disk sampling):
// Desktop (0.8 × 0.467 usable, spacing 0.15): ~17 circles
// Desktop (0.8 × 0.467 usable, spacing 0.12): ~26 circles
// Mobile  (0.8 × 0.8 usable, spacing 0.18):   ~15 circles
// Mobile  (0.8 × 0.8 usable, spacing 0.144):  ~24 circles
// Level 5 escalation must respect these limits.
```

- Coordenadas normalizadas (0-1) para independencia de resolución
- Spacing mínimo evita solapamiento
- Staggered appearance: cada circle aparece cuando el anterior lleva 60% de su approach
- **Throws error** si no puede colocar todos los circles (no falla silenciosamente)

**Nota de seguridad (attack surface conocida)**: La secuencia completa se envía al cliente al inicio del challenge. Un bot puede pre-calcular la trayectoria óptima antes de que empiece. Esto se acepta como tradeoff: la alternativa (enviar circles uno a uno) agrega latencia de red por circle y degrada la UX. La mitigación es que el bot aún debe ejecutar movimientos en tiempo real con timing y kinemáticas humanas, que es donde la detección opera. Documentado, no ignorado.

---

## 7. Criterios de Éxito (Product-Ready)

El producto está listo cuando:

### 7.1 Funcionalidad Core
- [ ] Widget se renderiza correctamente en Chrome, Firefox, Safari, Edge (desktop)
- [ ] Widget se renderiza correctamente en Safari iOS, Chrome Android (mobile)
- [ ] Challenge completo end-to-end: request → play → verify → token
- [ ] Server-to-server token validation funcional
- [ ] Fallback a "Use another method" funciona en todos los estados
- [ ] Escalación: detección de perfección → nivel más difícil → fallback si persiste
- [ ] Rate limiting funcional (IP + account)
- [ ] Challenge tokens expiran correctamente

### 7.2 Integración
- [ ] npm package `@rhythmguard/widget` instalable y funcional
- [ ] Embed script CDN funcional (vanilla JS)
- [ ] React component con props tipados funcional
- [ ] Documentación de integración: Quick Start (5 min), Full Guide, API Reference
- [ ] Demo app funcional mostrando login flow completo (password + RhythmGuard + fallback)

### 7.3 Enterprise
- [ ] Enrollment (6 rondas) funcional con progress tracking
- [ ] Profile storage y retrieval funcional
- [ ] Decay detection funcional (marca profiles como stale después de N días)
- [ ] Recalibración funcional (3 rondas después de autenticación por otro método)
- [ ] DELETE /profile funcional (GDPR)
- [ ] Perfiles separados por plataforma

### 7.4 ML / Detección
- [ ] Modelo ONNX entrenado con BeCAPTCHA-Mouse + datos propios
- [ ] Inference <50ms en Bun
- [ ] Detección de bots nivel 0-2 con >90% accuracy
- [ ] Detección de bots nivel 3 (GAN) con >80% accuracy
- [ ] False positive rate medida y documentada
- [ ] Análisis de features genera 39 features correctamente

### 7.5 Seguridad
- [ ] HMAC-signed challenges (client no puede modificar secuencia)
- [ ] Response timing constante (anti-timing attack)
- [ ] No information leakage en responses de error
- [ ] CORS configurado correctamente
- [ ] Rate limiting no bypasseable por header spoofing
- [ ] Challenge tokens single-use

### 7.6 UX
- [ ] Desktop: modal con overlay, slide-up animation, clean close
- [ ] Mobile: fullscreen overlay, touch-optimized, haptic feedback
- [ ] Hit: green flash 100ms
- [ ] Miss: red flash 100ms + subtle shake
- [ ] Success: animated checkmark + "Verified" + auto-close 1.5s
- [ ] "Use another method" visible en TODOS los estados
- [ ] Enrollment flow completo con progress bar entre rondas
- [ ] Recalibration prompt para profiles stale
- [ ] Temas light/dark/auto
- [ ] i18n: al menos en/es

### 7.7 DevOps
- [ ] `docker compose up -d postgres` levanta PostgreSQL
- [ ] `docker compose up` levanta API + PostgreSQL
- [ ] `cp .env.example .env` + `pnpm install` + `pnpm dev` funciona en <5 minutos
- [ ] Migrations de Drizzle funcionan clean
- [ ] Seed script crea site de desarrollo
- [ ] CI: tests pasan, build exitoso
- [ ] README documenta el setup completo

---

## 8. Prioridad de Implementación

Orden de desarrollo (matches sessions 1-9):

1. **Monorepo + build setup** (Turborepo, pnpm, tsconfig, Vitest)
2. **shared package** (types, constants, Zod schemas, i18n strings)
3. **Widget canvas** (rendering loop, hit circles, approach circles, hit detection)
4. **Widget input capture** (pointer events, cursor path recording, timing, platform detection)
5. **Widget UI** (modal, states, animations, fallback link, error handling)
6. **API: database + sites** (Drizzle schema, migrations, seed script, site key management)
7. **API: challenge + verify** (sequence generation, HMAC, feature extraction, heuristic detection)
8. **API: token flow** (JWT generation, server-to-server validation, anti-timing 200ms floor)
9. **Demo app** (login page with password + RhythmGuard + fallback)
10. **Mobile optimization** (touch targets, haptic, fullscreen, motion capture)
11. **Widget distribution** (iframe embed + postMessage, CDN script)
12. **Enterprise: enrollment** (6-round flow, profile creation, AES-256-GCM encryption)
13. **Enterprise: profiles** (DB storage, decay detection, recalibration, GDPR deletion)
14. **ML training** (Python, BeCAPTCHA-Mouse data, Random Forest, ONNX export)
15. **API: ONNX inference** (replace heuristic with ML model, keep heuristic as fallback)
16. **npm publish** (widget + shared packages)
17. **Documentation site** (Quick Start, API reference, security model)

Dashboard (admin config, metrics) is **post-v1**.

---

## 9. Referencias Técnicas Clave

### Papers
- Acien et al. (2022): "BeCAPTCHA-Mouse: Synthetic Mouse Trajectories and Improved Bot Detection" — Pattern Recognition. Benchmark dataset, neuromotor features, 93% detection of GAN bots.
- DMTG (2024): "A Human-Like Mouse Trajectory Generation Bot Based on Entropy-Controlled Diffusion Networks" — Estado del arte en evasión.
- Wei & Zhao (2019): "A Deep Learning Approach to Web Bot Detection Using Mouse Behavioral Biometrics" — CNN on trajectory images, 96.2% detection.
- Iliou et al.: "Web Bot Detection Evasion Using GANs" — Evasive bots con fingerprint + humanlike trajectories.
- Siddiqui et al. (2022): Minecraft mouse dynamics dataset, 40 users, classifier benchmarks.
- Hassan et al. (2022): Mouse dynamics for anti-cheat, 39 features from raw mouse data.

### Datasets
- BeCAPTCHA-Mouse: github.com/BiDAlab/BeCAPTCHA-Mouse (license agreement required)
- Sigma-Lognormal model: Kinematic Theory of Rapid Human Movements (Plamondon, 1995)

### Repos de referencia (diseño, NO código)
- ppy/osu (MIT) — approach circle mechanics, timing system
- MaximilianAdF/NoPixel-MiniGames-4.0 — React/TypeScript game UI patterns
- boiidevelopment/boii_minigames — skill_circle difficulty configuration
