# RhythmGuard: Skill-Based Behavioral Authentication Layer

**Spec v0.2 — April 2026 (Post-Audit)**
**Author: Juan — Draft / Light Research**
**Status: Concept Specification — Audited**

---

## 1. Resumen Ejecutivo

RhythmGuard es una capa de autenticación basada en habilidad motora que utiliza mecánicas de juegos de ritmo (tipo osu!) como factor de verificación. No pretende reemplazar métodos existentes, sino complementarlos como una capa adicional dentro de un sistema de autenticación adaptativo (Adaptive MFA).

El concepto opera en dos niveles:

**Community (Anti-Bot)** — Dos propiedades:
1. **Proof of human presence**: La coordinación mano-ojo en tiempo real sube significativamente el costo de automatización (no lo elimina; ver sección 3.6 sobre limitaciones).
2. **Detección inversa de bots**: Rendimiento "demasiado perfecto" se clasifica como sospechoso, no como exitoso.

**Enterprise (Verificación de Identidad)** — Añade una tercera:
3. **Perfil biométrico conductual**: El sistema no solo verifica que eres humano, sino que eres *tú*.

**Posicionamiento honesto**: RhythmGuard tiene MÁS fricción que CAPTCHAs modernos (Turnstile es invisible, ~0s; RhythmGuard toma ~5-8s). La propuesta de valor no es "menos fricción" sino "fricción que al nicho target le resulta natural o incluso entretenida" y "una barrera activa que sube el costo del ataque".

El nicho objetivo no es el mercado masivo de CAPTCHAs, sino comunidades donde la habilidad gaming ya existe (gamers, comunidades osu!, plataformas de esports, fintech orientada a millennials/gen-z) y donde la fricción gamificada es aceptable o incluso deseable. El dimensionamiento de este mercado requiere validación (ver sección 9).

---

## 2. Estado del Arte

### 2.1 Fuentes Open Source Disponibles

#### osu! (lazer) — Motor de Juego
- **Repo**: `ppy/osu` (GitHub, MIT License)
- **Framework**: `ppy/osu-framework` — motor reutilizable para apps/juegos
- **Lenguaje**: C# / .NET 8.0
- **Relevancia**: El framework permite crear "rulesets" personalizados. Se podría construir un ruleset de autenticación sobre el motor existente.
- **Web**: `ppy/osu-web` (AGPL v3) — portal web, Laravel + React.
- **Nota legal**: El creador (peppy) ha declarado públicamente que las mecánicas de gameplay no deberían tener copyright/patent. Las reglas de cada modo fueron tomadas de juegos preexistentes.

#### Implementaciones Web de osu!
- **webosu** (`111116/webosu`): Implementación browser con PixiJS. Funcional pero proyecto legacy.
- **osw** (`Joshua-Usi/osw`): Clone browser, abandonado pero con código de referencia útil.
- **osu-online** (`MichaelKim/osu-online`): Pixi.js + React. Buena referencia de arquitectura.

#### Minigames de FiveM / NoPixel
Los servidores de roleplay de GTA V (FiveM) utilizan minigames NUI (HTML/JS/CSS) como mecánica de hacking/robo:

- **boii_minigames** (`boiidevelopment/boii_minigames`): Colección standalone con Skill Circle, Key Drop, Pin Code, Safe Crack. Open source, API por exports. La mecánica `skill_circle` es la más cercana al concepto RhythmGuard.
- **CircleMinigame** (`trclassic92/CircleMinigame`): Lockpick basado en NoPixel, standalone para cualquier framework (ESX, OX, QBCore).
- **NoPixel-MiniGames-4.0** (`MaximilianAdF/NoPixel-MiniGames-4.0`): Réplicas en React/Next.js/TypeScript/TailwindCSS de los minigames de NoPixel 4.0. Incluye lockpick con múltiples "locks" (círculos) y alineación de indicadores.
- **varhack** (`JoeSzymkowiczFiveM/varhack`): Minigame de hacking estilo VAR, empaquetado como NUI resource.
- **nphacks.net**: Simulador web gratuito de todos los minigames NoPixel para práctica.

**Relevancia para RhythmGuard**: Estos scripts demuestran que la mecánica de "click circles in sequence with timing" funciona en browser, es implementable en HTML/JS/CSS puro, y tiene dificultad configurable (número de círculos, tiempo, velocidad, tamaño de zona válida).

### 2.2 Biometría Conductual — Investigación Existente

El campo de behavioral biometrics ya tiene investigación sólida que valida el enfoque de RhythmGuard:

- **Keystroke Dynamics**: Uso de patrones de tipeo (ritmo, velocidad, presión) como biométrico. Investigación desde los 1970s (Spillane, IBM). Resultados comerciales probados.
- **Mouse Dynamics**: Autenticación basada en cómo el usuario mueve el mouse (aceleración, frecuencia de click, trayectorias curvas). Papers relevantes: Pusara & Brodley (2004) — re-autenticación por movimiento de mouse; Monrose & Rubin — keystroke dynamics como biométrico.
- **Fusión Multimodal**: Investigaciones recientes (2022-2025) combinan keystroke + mouse dynamics + comportamiento de aplicación. Un framework para healthcare logró 98.25% accuracy con Random Forest/XGBoost, 0% Equal Error Rate, e inferencia <2.6ms.
- **IBM Behavioral Biometrics**: IBM Verify requiere mínimo 8 sesiones para baseline. Usa deep learning y CNNs para modelar comportamiento.
- **Ataque conocido**: López et al. (2023) documentaron ataques de replay que reusan inputs genuinos para impersonar usuarios en sistemas mouse/keystroke. Esto valida la necesidad de secuencias aleatorias y detección de patrones estadísticos no-humanos.

