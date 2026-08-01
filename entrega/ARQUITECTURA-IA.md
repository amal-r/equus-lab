# Equus Lab — Arquitectura de IA, tokens y límites

## 1. Estado actual (importante)
El prototipo **no ataca ninguna API real**. El "análisis", las notas, el chat del entrenador y el
juez de concursos están **simulados** en el propio código (respuestas y puntuaciones de ejemplo).
Sirve para validar el producto y la experiencia, no para procesar vídeo real todavía.

## 2. Regla de oro de seguridad
**NUNCA** pongas la API key del modelo de IA en la app (ni iOS, ni Android, ni web).
Cualquiera puede descompilar la app o mirar el tráfico y robarla → te gastarían el crédito.
La app **solo** habla con **tu propio backend**; el backend es el único que conoce las claves.

```
[App móvil] ──HTTPS + token de sesión──> [Tu backend / proxy] ──API key secreta──> [Modelos de IA]
                                              │
                                              ├─ valida usuario (login)
                                              ├─ valida suscripción (gratis / Premium)
                                              ├─ aplica límites (minutos, tokens, nº análisis)
                                              └─ guarda historial y facturación
```

## 3. Qué modelos de IA hacen falta
El análisis ecuestre necesita **visión por vídeo**, no solo texto:

1. **Estimación de pose (pose estimation)** del jinete y del caballo por fotograma
   (ángulos de talón, mano, línea codo–boca, flexión del corvejón, trancos).
   → modelo de visión propio o servicio especializado; es lo que más cuesta computacionalmente.
2. **Modelo de lenguaje (LLM)** que convierte esas métricas en:
   - correcciones con marca de tiempo,
   - comentario del entrenador / juez,
   - respuestas del chat.
   → aquí es donde entran los **tokens**.

## 4. Flujo de un análisis
1. La app sube el vídeo al backend (o a almacenamiento tipo S3 con URL firmada).
2. El backend **valida suscripción y límites** antes de gastar nada.
3. Extrae fotogramas → pose estimation → métricas biomecánicas.
4. Envía las métricas (texto/JSON, **no** el vídeo) al LLM → feedback.
5. Devuelve el resultado a la app y lo guarda en el historial.

> Truco de coste: al LLM le mandas **datos ya medidos**, no el vídeo. Así el gasto de tokens es
> pequeño y estable. El vídeo lo procesa el modelo de visión, que cobras por minuto/fotograma.

## 5. Tokens y coste (dónde se va el dinero)
- **Visión / pose:** se cobra por **minuto de vídeo o por fotograma** analizado. Es el coste dominante.
  Por eso el tope de **10 min en el plan gratis** protege el margen.
- **LLM (texto):** se cobra por **tokens** (entrada + salida). Un análisis y unos mensajes de chat
  son baratos si solo mandas métricas resumidas.
- Guarda por usuario: minutos consumidos, nº de análisis y tokens del mes → para límites y facturación.

## 6. Límites por plan (definitivo)
| | Gratis | Premium |
|---|---|---|
| Duración por vídeo | **3 min** | Sin límite |
| Análisis / día | **3** | Ilimitados* |
| Preguntas al chat / día | **3** | Ilimitadas* |
| Simulacro de concurso (juez IA) | No | Sí |
| Comparación con referencia | Limitada | Completa |
| Caballos | 1–2 | Ilimitados |

\* "Ilimitado" siempre con un **límite justo (fair-use)** por detrás para evitar abusos.
Los contadores (3 análisis, 3 preguntas) se **reinician cada día** y los **cuenta el backend**, no la app.

## 7. Validación de suscripción (clave)
- **Nunca** te fíes de un flag guardado en la app ("es Premium = true"). Se puede falsear.
- La suscripción se compra con **Apple App Store / Google Play** (in-app purchase).
- El backend **verifica el recibo** contra Apple/Google (o usa una pasarela tipo RevenueCat) y
  guarda el estado real (activa, cancelada, caducada) en tu base de datos.
- En **cada** petición de análisis: el backend comprueba el estado y **entonces** decide si procesa.

