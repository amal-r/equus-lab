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
| Análisis on-device (plan gratis) — `src/ondevice/analyzeClip.ts` | ⚠️ Simulado (determinista, sin red). Ver [§5](#5-siguiente-iteración-mediapipe-real) |
| Juez de concursos on-device — `src/ondevice/judgeShow.ts` | ⚠️ Simulado, mismo motivo |
| Persistencia local (perfil, caballos, historial, tema) | ✅ Real (`AsyncStorage` vía Zustand `persist`) |
| Token de sesión | ✅ Guardado en Keychain/Keystore (`expo-secure-store`), ver `src/services/session.ts` |
| Login/registro | ⚠️ Mock local en el store (`useAppStore`) hasta que conectes `EXPO_PUBLIC_API_URL` |
| Suscripción / compra real (StoreKit vía RevenueCat) | ✅ Real SI configuras `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (ver §5). Sin ella, "Suscribirme" simula el plan localmente |
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
| `REVENUECAT_SECRET_API_KEY` | Consulta el estado real de un suscriptor en RevenueCat (`/subscription/verify`) | No (sin ella, verify devuelve error en vez de activar algo sin comprobar) |
| `REVENUECAT_WEBHOOK_SECRET` | Cabecera Authorization que verifica que un webhook viene de RevenueCat | No (ver §5) |

### Endpoints

```
POST   /api/auth/register            crear cuenta
POST   /api/auth/login                iniciar sesión → token
POST   /api/auth/forgot-password      stub (no envía email todavía)
DELETE /api/account                   eliminar cuenta y datos

GET    /api/subscription               estado real del plan
POST   /api/subscription/verify        confirma una compra consultando el estado REAL en RevenueCat
POST   /api/subscription/cancel        lo llama el webhook, no la app (Apple/Google no dejan cancelar por API)
POST   /api/subscription/reactivate
POST   /api/subscription/buy-pack      +100 min
POST   /api/webhooks/revenuecat        eventos de RevenueCat (renovación, cancelación, impago) — sin auth de usuario, valida la cabecera Authorization

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

## 4. Suscripciones reales (RevenueCat)

El botón "Suscribirme" ya está conectado a una compra real de App Store/Google Play vía
**RevenueCat** (`app/src/services/purchases.ts`). Sin configurar nada, sigue funcionando en
modo simulado (igual que Gemini): útil para probar el resto de la app sin cuentas externas.

### Pasos para activarlo

1. Crea una cuenta gratis en [revenuecat.com](https://www.revenuecat.com) y un proyecto.
2. En **Products**, crea los mismos identificadores que uses en App Store Connect / Google
   Play. Convención usada por el código (`productIdFor()` en `purchases.ts`):

   ```
   com.equuslab.app.premium.monthly   com.equuslab.app.premium.annual
   com.equuslab.app.pro.monthly       com.equuslab.app.pro.annual
   com.equuslab.app.elite.monthly     com.equuslab.app.elite.annual
   ```
3. En **Entitlements**, crea tres: `premium`, `pro`, `elite` (los nombres importan, los lee
   `ENTITLEMENT_TO_TIER`/`ENTITLEMENT_ORDER` en `purchases.ts` y `server/src/revenuecat.js`).
   Adjunta cada producto mensual/anual a su entitlement correspondiente.
4. En **Offerings**, crea un offering `default` con los 6 paquetes (uno por producto).
5. Copia las **claves públicas** (Project settings → API keys) a `app/.env`:
   `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
6. Copia la **clave secreta** del proyecto a `server/.env` → `REVENUECAT_SECRET_API_KEY`.
7. En **Integrations → Webhooks**, añade `https://tu-backend/api/webhooks/revenuecat`, pon un
   valor de cabecera Authorization a tu elección, y pon ese mismo valor en `server/.env` →
   `REVENUECAT_WEBHOOK_SECRET`.

### Una pieza que falta para que el webhook sea 100% correcto

El webhook identifica al usuario por el mismo id con el que la app llamó a
`Purchases.configure({ appUserID })`. Hoy `configurePurchases()` se llama **sin** `appUserID`
(modo anónimo), porque el login de la app todavía es un mock local (no hay id de usuario real
del backend disponible en el cliente — ver tabla de arriba). Esto significa:

- **La compra en sí funciona perfectamente** (StoreKit/Google Play la procesan de verdad,
  `handleSubscribe`/`handleRestore` desbloquean el plan al instante vía el propio SDK).
- Pero el **webhook** no podrá enlazar renovaciones/cancelaciones futuras con la cuenta
  correcta de tu backend hasta que conectes el login real (`/api/auth/login`) y pases ese
  `user.id` como `appUserID` a `configurePurchases(user.id)` en `App.tsx`.

### Restaurar compras / gestionar suscripción

- "Restaurar compras" llama a `Purchases.restorePurchases()`.
- "Cancelar suscripción" abre la pantalla nativa de gestión (Apple/Google no permiten
  cancelar por API); el estado se actualiza solo cuando llega el webhook tras confirmar allí.

---

## 5. Siguiente iteración: MediaPipe real

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
- Antes de producción: sustituir el stub de `/api/videos` por URLs firmadas reales de S3/GCS
  con caducidad. `/api/subscription/verify` y el webhook de RevenueCat ya validan de verdad
  (ver §4) — solo falta conectar el login real para que el webhook identifique siempre a la
  cuenta correcta (mismo apartado).