### 2.3 CAPTCHAs Gamificados — Estado Actual

- **FunCaptcha (Arkose Labs)**: Rotación de objetos 3D, puzzles interactivos. Tiempo de resolución: 3-8 segundos. Referencia comercial exitosa.
- **GeeTest**: Gamificación de CAPTCHA con análisis conductual integrado. Reducción documentada de fricción vs. CAPTCHAs tradicionales.
- **Game-based CAPTCHA Generation (Yu & Riedl, Georgia Tech)**: Paper académico sobre generación automática de CAPTCHAs basados en juegos que explotan la falta de commonsense knowledge de los bots.
- **Gamified CAPTCHA (Kani & Nishigaki)**: Concepto de "attack-filtering" como paso pre-release para calibrar dificultad contra bots conocidos.
- **Dato clave**: Stanford University estima que un CAPTCHA tradicional reduce conversiones de formularios hasta 40%. Los CAPTCHAs gamificados reducen esta fricción significativamente.

### 2.4 Autenticación Adaptativa (Adaptive MFA)

El modelo de seguridad tiered de RhythmGuard se alinea con el estándar de la industria:

- **Risk-Based MFA**: Factores de autenticación que se ajustan dinámicamente según el nivel de riesgo calculado por contexto (ubicación, dispositivo, hora, comportamiento).
- **OWASP Cheat Sheet — Multifactor Authentication**: Documenta gait analysis, behavioral biometrics, y adaptive authentication como categorías válidas. Nota que el uso de acelerómetros móviles para biometría conductual es teóricamente viable pero no ampliamente probado.
- **Modelo estándar**: Login low-risk → pasa sin fricción adicional. Login high-risk → step-up authentication con factores adicionales.

---

## 3. Concepto Técnico

### 3.1 El Cuarto Factor

Los factores de autenticación tradicionales son:

| Factor | Ejemplo | Vulnerabilidad |
|--------|---------|----------------|
| Something you **know** | Contraseña, PIN | Phishing, filtración |
| Something you **have** | Token, teléfono | Clonación SIM, robo |
| Something you **are** | Huella, iris | Spoofing biométrico |

RhythmGuard introduce:

| Factor | Ejemplo | Vulnerabilidad |
|--------|---------|----------------|
| Something you **can do** | Rendimiento en minigame de ritmo | Costo de ataque, no imposibilidad (ver 3.6) |

**Nota**: En el tier Community (sin perfiles), "something you can do" funciona como proof-of-humanness avanzado, similar en categoría a CAPTCHAs pero con señales conductuales más ricas. La diferenciación real como cuarto factor (verificar identidad, no solo humanidad) solo se materializa en el tier Enterprise con perfiles biométricos.

Este factor sube el costo del ataque: un atacante con credenciales robadas debe además superar un challenge motor en tiempo real, con secuencias aleatorias, con detección anti-bot activa. No es infalible, pero el costo de desarrollar un bot especializado es significativamente mayor que el de usar credenciales robadas directamente.

### 3.2 Mecánica del Minigame

Basado en las mecánicas de osu! standard mode, simplificadas para un contexto de seguridad:

1. **Aparecen círculos** en posiciones aleatorias de la pantalla/viewport.
2. Cada círculo tiene un **approach circle** que se contrae hacia el centro.
3. El usuario debe **clickear/tocar** el círculo cuando el approach circle coincide con el hit circle.
4. La **secuencia** de círculos varía en cantidad, velocidad, y distribución espacial.

**Parámetros configurables por el administrador del sistema:**

- `circleCount`: Número de hits requeridos (3-15)
- `approachRate`: Velocidad del approach circle (ms)
- `circleSize`: Tamaño del target (px o % del viewport)
- `overallDifficulty`: Ventana de timing para "hit" válido (ms)
- `spacing`: Distancia entre círculos consecutivos

### 3.3 Detección Inversa (Anti-Bot por Perfección)

El insight central: **rendimiento demasiado perfecto es señal de bot, no de éxito.**

**Métricas recolectadas por intento:**

```
{
  hitTimings: number[],        // ms entre cada hit y el timing "perfecto"
  hitPositions: [x, y][],      // coordenada de click vs centro del target
  cursorPath: [x, y, t][],     // trayectoria completa del cursor con timestamps
  reactionDelays: number[],    // tiempo desde aparición del círculo hasta movimiento del cursor
  clickDurations: number[],    // ms que el botón se mantuvo presionado
  interHitGaps: number[]       // ms entre hits consecutivos
}
```

**Análisis estadístico por intento:**

⚠️ **Los valores siguientes son hipotéticos. Requieren validación empírica en Fase 0 con datos reales de humanos y bots.**

