# Equus Lab — Implementación real (on-device + backend + servidor IA)

Este documento es el **plano de construcción** para un desarrollador. La app de diseño (Equus Lab.dc.html)
es el front; aquí está TODO lo que va por detrás. Copia/pega y adapta.

Arquitectura en una línea:

```
[App móvil]
   ├─ GRATIS → análisis ON-DEVICE (MediaPipe en el propio móvil) ......... coste IA 0 €
   └─ PREMIUM → [Backend "portero"] → [Servidor IA (Gemini)] ............. coste solo de quien paga
                   ├─ login / cuentas
                   ├─ valida recibo Apple/Google (¿es Premium?)
                   ├─ cuenta minutos/tokens y aplica cuota
                   └─ NUNCA expone la API key
```

---

## PARTE 1 — Modelo ON-DEVICE (plan gratis, coste 0 para ti)

Corre dentro de la app, en el móvil del usuario. No hay servidor ni clave. Usa **MediaPipe Pose**
(gratis, Apache/BSD) para sacar los puntos del cuerpo del jinete por fotograma, y una función local
que convierte esos puntos en ángulos y consejos.

### React Native / Expo (JS)
```bash
npm i @mediapipe/tasks-vision
```

```js
// ondevice/analyzePose.js  — corre en el teléfono, sin red
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

let landmarker;
export async function initPose() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
  );
  landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: 'pose_landmarker_lite.task' }, // se empaqueta en la app
    runningMode: 'VIDEO', numPoses: 1,
  });
}

// Recorre el vídeo a 2 fps (no 30) → barato y suficiente para medir postura
export async function analyzeClip(videoEl, onProgress) {
  const fps = 2, dur = videoEl.duration, frames = [];
  for (let t = 0; t < dur; t += 1 / fps) {
    videoEl.currentTime = t;
    await new Promise(r => (videoEl.onseeked = r));
    const res = landmarker.detectForVideo(videoEl, t * 1000);
    if (res.landmarks?.[0]) frames.push({ t, lm: res.landmarks[0] });
    onProgress?.(t / dur);
  }
  return scoreFrames(frames);
}

// Biomecánica básica del JINETE (ángulos a partir de landmarks)
function scoreFrames(frames) {
  const issues = [];
  const ang = (a, b, c) => { // ángulo en b (grados)
    const ab = [a.x-b.x, a.y-b.y], cb = [c.x-b.x, c.y-b.y];
    const dot = ab[0]*cb[0]+ab[1]*cb[1];
    const m = Math.hypot(...ab)*Math.hypot(...cb);
    return Math.acos(dot/m) * 180/Math.PI;
  };
  for (const f of frames) {
    const L = f.lm; // índices MediaPipe: 24 cadera, 26 rodilla, 28 tobillo, 12 hombro
    const rodilla = ang(L[24], L[26], L[28]);
    if (rodilla < 95) issues.push({ t: f.t, tipo: 'Talón/base',
      msg: 'Ángulo de rodilla muy cerrado: baja el peso al estribo y estira la pierna.' });
    const espalda = ang(L[12], L[24], L[26]);
    if (Math.abs(espalda - 170) > 20) issues.push({ t: f.t, tipo: 'Asiento',
      msg: 'Tronco desalineado sobre la cadera: crece desde el ombligo y alinea hombro-cadera-talón.' });
  }
  // nota 1..10 según nº de incidencias
  const nota = Math.max(4, 10 - issues.length * 0.4).toFixed(1);
  return { nota, issues: dedupe(issues) };
}
const dedupe = a => Object.values(Object.fromEntries(a.map(i => [i.tipo + Math.round(i.t), i])));
```

> **Nativo puro:** iOS = **Vision** (`VNDetectHumanBodyPoseRequest`), Android = **ML Kit Pose Detection**.
> Ambos gratis, corren en el móvil. Para la **pose del CABALLO** usa un modelo animal (basado en
> DeepLabCut/AP-10K) exportado a TFLite/CoreML; empieza solo con el jinete y añade el caballo después.

**Límites gratis** (en la app, no cuestan nada): clips ≤ 2 min, 2 análisis/día. Feedback básico.

---

## PARTE 2 — BACKEND "portero" (auth + suscripción). Barato, ~5–20 €/mes

Node + Express (o Firebase Functions / Supabase Edge). Su único trabajo: saber **quién eres** y
**si eres Premium**, aplicar cuotas y ser el ÚNICO que habla con la IA de pago. La API key vive
solo aquí, en variables de entorno del servidor. Nunca en la app.

