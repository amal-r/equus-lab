# Equus Lab

App móvil que analiza vídeos de equitación con IA y corrige al jinete como un entrenador
experto en biomecánica (doma clásica, salto, completo, doma vaquera y trabajo pie a tierra).

Los documentos de producto/arquitectura originales están en [`entrega/`](entrega/):
[`Equus Lab.dc.html`](entrega/Equus%20Lab.dc.html) (prototipo visual), [`ARQUITECTURA-IA.md`](entrega/ARQUITECTURA-IA.md)
(decisiones de IA y costes) e [`IMPLEMENTACION.md`](entrega/IMPLEMENTACION.md) (plano técnico).

## Estructura del repo

```
app/       App Expo (React Native + TypeScript) — todas las pantallas
server/    Backend "portero" (Node/Express) — auth, cuotas, Gemini
entrega/   Documentos de referencia originales (no tocar)
```

## Arquitectura en una línea

```
[App] ── GRATIS ──────────────────────────────► análisis ON-DEVICE (coste 0, sin red)
[App] ── PREMIUM ── HTTPS + token ──► [server/] ── API key secreta ──► [Gemini 3.1 Flash-Lite]
```

La API key de IA **nunca** está en la app: vive solo en `server/.env`. Los límites (minutos,
nº de análisis, preguntas de chat) los impone el backend, no el cliente.

---

## 1. Arrancar la app (Expo)

```bash
cd app
npm install
npx expo start
```

Escanea el QR con la app **Expo Go** (Android/iOS) o pulsa `w` para abrirla en el navegador.

Sin ninguna variable de entorno, la app funciona igual de bien: el **plan gratis analiza
on-device** (sin red) y las funciones Premium caen a una simulación local para poder
demostrar el flujo completo sin backend desplegado.

### Variables de entorno (`app/.env`, opcional)

Copia `app/.env.example` → `app/.env`:

| Variable | Para qué sirve | Si no la pones |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | URL del backend (`server/`) para las llamadas Premium | La app usa una simulación local en vez de llamar a un backend real |

### Qué es real hoy y qué es simulado