| Métrica | Humano (hipótesis) | Bot Simple (hipótesis) | Bot Sofisticado (hipótesis) |
|---------|-------------------|----------------------|---------------------------|
| Desviación std timing | 15-80ms | <5ms | 8-15ms (ruido artificial) |
| Distribución de error posición | Asimétrica, sesgada | Centrada o ausente | Simétrica artificial |
| Curva aceleración cursor | Irregular, no-lineal | Lineal | Suavizada artificialmente |
| Varianza entre intentos | Alta | <5% | Baja pero constante |
| Correlación timing-distancia | Positiva natural | Ausente o perfecta | Débil o ausente |
| Micro-correcciones de cursor | Presentes, irregulares | Ausentes | Rítmicas, periódicas |

**Detección por capas:**

1. **Capa 1 — Umbral bruto**: Si el score de precisión está en el top 1% estadístico → flag como sospechoso.
2. **Capa 2 — Distribución estadística**: Analizar si la distribución de errores sigue patrones naturales vs. sintéticos. Nota: con solo 5-15 hits por intento, tests como Kolmogorov-Smirnov tienen poder estadístico bajo. La señal primaria viene del cursor path (a 60fps, ~480 puntos en 8 segundos), no de los hit events aislados.
3. **Capa 3 — Consistencia inter-intentos**: Un humano varía naturalmente entre intentos. Un bot con ruido artificial mantiene distribuciones estadísticas consistentes. Esta capa solo aplica cuando hay múltiples intentos en la misma sesión.

### 3.4 Escalación Adaptativa

Cuando el sistema sospecha bot:

```
Intento 1: Secuencia estándar (8 círculos, 800ms approach)
  → Resultado "demasiado perfecto"
  → NO cuenta como error del usuario

Intento 2: Secuencia más difícil (12 círculos, 600ms approach, spacing mayor)
  → Humano: rendimiento empeora de forma predecible
  → Bot: mantiene distribución constante pero más rápido
  → Señal de bot se AMPLIFICA

Intento 3: Si persiste → fallback a otros métodos de autenticación
  → Mensaje: "Verificación adicional requerida"
  → Email (fallback nativo) / TOTP / SMS
  → NO se revela que la razón es sospecha de bot
```

**Manejo de jugadores hábiles**: La escalación no es un castigo. Un jugador de osu! de alto nivel que pase Nivel 2 con rendimiento "sospechosamente bueno" sube a Nivel 3. Si Nivel 3 también lo pasa limpio, sube a Nivel 4. En algún punto, incluso un jugador profesional empieza a mostrar degradación natural: errores de timing, imprecisión posicional, micro-correcciones. Ese punto de degradación natural es lo que lo distingue de un bot, que no degrada sino que mantiene su distribución estadística constante. El sistema no busca que falles; busca el punto donde tu rendimiento se vuelve inequívocamente humano. Para un jugador hábil, ese punto está en niveles más altos, pero existe.

**Importante**: La escalación no penaliza al humano legítimo. El mensaje es neutral ("verificación adicional") y el fallback (correo electrónico) siempre está disponible.

### 3.5 Dos Problemas, Dos Productos

RhythmGuard resuelve dos problemas distintos que NO necesitan resolverse juntos. Esta separación define la arquitectura completa:

**Problema A — Anti-Bot (Community / Open Source)**

Pregunta: ¿Es un humano o una máquina?

No requiere perfiles por usuario. Solo un modelo estadístico genérico entrenado con datos agregados de "así se comporta un humano" vs. "así se comporta un bot". Es un widget instalable con validación server-side y cero almacenamiento de datos de usuario.

Infraestructura: Widget JS + API de validación + modelo estadístico pre-entrenado.
Sin base de datos de perfiles. Sin enrollment. Sin skill decay. Sin recalibración.
Los datos raw de cada intento se analizan en tiempo real y se descartan.

Este es el producto core. Equivalente funcional a reCAPTCHA/hCaptcha/Turnstile, pero gamificado y con detección inversa por perfección.

**Problema B — Verificación de Identidad (Enterprise Tier)**

Pregunta: ¿Es *este* humano específico?

Requiere perfiles biométricos conductuales por usuario. Enrollment, storage, decay management, recalibración. Infraestructura significativamente mayor.

Enrollment: 5-6 rondas cortas durante setup. Extrae perfil base (velocidad media, desviación de precisión, patrones de error, curvas de cursor).

Skill Decay: Si inactividad >90 días (configurable) y falla el challenge → fallback automático + mensaje: "Hace tiempo que no usas este método. ¿Quieres recalibrar o usar otro método?" Recalibración requiere autenticación previa por otro método. Nunca se bloquea al usuario por decay.

Perfiles separados por plataforma: El perfil de mouse (desktop) y el de touch (móvil) son fundamentalmente diferentes. Un usuario tiene un perfil por plataforma. No son intercambiables.

**Implicaciones de esta separación:**

| Aspecto | Community (Anti-Bot) | Enterprise (Identidad) |
|---------|---------------------|----------------------|
| Storage por usuario | Ninguno | Perfil cifrado en DB |
| Enrollment | No | Sí (5-6 rondas) |
| Skill decay | N/A | Gestión activa |
| Regulación GDPR | Probablemente no biométrico (requiere opinión legal) | Sí, requiere consentimiento |
| Infraestructura | Widget + API (sin estado por usuario) | Widget + API + DB + ML pipeline |
| Modelo de negocio | Open source, gratis | Licencia enterprise |

### 3.6 Limitaciones y Amenazas Honestas