```js
// server/index.js
import express from 'express';
import jwt from 'jsonwebtoken';
const app = express(); app.use(express.json({ limit: '1mb' }));

// --- auth mínima ---
const auth = (req, res, next) => {
  try { req.user = jwt.verify(req.headers.authorization?.split(' ')[1], process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'no_auth' }); }
};

// --- estado de suscripción (verificado contra Apple/Google, cacheado en tu DB) ---
async function getPlan(userId) {
  const sub = await db.subs.find(userId);           // { tier:'pro', validUntil, minUsed, minQuota }
  if (!sub || sub.validUntil < Date.now()) return { tier: 'free', minQuota: 0, minUsed: 0 };
  return sub;
}

// --- LÍMITES por plan (el servidor manda, no la app) ---
const QUOTA = { free: 0, premium: 300, pro: 800, elite: 2000 };   // min/mes
const MAXCLIP = { free: 2, premium: 20, pro: 40, elite: 90 };      // min/vídeo

// --- endpoint de análisis PREMIUM (el vídeo va a la IA de pago) ---
app.post('/api/analyses', auth, async (req, res) => {
  const plan = await getPlan(req.user.id);
  if (plan.tier === 'free') return res.status(402).json({ error: 'necesita_premium' });

  const clipMin = req.body.durationSec / 60;
  if (clipMin > MAXCLIP[plan.tier]) return res.status(413).json({ error: 'clip_demasiado_largo' });
  if (plan.minUsed + clipMin > QUOTA[plan.tier])
    return res.status(429).json({ error: 'cuota_agotada', restante: QUOTA[plan.tier] - plan.minUsed });

  const feedback = await callAI(req.body.videoUrl, req.body.disciplina); // PARTE 3
  await db.subs.addMinutes(req.user.id, clipMin);   // descuenta de la cuota
  res.json(feedback);
});

// --- validar compra de la tienda (esto decide quién es Premium DE VERDAD) ---
app.post('/api/subscription/verify', auth, async (req, res) => {
  const ok = await verifyReceipt(req.body.platform, req.body.receipt); // ver abajo
  if (!ok.valid) return res.status(400).json({ error: 'recibo_invalido' });
  await db.subs.upsert(req.user.id, { tier: ok.tier, validUntil: ok.expires, minUsed: 0 });
  res.json({ tier: ok.tier, validUntil: ok.expires });
});

app.listen(8080);
```

### Validar el recibo (NO te fíes de un flag de la app)
- **Apple:** App Store Server API / verifyReceipt → devuelve producto y caducidad.
- **Google:** Play Developer API `purchases.subscriptions.get`.
- **Atajo recomendado:** usa **RevenueCat** (SDK en la app + webhook al backend). Te evita gestionar
  recibos de las dos tiendas a mano y te manda el estado "activo/cancelado" listo.

> Cuotas y contadores viven en TU base de datos (Postgres/Firestore). La app solo muestra lo que el
> backend le dice; si alguien trucara la app, el servidor sigue negando lo que no toca.

---

## PARTE 3 — SERVIDOR IA (solo Premium). Gemini 3.1 Flash-Lite

Elegido para no migrar nunca: generación actual, ve vídeo, sin fecha de retirada. La clave está aquí,
en el entorno del servidor. Le mandas el vídeo (o mejor, las métricas ya medidas) y devuelve el feedback.

```js
// server/ai.js
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);   // ← clave SOLO aquí

const SYSTEM = `Eres un juez y entrenador experto de equitación (doma clásica, salto, completo y
doma vaquera) con dominio de la biomecánica del caballo. Analizas la monta y devuelves:
1) nota 0-10, 2) 3-5 correcciones con marca de tiempo, 3) biomecánica del caballo, 4) un ejercicio.
Tono técnico pero cercano y motivador. Responde en JSON.`;

export async function callAI(videoUrl, disciplina) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM,
    generationConfig: { responseMimeType: 'application/json' },
  });
  // Opción económica: sube el vídeo a baja resolución y 1-2 fps
  const file = await uploadToGemini(videoUrl);   // Files API de Gemini
  const r = await model.generateContent([
    { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
    `Disciplina: ${disciplina}. Analiza esta monta.`,
  ]);
  return JSON.parse(r.response.text());
}
```

### Chat del entrenador (consume pocos tokens: solo texto)
```js
export async function chat(historial, pregunta, metricas) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite', systemInstruction: SYSTEM });
  const r = await model.generateContent([
    `Métricas de la última sesión: ${JSON.stringify(metricas)}`,
    ...historial, pregunta,
  ]);
  return r.response.text();
}
```

### Coste y control (para que NUNCA pierdas)
- ~$0.01 por minuto de vídeo → análisis de 3 min ≈ $0.03; de 20 min ≈ $0.20.
- **Alerta de presupuesto** en Google Cloud (Billing → Budgets) con corte por email. Móntala una vez.
- **Escala barata futura:** cambia `callAI` para apuntar a **Qwen-VL self-host** (mismo contrato JSON)
  → dejas de pagar por vídeo, pagas la GPU fija. La app no se entera.

---

## PARTE 4 — Seguridad (imprescindible)
- API key SOLO en variables de entorno del servidor. Jamás en la app ni en el repo.
- La app habla únicamente con TU backend (HTTPS + token de sesión).
- Sube vídeos con **URL firmada** (S3/GCS) con caducidad; no los sirvas públicos.
- Guarda el token de sesión en **Keychain (iOS) / Keystore (Android)**.
- Rate-limit por usuario en el backend (además de la cuota) para frenar abusos.

## PARTE 5 — Qué toca cambiar en la app cuando exista el backend
1. `login/registro/olvidé` → llamar a `/api/auth/*` y guardar el token.
2. Botón Suscribirme → SDK de RevenueCat/tienda → `/api/subscription/verify`.
3. Subir vídeo GRATIS → `analyzeClip()` on-device (sin red).
4. Subir vídeo PREMIUM → `/api/analyses`; pintar estados cargando/error/sin conexión.
5. Barra "Uso del mes" → leer cuota real de `/api/subscription`.
6. Chat → `/api/chat` (gratis: 3/día en cliente; premium: sin límite salvo fair-use del backend).

## Stack recomendado (rápido de montar)
- **App:** React Native (Expo) o Flutter.
- **On-device:** MediaPipe Pose (+ modelo caballo TFLite/CoreML más adelante).
- **Backend:** Supabase (auth + Postgres + Edge Functions) o Firebase — tienen capa gratis para arrancar.
- **Suscripciones:** RevenueCat.
- **IA:** Gemini 3.1 Flash-Lite → (a escala) Qwen-VL self-host en Runpod/Lambda.