## 8. Endpoints mínimos del backend
```
POST /auth/register            crear cuenta
POST /auth/login               iniciar sesión → token
POST /auth/forgot-password     enviar enlace de recuperación
DELETE /account                eliminar cuenta y datos

GET  /subscription             estado real (gratis/premium, renovación)
POST /subscription/verify      validar recibo de Apple/Google

POST /videos                   subir vídeo (devuelve id) — valida límites aquí
POST /analyses                 lanzar análisis de un vídeo
GET  /analyses/:id             resultado (notas, correcciones, biomecánica)
POST /chat                     mensaje al entrenador IA (consume tokens)
POST /shows/judge              simulacro de concurso → hoja de puntuación

GET  /horses  /  POST /horses  /  PUT /horses/:id  /  DELETE /horses/:id
GET  /progress                 histórico y estadísticas
```

## 9. Qué IA es más económica + CUÁNTO CUESTA (con números)

### Aclaración importante sobre tu suscripción
Tu **Gemini Pro anual** (la app de Google, ~20 €/mes) es para **tu uso personal** en la app de Gemini.
**No sirve** para dar servicio a los usuarios de tu app: eso va por la **API de Gemini**, que se paga
**por tokens** (aparte de tu suscripción). Son dos cosas distintas.

### Precios de la API (ref. verano 2026 — confírmalos en ai.google.dev/gemini-api/docs/pricing)
Por millón de tokens (entrada / salida):
- **Gemini Flash-Lite (el más barato):** ~**$0.10–0.30** entrada / ~**$0.40–2.50** salida.
- **Gemini 3.5 Flash:** ~**$0.75–1.50** entrada / ~**$4.50–9** salida.
- El vídeo cuenta como tokens de entrada (~**300 tokens por segundo** de vídeo, menos en baja resolución).

### Coste real de UN análisis de 3 min (estimación)
- Vídeo: 3 min × 60 s × ~300 tokens/s ≈ **54.000 tokens** de entrada.
- Feedback: ~1.500 tokens de salida.
- Con **Flash-Lite** (~$0.30/M in, $2.50/M out): **≈ $0.02** por análisis.
- Con **Flash 3.5** (~$1.50/M in, $9/M out): **≈ $0.10** por análisis.
- El **chat** (mandando solo métricas, no el vídeo): céntimos por conversación.

### Traducción a dinero por usuario/mes
- **Usuario Premium activo** que analiza mucho (p. ej. 2 vídeos/día = 60/mes):
  entre **$1.2 y $6/mes** de coste de IA (según modelo).
- Un **usuario gratis** (tope 3/día pero de media mucho menos) rara vez pasa de **$1/mes**, y no paga
  → por eso el tope existe.

### Recomendación de precio de Premium
- Coste de IA por usuario Premium: **~2–6 €/mes** en el peor caso.
- Súmale comisión de la tienda (**Apple/Google se quedan ~15–30%**) y margen.
- **Premium recomendado: 9,99 €/mes** (o **~79 €/año**, que da descuento y fideliza).
  A 9,99 €: tras la comisión de tienda te quedan ~7–8,5 €; restando ~2–6 € de IA → **margen positivo**
  incluso con usuarios intensivos. El anual mejora la caja y baja el coste de captación.
- Si quieres colchón para power-users, un **fair-use** (p. ej. aviso a partir de X análisis/día) protege el margen.

### Cómo bajar el coste (para ganar más margen)
- Analiza el vídeo en **baja resolución** y a **1–2 fotogramas/seg** (no necesitas 30 fps para medir postura).
- Usa **pose estimation open-source** (MediaPipe/YOLO-Pose) en tu servidor → el vídeo deja de pagar por token;
  el LLM solo recibe las métricas (texto) y cuesta céntimos.
- **Context caching** para el system prompt del entrenador (hasta ~90% menos en esa parte).

## 11. Plan gratis sin perder dinero (2 vídeos/día) + Premium por tokens

**Objetivo:** dar un buen gratis (2 análisis de 3 min al día) sin que te cueste, y que Premium se
autofinancie con el consumo.

### La API con capa gratis: Gemini (AI Studio)
- Gemini tiene una **capa gratis** por AI Studio: los modelos **Flash/Flash-Lite** se usan **gratis
  dentro de límites de rate** (aprox. 5–15 peticiones/min y ~1.000 peticiones/día por proyecto).
- **Truco/límite:** en la capa gratis, **Google puede usar los datos** para mejorar sus productos.
  Para una app pública conviene avisarlo en tu política de privacidad, o pasar a capa de pago.
- Ese cupo es **por tu proyecto**, no por usuario → sirve para **lanzar y testear** gratis, pero con
  muchos usuarios te quedas corto y hay que pasar a pago.