**Bots con RL/ML entrenados con datos humanos**: La amenaza más seria a largo plazo. Un agente de reinforcement learning entrenado con grabaciones de humanos reales jugando el minigame podría aprender a replicar no solo el rendimiento sino el jitter natural, las distribuciones asimétricas, y las correlaciones timing-distancia. RhythmGuard NO es inmune a esto. Lo que hace es subir el costo del ataque: pasar de "$0 con credenciales robadas" a "$X desarrollando un bot especializado entrenado con datos del minigame específico". Mientras ese costo sea mayor que el valor de lo que protege, el sistema cumple su función. Si el valor protegido justifica un bot ML personalizado, RhythmGuard solo no es suficiente y por eso siempre opera como capa adicional, no como único factor.

**RhythmGuard no es más conveniente que alternativas**: Turnstile de Cloudflare es invisible (~0s). Un código SMS toma ~5s. RhythmGuard toma ~5-8s y requiere atención activa. La propuesta de valor nunca es "menos fricción" sino "fricción aceptable para el nicho + barrera activa contra bots". Si el usuario no valora la gamificación, RhythmGuard es objetivamente peor que Turnstile.

**Abuso del fallback**: Si el correo electrónico es siempre accesible como fallback, un atacante puede ignorar RhythmGuard e ir directo al vector del correo. RhythmGuard es tan fuerte como su fallback más débil. Mitigación: el fallback NO bypasea RhythmGuard silenciosamente. El sistema registra que se usó fallback, cuántas veces, desde qué IP/dispositivo. Uso excesivo de fallback desde contextos inusuales puede trigger alertas al dueño de la cuenta. El administrador puede configurar el fallback como "correo + TOTP" para acciones críticas, subiendo el costo de atacar el fallback.

**Sample size estadístico**: Con 5-15 hits por intento, los tests estadísticos clásicos tienen poder limitado. La detección depende más del cursor path completo (~480 puntos a 60fps en 8s) que de los hit events aislados. Esto necesita validación empírica en Fase 0.

**Latencia end-to-end**: El round-trip completo (render → usuario juega → envía datos → servidor analiza → respuesta) debe ser <200ms post-completación para sentirse responsive. El análisis server-side debe apuntar a <50ms. Si la latencia es perceptible, la UX se degrada.

**Disponibilidad del servicio**: Si la API de RhythmGuard está caída, los sistemas que la integran deben tener un comportamiento definido. Opciones: fallback automático a correo (seguridad reducida pero servicio no interrumpido) o bloqueo temporal (seguridad mantenida pero fricción máxima). El default recomendado es fallback a correo con alerta al administrador.

---

## 4. Arquitectura de Integración

### 4.1 Plataforma

RhythmGuard opera en **escritorio y móvil**, con adaptaciones por plataforma:

| Aspecto | Escritorio | Móvil |
|---------|-----------|-------|
| Input | Mouse click | Touch tap |
| Métricas cursor | Trayectoria completa mouse | Touch events + presión (si disponible) |
| Viewport | Configurable, mín. 600x400 | Adaptativo al device |
| Approach circle | Visual estándar | Visual + vibración haptic |
| Ventana de timing | Estándar | Más permisivo (compensar latencia touch, delta exacto por determinar en Fase 0) |
| Métricas adicionales | Mouse acceleration, scroll behavior | Giroscopio, acelerómetro (si permitido) |

**Nota**: En móvil, el acelerómetro y giroscopio son señales biométricas adicionales (cómo sostiene el teléfono mientras toca la pantalla). OWASP documenta esto como teóricamente viable.

### 4.2 Modelo de Seguridad Tiered

**Regla fundamental**: RhythmGuard NUNCA es el único método. Siempre existe un fallback. El fallback nativo por defecto es **correo electrónico** (código de verificación). Este fallback no es removible, solo se pueden añadir otros encima. El usuario puede cambiar su fallback preferido a TOTP/authenticator, pero el correo siempre permanece como último recurso.

**Niveles de dificultad del minigame (Community tier)**:

```
Nivel 1 (casual):
  → 5 círculos, approach lento (1000ms), zona de hit amplia
  → Para: registro de cuentas, acciones low-stakes

Nivel 2 (estándar):
  → 8 círculos, approach medio (800ms), zona estándar
  → Para: login regular, confirmaciones

Nivel 3 (exigente):
  → 12 círculos, approach rápido (600ms), zona reducida
  → Para: acciones sensibles (transacciones, cambios de config)

Nivel 4 (extremo):
  → 15 círculos, approach rápido (500ms), spacing amplio, zona mínima
  → Para: escalación anti-bot o acciones críticas

Nivel 5 (escalación forzada):
  → Generado dinámicamente: más rápido y denso que el intento previo
  → Solo se activa por sospecha de bot. No configurable manualmente.
```

**Configuración de seguridad por acción (ejemplo fintech)**:

```
Login regular:         RhythmGuard Nivel 2
                       Fallback: código al correo

Transferencia <$100:   RhythmGuard Nivel 2
                       Fallback: código al correo

Transferencia >$1000:  RhythmGuard Nivel 3 + TOTP
                       Fallback: código al correo + SMS

Cambio de contraseña:  RhythmGuard Nivel 3 + TOTP + código al correo
                       (correo obligatorio, no fallback)
```

El administrador define niveles mínimos por acción. El usuario puede subir pero no bajar del mínimo. El correo siempre está disponible como red de seguridad.