| Módulo | Estado |
|---|---|
| Navegación, todas las pantallas, i18n ES/EN, tema claro/oscuro | ✅ Real |
| Selección de vídeo de la galería (`expo-image-picker`), reproducción (`expo-video`) | ✅ Real |
| Análisis on-device (plan gratis) — `src/ondevice/analyzeClip.ts` | ⚠️ Simulado (determinista, sin red). Ver [§4](#4-siguiente-iteración-mediapipe-real) |
| Juez de concursos on-device — `src/ondevice/judgeShow.ts` | ⚠️ Simulado, mismo motivo |
| Persistencia local (perfil, caballos, historial, tema) | ✅ Real (`AsyncStorage` vía Zustand `persist`) |
| Token de sesión | ✅ Guardado en Keychain/Keystore (`expo-secure-store`), ver `src/services/session.ts` |
| Login/registro/suscripción | ⚠️ Mock local en el store (`useAppStore`) hasta que conectes `EXPO_PUBLIC_API_URL` |
| Análisis Premium / chat / juez IA vía backend | ✅ Real SI configuras `EXPO_PUBLIC_API_URL` y el backend tiene `GEMINI_API_KEY` |

---

## 2. Arrancar el backend

```bash
cd server
npm install
cp .env.example .env
# Genera un JWT_SECRET propio:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# pégalo en .env → JWT_SECRET=...
npm run dev
```

Por defecto arranca en `http://localhost:8080` con un **proveedor de IA "mock"** (determinista,
sin red, coste 0) para poder probar TODO el flujo Premium sin tener aún la clave de Gemini.
Compruébalo:

```bash
curl http://localhost:8080/health
# {"ok":true,"aiProvider":"mock"}
```

### Variables de entorno (`server/.env`)

| Variable | Para qué sirve | Obligatoria |
|---|---|---|
| `PORT` | Puerto del backend | No (por defecto 8080) |
| `JWT_SECRET` | Firma los tokens de sesión | **Sí** |
| `GEMINI_API_KEY` | Activa el proveedor de IA real (Gemini). Vacía → usa el mock | No |
| `GEMINI_MODEL` | Modelo a usar | No (por defecto `gemini-3.1-flash-lite`, ver `ARQUITECTURA-IA.md`) |
| `CORS_ORIGIN` | Origen permitido para llamadas desde la app | No (por defecto `*`) |
| `REVENUECAT_WEBHOOK_SECRET` | Para cuando conectes compras reales (fase futura) | No |

### Endpoints

```
POST   /api/auth/register            crear cuenta
POST   /api/auth/login                iniciar sesión → token
POST   /api/auth/forgot-password      stub (no envía email todavía)
DELETE /api/account                   eliminar cuenta y datos

GET    /api/subscription               estado real del plan
POST   /api/subscription/verify        activa un plan (STUB: falta validar recibo real de Apple/Google)
POST   /api/subscription/cancel
POST   /api/subscription/reactivate
POST   /api/subscription/buy-pack      +100 min

POST   /api/videos                     valida duración del clip según el plan, devuelve upload URL (STUB: falta S3/GCS real)
POST   /api/analyses                   lanza un análisis Premium (valida cuota, llama a la IA)
GET    /api/analyses/:id
GET    /api/analyses
POST   /api/chat                       mensaje al entrenador IA (fair-use aplicado)
POST   /api/shows/judge                simulacro de concurso → hoja de puntuación

GET    /api/horses   POST /api/horses   PUT /api/horses/:id   DELETE /api/horses/:id
GET    /api/progress
```

Todas (salvo `/auth/*` y `/health`) requieren `Authorization: Bearer <token>`.

### Pasar a una base de datos real

`server/src/db.js` es una "base de datos" en memoria (se pierde al reiniciar), a propósito:
es el único fichero que hay que sustituir por Postgres/Supabase. Todas sus funciones ya son
`async`, así que las rutas no cambian.

### Conectar compras reales (Apple/Google)

`POST /api/subscription/verify` es un **stub**: activa el plan sin comprobar nada. Antes de
publicar, sustitúyelo por la verificación real del recibo (App Store Server API / Play
Developer API) o, más simple, integra el SDK de **RevenueCat** en la app y valida su webhook
aquí (ver `ARQUITECTURA-IA.md` §7 e `IMPLEMENTACION.md` §2).

---

## 3. Activar Gemini (Premium real)

1. Consigue una clave en [aistudio.google.com](https://aistudio.google.com) (capa gratis
   disponible, ver `ARQUITECTURA-IA.md` §13).
2. Ponla en `server/.env` → `GEMINI_API_KEY=...`.
3. Reinicia el backend: en el log verás `IA: gemini` en vez de `IA: mock`.
4. En `app/.env`, pon `EXPO_PUBLIC_API_URL` a la URL de tu backend.

`server/src/ai/geminiProvider.js` usa el SDK oficial **`@google/genai`** (el paquete
`@google/generative-ai` que aparece en `IMPLEMENTACION.md` quedó obsoleto el 31-ago-2025).
Implementa el mismo contrato que `mockProvider.js`, y `server/src/ai/index.js` elige uno u
otro según si hay clave — así que cambiar a **Qwen-VL self-host** en el futuro es escribir
`qwenProvider.js` con la misma forma y una línea en `index.js`, sin tocar la app.

---

## 4. Siguiente iteración: MediaPipe real

Hoy, `app/src/ondevice/analyzeClip.ts` y `judgeShow.ts` son generadores **deterministas**
(mismo vídeo + mismos ajustes → mismo resultado) sin cámara real de landmarks, para tener el
flujo completo (Subir → Procesando → Resultado → Comparación) funcionando de punta a punta
desde ya. La firma pública de `analyzeClip()` no va a cambiar cuando se sustituya por pose
real, así que las pantallas no necesitan tocarse.

Camino recomendado (ver `IMPLEMENTACION.md` §1 para más detalle):

- **Opción rápida (JS puro):** cargar `@mediapipe/tasks-vision` dentro de un `WebView` oculto
  de Expo y pasar los frames del vídeo vía `postMessage`. Funciona en Expo Go.
- **Opción nativa (mejor rendimiento):** `expo prebuild` + `react-native-vision-camera` con un
  frame processor que use `Vision` (iOS) / `ML Kit Pose Detection` (Android). Deja de valer
  Expo Go; hay que compilar un dev client.
- Pose del **caballo**: modelo animal (DeepLabCut/AP-10K) exportado a TFLite/CoreML — empezar
  solo con el jinete y añadirlo después, tal y como recomienda `IMPLEMENTACION.md`.

## Notas de seguridad

- La API key de Gemini vive solo en `server/.env`, nunca en el repo de la app ni en el bundle.
- El token de sesión se guarda en Keychain/Keystore vía `expo-secure-store`
  (`app/src/services/session.ts`), no en `AsyncStorage`.
- El backend valida la suscripción y las cuotas en **cada** petición Premium — la app nunca
  decide por sí sola si algo es gratis o de pago.
- Antes de producción: sustituir el stub de `/api/videos` por URLs firmadas reales de
  S3/GCS con caducidad, y el stub de `/api/subscription/verify` por la validación real de
  recibos (o RevenueCat).