### Lo bueno: aunque pagues, el gratis casi no cuesta
- Un análisis de 3 min en **Flash-Lite** ≈ **$0.02**. Dos al día = **~$0.04/día** por usuario activo.
- Un usuario gratis activo todo el mes ≈ **$1–1.2/mes** en el peor caso (y la mayoría usa menos).
- Con **pose estimation open-source** en tu servidor, el gratis baja casi a **$0** de coste variable.

### Receta recomendada (no pierdes dinero)
1. **Empieza en la capa gratis de Gemini** (coste 0) mientras validas y tienes pocos usuarios.
2. Pon **topes duros en tu backend**: 2 análisis/día y 3 min máx en gratis (ya está en el diseño).
3. Añade un **presupuesto mensual global** de API (alerta/corte) para que un pico no te dispare la factura.
4. Cuando crezcas, mueve el vídeo a **pose open-source en tu servidor** → el gratis deja de costar por token.
5. **Premium:** sin topes de nº, pero **medido por consumo** (tokens/minutos) con **fair-use**. Como el
   Premium paga 9,99 €/mes y su coste de IA es ~2–6 €, cada Premium **subvenciona** a varios usuarios gratis.

### Regla de oro del margen
Gratis = **captación** (coste bajo y controlado por topes). Premium = **ingreso** que cubre su propio
consumo y el de los gratis. Mientras la conversión a Premium sea razonable (**~3–5%**), ganas dinero.

## 12. IAs chinas vs Gemini — comparativa para VÍDEO (verano 2026)

> Precios de referencia por millón de tokens (in / out). Cambian a menudo — confírmalos en la web oficial.
> **Ojo:** analizar equitación necesita **visión de vídeo**. No todos los modelos "baratos" ven vídeo.

| Modelo | Ve vídeo nativo | Precio in/out (1M tok) | Capa gratis real | Notas |
|---|---|---|---|---|
| **Gemini 2.5 Flash-Lite** | ✅ (vídeo+audio) | **$0.10 / $0.40** | ✅ AI Studio ~1.000 req/día | El más barato que ve vídeo. Se retira 16-oct-2026 |
| **Gemini 3.1 Flash-Lite** | ✅ | $0.25 / $1.50 | ✅ AI Studio | El sustituto tras octubre |
| **Qwen-VL (Alibaba)** | ✅ (imagen+vídeo) | **$0.40 / $1.60** | ⚠️ solo trial 1M tok/modelo, 90 días (Singapur) | La opción china que SÍ ve vídeo |
| **Qwen open-weight (self-host)** | ✅ (Qwen-VL) | **$0 por token** | ✅ gratis en tu hardware (Apache 2.0) | Pagas la GPU, no las llamadas |
| **DeepSeek V4 Flash** | ❌ (texto/razonamiento) | $0.14 / $0.28 | ⚠️ solo 5M tok de regalo, no permanente | Baratísimo pero **NO analiza vídeo** — solo texto/chat |

### Traducción para tu caso (análisis de 3 min de vídeo ≈ 54.000 tokens de entrada)
- **Gemini Flash-Lite:** ~**$0.02** por análisis. El más barato que ve vídeo directamente.
- **Qwen-VL (API):** ~**$0.05** por análisis. Algo más caro que Gemini, misma idea.
- **DeepSeek:** **descartado para ver el vídeo** — no tiene visión de vídeo fuerte. Solo serviría para
  el chat de texto una vez tienes las métricas, y ahí Gemini Flash-Lite ya es más barato y ve el vídeo.

### ¿Cuál tiene "gratis de verdad, coste 0"?
1. **Capa gratis de Gemini (AI Studio):** ~1.000 peticiones/día **gratis** para toda tu app. Es lo más
   fácil para lanzar a coste 0. Contrapartida: en gratis Google puede usar los datos → decláralo.
2. **Qwen open-weight en tu propio servidor:** coste **$0 por token** para siempre (licencia Apache 2.0).
   Pagas solo la máquina/GPU (fija). Es el único "gratis real e ilimitado", pero tienes que montar y
   mantener el servidor. Rentable cuando tengas volumen.
3. DeepSeek y Qwen-API solo dan un **regalo inicial** de tokens, no un gratis permanente.

### Recomendación para Equus Lab
- **Para lanzar (0 €):** **Gemini 2.5 Flash-Lite** en la capa gratis de AI Studio. Ve el vídeo, escribe
  el feedback y el chat, y es lo más barato del mercado que hace las tres cosas.