### 4.3 Flujo de Autenticación

```
[Usuario intenta acción protegida]
       ↓
[Contraseña] → Fail → Error estándar
       ↓ OK
[RhythmGuard habilitado para esta acción?]
       ↓ Sí                              ↓ No → Acción permitida
[Generar secuencia aleatoria (nivel según acción)]
       ↓
[Usuario completa minigame]
       ↓
[Análisis de resultado]
  ├── Comportamiento humano dentro de rango → Acción permitida
  ├── Comportamiento humano pero falla el challenge → Reintentos (3 máx)
  │     └── Agotados → Fallback: código al correo (siempre disponible)
  ├── "Demasiado perfecto" → Escalación (Nivel 5, secuencia más difícil)
  │     ├── Segundo intento con degradación natural → Acción permitida
  │     └── Segundo intento sigue "perfecto" → Fallback forzado: correo + TOTP
  └── Fallo total / timeout → Fallback: código al correo
       
[Fallback: código al correo]
  → Siempre disponible, no removible
  → Usuario puede tener TOTP/SMS como fallback preferido
  → Si todos los fallbacks fallan → cuenta temporalmente bloqueada + email de recuperación
```

### 4.4 Stack Técnico Sugerido

**Frontend (Minigame) — Ambos tiers**:
- **Renderizado**: HTML5 Canvas o PixiJS (referencia: webosu, osu-online)
- **Framework**: React (referencia: NoPixel-MiniGames-4.0 usa React/Next.js/TypeScript)
- **Input handling**: Pointer Events API (unifica mouse + touch)
- **Métricas**: Web Performance API para timing de alta resolución (`performance.now()`)
- **Comunicación**: Toda la validación server-side. El frontend solo envía raw input data.

**Backend Community (Anti-Bot) — Sin estado por usuario**:
- **API**: REST, stateless. Cada request es independiente.
- **Generación de secuencias**: Server-side, aleatoria por intento, firmada con HMAC
- **Análisis**: Modelo estadístico pre-entrenado embebido (no requiere DB). Compara el intento actual contra distribuciones conocidas humano/bot.
- **Storage**: Ninguno por usuario. Solo logs agregados anónimos para mejorar el modelo.
- **Deployment**: Puede correr como edge function / serverless. Latencia mínima.

**Backend Enterprise (Identidad) — Stateful**:
- Todo lo de Community, más:
- **Almacenamiento de perfiles**: PostgreSQL con JSONB para datos biométricos, cifrados at rest
- **ML Pipeline**: Random Forest/XGBoost para clasificación identidad (entrenamiento por usuario)
- **Enrollment service**: Gestión de rondas de calibración, generación de perfil base
- **Decay manager**: Cron job que marca perfiles inactivos para recalibración

**Seguridad (ambos tiers)**:
- Secuencias firmadas server-side (evitar manipulación client-side)
- Rate limiting por IP y por cuenta
- TLS obligatorio, certificate pinning recomendado
- Nunca revelar razón específica de fallo (anti-bot vs. skill insuficiente)
- **Community**: datos de intento descartados post-análisis → probablemente no dato personal bajo GDPR, pero el procesamiento de patrones conductuales podría interpretarse como tratamiento biométrico incluso sin almacenamiento. **Requiere opinión legal formal.**
- **Enterprise**: perfiles cifrados at rest, consentimiento explícito requerido, derecho a eliminación, DPIA obligatoria

### 4.5 Integración como Servicio

RhythmGuard se integra como un servicio independiente, no como monolito:

```
[App del cliente]
      ↓
[RhythmGuard SDK (JS)] ← Renderiza minigame, captura input
      ↓
[RhythmGuard API]       ← Valida, analiza, responde pass/fail/escalate
      ↓
[Webhook / Callback]    ← Notifica al sistema del cliente el resultado
```

**Modelo similar a**: reCAPTCHA, hCaptcha, Turnstile. Widget embebible con validación server-to-server.

---

## 5. Consideraciones de Diseño

### 5.1 Accesibilidad

RhythmGuard **no es accesible universalmente** por diseño (requiere habilidad motora). Esto es aceptable porque:

- Es una capa **opcional**, nunca el único método.
- Usuarios con discapacidad motora usan los fallbacks (correo electrónico siempre disponible, más TOTP, authenticator app).
- Los fallbacks son seleccionables por el usuario.
- **Nota WCAG**: WCAG 2.1 SC 2.5.1 exige alternativas para pointer gestures complejas. El fallback a correo/TOTP cumple como alternativa accesible, pero esto **requiere verificación formal de compliance** antes de lanzamiento.

### 5.2 Account Sharing

Si un usuario comparte voluntariamente su cuenta con un amigo:

- El amigo no pasará RhythmGuard (perfil biométrico diferente).
- El amigo necesitará los otros métodos de verificación.
- Esto es **by design**: el usuario que comparte asume la responsabilidad.
- El sistema no intenta resolver el account sharing voluntario. Solo garantiza que quien entra pasó las capas configuradas.

### 5.3 Privacidad

La separación en dos tiers tiene implicaciones regulatorias que requieren validación legal formal:

**Community tier (Anti-Bot)**:
- Los datos raw del intento se analizan en tiempo real y se descartan inmediatamente.
- No se almacena ningún dato personal ni biométrico por usuario.
- Solo se retienen métricas agregadas anónimas para mejorar el modelo estadístico.
- **Hipótesis regulatoria (requiere opinión legal)**: Al no almacenar datos y descartar post-análisis, probablemente no cae bajo "biometric data" en GDPR. Sin embargo, el GDPR define dato biométrico como datos obtenidos de "características conductuales" incluso durante el procesamiento. El acto de procesar patrones de mouse/touch podría requerir base legal incluso sin almacenamiento. Regulatoriamente similar a reCAPTCHA/Turnstile, que también procesan señales conductuales sin almacenarlas por usuario.

**Enterprise tier (Identidad)**:
- Los perfiles biométricos conductuales son datos sensibles bajo GDPR. Esto es claro y no ambiguo.
- Requieren consentimiento explícito del usuario.
- El usuario puede eliminar su perfil en cualquier momento (derecho a eliminación).
- Los perfiles se almacenan cifrados at rest.
- Los datos raw de input se descartan después de actualizar el perfil agregado.
- Se requiere revisión legal formal y DPIA (Data Protection Impact Assessment) antes de lanzamiento.

⚠️ **Ambos tiers requieren opinión legal formal antes de lanzamiento en jurisdicciones con regulación de datos biométricos (EU, Illinois/BIPA, Brasil/LGPD).**

### 5.4 Vectores de Ataque Conocidos

| Ataque | Mitigación |
|--------|-----------|
| Replay de inputs previos | Secuencias aleatorias por intento, firmadas con HMAC |
| Bot con ruido artificial | Análisis de distribución estadística + cursor path completo, no solo umbral de precisión |
| Bot con RL/ML entrenado | No tiene mitigación completa. RhythmGuard sube el costo del ataque, no lo elimina. Operación multilayer obligatoria (ver 3.6) |
| Screen recording + replay | Timestamp validation server-side, secuencia diferente cada vez |
| Manipulación client-side | Validación 100% server-side, el frontend es solo un capturador de input |
| Phishing del minigame | Binding a dominio/origin, CSP headers |
| MITM | TLS obligatorio, certificate pinning recomendado |
| Skill mimicry (humano imitando a otro) | Solo relevante en Enterprise tier. Perfil biométrico multidimensional dificulta imitación |
| Abuso del fallback (bypass via email) | Logging de uso de fallback, alertas por uso excesivo desde contextos inusuales, fallback configurable como "correo + TOTP" para acciones críticas |
| Servicio RhythmGuard caído | Fallback automático a correo + alerta al admin. Configurable: fail-open (menos seguro) o fail-closed (más fricción) |

---

## 6. Open Source Reutilizable

### 6.1 Componentes que se pueden tomar

| Fuente | Qué tomar | Licencia | Compatibilidad |
|--------|-----------|----------|----------------|
| `ppy/osu` | Hit object rendering, approach circle logic, timing calculations | MIT | Compatible con cualquier licencia |
| `ppy/osu-framework` | Game engine, input handling, timing precision | MIT | Compatible |
| `boiidevelopment/boii_minigames` | Skill Circle mechanic, configurable difficulty, callback API | Sin licencia explícita | ⚠️ Asumir copyright. Solo como referencia de diseño, no copiar código |
| `MaximilianAdF/NoPixel-MiniGames-4.0` | React/TypeScript/Tailwind implementation, lockpick UI | Sin licencia explícita | ⚠️ Solo referencia |
| `111116/webosu` | PixiJS rendering pipeline, beatmap playback | Contiene assets con copyright ppy | ⚠️ Solo referencia de arquitectura |
| `MichaelKim/osu-online` | Pixi.js + React architecture | Sin licencia explícita | ⚠️ Solo referencia |

⚠️ **Nota de licencias**: Solo `ppy/osu` y `ppy/osu-framework` (MIT) son seguros para uso directo de código. `ppy/osu-web` es AGPL v3, que es viral (obliga a publicar tu código derivado como AGPL). Los repos de FiveM/NoPixel generalmente no tienen licencia explícita, lo que legalmente significa copyright default — usar solo como referencia de diseño, NO copiar código. Para RhythmGuard, lo más limpio es construir el minigame desde cero usando las mecánicas documentadas (no protegibles por copyright, confirmado por peppy) y solo tomar código de repos MIT.

### 6.2 Lo que hay que construir desde cero

Por orden de complejidad (mayor a menor):

1. **Motor de análisis estadístico de input humano vs. bot** — Este es el core IP y el componente más complejo. Requiere datos reales de Fase 0, modelado estadístico, y iteración. Sin esto, el producto no existe.
2. **Minigame web** (React + Canvas/PixiJS) — Mecánica documentada, referencias abundantes. Complejidad media.
3. **API de integración** (widget embebible + server validation) — Patrón conocido (similar a reCAPTCHA). Complejidad estándar.
4. **Sistema de perfiles biométricos conductuales** (solo Enterprise) — DB design, enrollment flow, decay management, ML pipeline. Complejidad alta.
5. **Dashboard de administración** — UI para configuración de dificultad, umbrales, niveles. Complejidad baja.
6. **SDK embebible** (JS para web) — Wrapper del widget con documentación. Complejidad baja.

---

## 7. Métricas de Éxito

⚠️ **Todos los targets son aspiracionales. Sin datos empíricos de Fase 0, no hay base para estas cifras. Se incluyen como referencia para medir el PoC, no como promesas de producto.**