- **Migra antes de octubre 2026** a **Gemini 3.1 Flash-Lite** (el 2.5 se retira).
- **Para escalar y no pagar por vídeo:** monta **Qwen-VL open-weight** en tu servidor (coste 0 por token)
  para sacar las métricas, y deja un LLM barato solo para el texto. Es el plan de coste mínimo a largo plazo.
- **DeepSeek:** útil solo si algún día quieres un chat de texto ultrabarato **después** de tener las
  métricas; no para mirar el vídeo.

> Resumen: la más barata que **ve vídeo** es **Gemini Flash-Lite**; la china equivalente es **Qwen-VL**
> (un poco más cara vía API, pero **gratis de verdad si la auto-alojas**). **DeepSeek no ve vídeo**, así
> que no encaja como analizador de equitación aunque sea la más barata en texto.

## 13. ELECCIÓN FINAL (sin migraciones): Gemini 3.1 Flash-Lite

**El modelo que eliges y no tocas más: Gemini 3.1 Flash-Lite.**
Es de la generación actual (2026), ve vídeo nativo, tiene capa gratis en AI Studio y **no tiene fecha
de retirada** como el 2.5 (que muere el 16-oct-2026). Empiezas aquí y te olvidas.

- **Precio API:** $0.25 / $1.50 por millón de tokens (in / out).
- **Capa gratis (AI Studio):** ~1.000 peticiones/día **gratis para toda tu app**, sin tarjeta.
- **Ve vídeo + escribe feedback + chat**: las tres cosas con un solo modelo → menos código, nada que migrar.

### Qué te cubre la capa gratis (0 €)
La cuota gratis es ~1.000 análisis/día **entre todos tus usuarios juntos** (no por usuario). Con topes
de la app (2 análisis/día gratis + 3 preguntas de chat), eso da de sobra para **cientos de usuarios**
activos sin pagar un céntimo mientras arrancas.

- Cada análisis de 3 min ≈ 1 petición. Cada mensaje de chat ≈ 1 petición.
- Mientras la suma de toda tu app quede por debajo de ~1.000/día → **coste 0**.
- Si un día te pasas, Gemini simplemente frena (no te cobra sorpresa); ahí es cuando activas el pago,
  que sigue siendo baratísimo (~$0.05 por análisis con este modelo).

### Regla para no acordarte de nada
1. Usa **Gemini 3.1 Flash-Lite** y punto. No hay migración pendiente.
2. Deja los **topes en el backend** (2/día gratis, 3 preguntas chat) → controlan el gasto solos.
3. Pon una **alerta de presupuesto** en Google Cloud (ej. avísame si el mes pasa de 20 €). Es lo único
   que tienes que dejar montado una vez.

> Si quisieras la alternativa china equivalente: **Qwen-VL** (también ve vídeo), pero su gratis es solo
> un trial inicial, no permanente → para "gratis de verdad" Gemini 3.1 Flash-Lite es mejor punto de partida.

### Planes Premium (varios, precio fijo y margen conocido)
Coste IA con Gemini 3.1 Flash-Lite ≈ **$0.01/min** de vídeo (in+out). Tienda se lleva ~15%.

| Plan | Precio/mes | Cuota | Vídeos hasta | Coste IA máx (tope) | Margen mín. |
|---|---|---|---|---|---|
| **Premium** | 9,99 € | 300 min/mes | 20 min | ~2,7 € | ~5,8 € |
| **Pro** | 19,99 € | 800 min/mes | 40 min | ~7,2 € | ~9,8 € |
| **Elite** | 34,99 € | 2.000 min/mes | 90 min | ~18 € | ~11,7 € |

- Todos con **bloqueo suave** al 100% + pack extra (+100 min · 2,99 €). Nunca cargo sorpresa.
- El margen mínimo es el **peor caso** (usuario que agota la cuota); el usuario medio deja mucho más.
- "Cuánto pongo": estos precios cubren el coste aunque exploten la cuota → **beneficio garantizado**.

## 10. Qué cambia en el prototipo cuando haya backend real
- Sustituir las respuestas simuladas por llamadas `fetch` a estos endpoints.
- Añadir manejo de "cargando / error / sin conexión".
- Los límites (10 min, nº de análisis) los **impone el backend**, no la app.
- Guardar el token de sesión de forma segura (Keychain iOS / Keystore Android).