### Community Tier (Anti-Bot)

| Métrica | Target (aspiracional) | Referencia industria |
|---------|----------------------|---------------------|
| Aceptación humanos legítimos (primer intento) | >90% | Behavioral biometrics maduras: 85-95% |
| Detección bots simples (scripts lineales) | >95% | CAPTCHAs modernos: ~98% |
| Detección bots sofisticados (con ruido/ML) | >80% | Sin referencia comparable; depende de definición de "sofisticado" |
| Falsos positivos (humano enviado a fallback) | <5% | Dato sujeto a overlap de distribuciones, validar en Fase 0 |
| Tiempo completación (intento exitoso) | <8 segundos | Turnstile: ~0s, FunCaptcha: 3-8s |
| Preferencia RhythmGuard vs fallback directo | Sin target (medir en beta) | Sin referencia. Requiere validación con usuarios reales |
| Latencia validación server-side | <50ms | reCAPTCHA: ~100ms |

### Enterprise Tier (Identidad)

| Métrica | Target (aspiracional) | Referencia industria |
|---------|----------------------|---------------------|
| Precisión identificación "es este usuario" | >90% | BioCatch/IBM: 95%+ (con años de datos) |
| Falsa aceptación (otro humano pasa como el usuario) | <5% | Fingerprint: <0.1%, behavioral: 2-5% |
| Enrollment completado en primer intento | >85% | IBM Verify: 8 sesiones mínimo |
| Recalibración exitosa post-decay | Sin target (medir) | Sin referencia comparable |

---

## 8. Roadmap Potencial

⚠️ **Estimaciones de esfuerzo son rough. Asumen un developer (Juan) part-time. Con equipo o full-time, tiempos se comprimen.**

### Fase 0 — Proof of Concept (~2-4 semanas)
- Minigame web standalone (React + Canvas/PixiJS)
- Captura de métricas de input (timing, posición, cursor path)
- Visualización de distribuciones humano vs. bot simulado
- Dataset inicial: 10-15 humanos de diferentes niveles de habilidad (jugadores profesionales de osu! y personas sin experiencia del círculo personal) + 3 bots de diferente sofisticación (script lineal, script con ruido, script con ruido adaptativo)
- Sin backend, sin perfiles. Solo demo jugable + gráficos de distribuciones reales
- **Entregable**: Demo + datos que validen o invaliden la premisa de detección inversa
- **Costo**: Tiempo. Sin infraestructura de pago.
- **Go/No-Go**: Si los datos no muestran separación estadística clara entre humanos y bots, el concepto no se sostiene. Parar acá.

### Fase 1 — Community MVP (Anti-Bot) (~6-10 semanas)
- Backend de validación sin estado por usuario (secuencias aleatorias, análisis estadístico genérico)
- 5 niveles de dificultad configurables
- Detección por distribución estadística (no perfiles individuales)
- Escalación adaptativa (Nivel 5 dinámico)
- Fallback obligatorio a correo electrónico
- API básica de integración (widget embebible)
- SDK JS con documentación
- Open source desde día 1
- **Costo**: Dominio + hosting API (serverless o VPS). ~$10-30/mes.

### Fase 2 — Community Estable (~3-6 meses)
- Modelo estadístico mejorado con datos reales de beta
- Soporte móvil con touch (Pointer Events API)
- Dashboard de configuración para administradores
- Integración con providers TOTP/SMS existentes
- Rate limiting, logging, métricas de uso
- Provisional patent si validación de mercado positiva (~$2-3k USD)

### Fase 3 — Enterprise Tier (~6-12 meses, requiere equipo o funding)
- Perfiles biométricos conductuales por usuario (PostgreSQL + JSONB)
- Enrollment (5-6 rondas de calibración)
- Modelo ML de clasificación por identidad (Random Forest/XGBoost)
- Gestión de skill decay + recalibración
- Perfiles separados por plataforma (desktop/móvil)
- Compliance pack (opinión legal formal, GDPR, DPIA)
- API enterprise con SLAs
- **Costo estimado**: Legal ($5-15k), infra ($200-500/mes), ML engineering (tiempo o contratación)

### Fase 4 — Escalamiento (requiere tracción y funding)
- Métricas de acelerómetro/giroscopio en móvil
- Marketplace de skins para el minigame (customización visual por marca)
- Certificaciones SOC2 (~$20-50k), ISO 27001
- SDKs nativos (iOS, Android)
- Partnership con providers de identity (Auth0, Okta, etc.)

---

## 8.5 Análisis Competitivo

El espacio no está vacío. RhythmGuard debe diferenciarse o no tiene razón de existir.

| Competidor | Qué hace | Ventaja sobre RhythmGuard | Ventaja de RhythmGuard |
|-----------|---------|--------------------------|----------------------|
| Cloudflare Turnstile | CAPTCHA invisible, 0 fricción | Sin fricción. Escala global. Gratis. | RhythmGuard añade barrera activa motora. Turnstile es pasivo. |
| Arkose Labs (FunCaptcha) | CAPTCHA gamificado + behavioral analysis | Años de datos, clientes enterprise (Microsoft, PayPal). Producto maduro. | Open source, detección inversa por perfección. |
| GeeTest | CAPTCHA interactivo + behavioral analysis | Producto maduro, presencia global. | Open source, comunidad. |
| BioCatch | Behavioral biometrics enterprise | Décadas de investigación, datasets masivos, certificaciones. | Community tier gratis y open source. |
| TypingDNA | Keystroke/mouse dynamics | Producto probado, API madura. | Gamificación activa vs. pasiva. |

**Diferenciación real de RhythmGuard**: (1) Open source (ningún competidor lo es), (2) Detección inversa por perfección (no encontrada en competidores), (3) Escalación adaptativa como mecanismo anti-bot, (4) Nicho gamer donde la fricción es deseable.

**Debilidad real vs competidores**: Zero data, zero clientes, zero track record. Los competidores tienen años de ventaja en datasets y validación. RhythmGuard solo gana si el nicho valora lo que los competidores no ofrecen.

---

## 9. Preguntas Abiertas y Decisiones Tomadas

### Decisiones Tomadas

1. **Modelo de negocio**: Open Source (Community anti-bot) con Enterprise Tier (verificación de identidad con perfiles). El tier community es gratuito y funciona como funnel hacia enterprise.

2. **Fallback obligatorio**: El correo electrónico es el fallback nativo, siempre presente, no removible. El usuario puede añadir TOTP/SMS como fallback preferido, pero el correo permanece como último recurso.

3. **Separación Anti-Bot vs. Identidad**: Son dos productos diferentes con infraestructura diferente. El anti-bot no tiene estado por usuario (widget + API + DB para challenges/rate limiting, pero sin perfiles ni datos biométricos). La verificación de identidad es stateful (requiere DB de perfiles, enrollment, decay management). Esto reduce dramáticamente la barrera de entrada al producto core.

4. **Perfiles separados por plataforma**: Confirmado. Mouse (desktop) y touch (móvil) generan perfiles biométricos fundamentalmente diferentes. Un usuario tiene un perfil por plataforma en el tier enterprise. En el tier community es irrelevante (no hay perfiles).

5. **Reconocimiento de origen**: Si un competidor implementa el concepto, lo importante es la atribución. El proyecto open source establece prior art público y trazable. La ventaja competitiva real está en la calidad de implementación, el modelo estadístico entrenado, y la comunidad.

### Preguntas que Requieren Más Investigación

1. **Patentabilidad**: La combinación específica de juego de ritmo + detección inversa por perfección + escalación adaptativa como sistema de autenticación es potencialmente novel. Cada componente individual tiene prior art, pero la combinación como unidad no se encontró en la investigación. Recomendación: provisional patent ($2-3k USD, 12 meses de protección temporal) para validar mercado antes de invertir en full patent ($10-15k USD, 2-3 años de proceso). Defensiva, no ofensiva.

2. **Regulación GDPR**: En el tier community (anti-bot, sin storage de datos), los datos del intento se analizan y descartan, no son dato personal bajo GDPR. En el tier enterprise (perfiles biométricos), sí cae bajo "biometric data" y requiere consentimiento explícito, base legal, y derecho a eliminación. La separación en dos tiers es ventajosa regulatoriamente. Requiere revisión legal formal antes de lanzamiento enterprise.

3. **Modelo estadístico pre-entrenado**: Dataset inicial resuelto: círculo personal incluye jugadores profesionales de osu! y personas sin experiencia. Suficiente para Fase 0 (10-15 humanos + bots sintéticos). Para Fase 1+, datos de beta pública con consentimiento expanden el modelo. Riesgo: el dataset inicial es pequeño y puede no representar la varianza real de la población objetivo.

4. **Pricing enterprise**: ¿Por usuario activo? ¿Por verificación? ¿Por volumen mensual? Requiere benchmarking contra competidores (Arkose Labs, TypingDNA, BioCatch).

---

## 10. Referencias

**Repositorios:**
- osu! (lazer): https://github.com/ppy/osu (MIT)
- osu! framework: https://github.com/ppy/osu-framework (MIT)
- osu! web: https://github.com/ppy/osu-web (AGPL v3)
- boii_minigames: https://github.com/boiidevelopment/boii_minigames
- NoPixel MiniGames 4.0: https://github.com/MaximilianAdF/NoPixel-MiniGames-4.0
- CircleMinigame: https://github.com/trclassic92/CircleMinigame
- webosu: https://github.com/111116/webosu
- osu-online: https://github.com/MichaelKim/osu-online
- Gamified CAPTCHA (maze): https://github.com/Mano-08/game-captcha

**Papers y artículos:**
- Pusara & Brodley (2004): User re-authentication via mouse movements
- Monrose & Rubin: Keystroke dynamics as a biometric for authentication
- López et al. (2023): Attack technique for behavioral biometric systems based on input replay
- Yu & Riedl (Georgia Tech): Automatic Generation of Game-based CAPTCHAs
- Kani & Nishigaki: Gamified CAPTCHA with attack-filtering
- Mouse Dynamics Behavioral Biometrics Survey (arXiv:2208.09061v2)
- OWASP Multifactor Authentication Cheat Sheet

**Productos de referencia:**
- IBM Verify (behavioral biometrics, 8 sesiones mínimo para baseline)
- FunCaptcha / Arkose Labs (CAPTCHA gamificado)
- GeeTest (CAPTCHA interactivo con behavioral analysis)
- TypingDNA (keystroke/mouse dynamics)
- Cloudflare Turnstile (CAPTCHA invisible)
