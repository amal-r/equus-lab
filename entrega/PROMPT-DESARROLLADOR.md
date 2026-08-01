# Prompt para el desarrollador (Claude / VS Code) — Construir "Equus Lab"

Copia y pega esto como instrucción inicial al abrir la carpeta. Los ficheros de esta carpeta son la
especificación: úsalos como fuente de verdad.

---

Eres un desarrollador full-stack senior. Tienes que construir **Equus Lab**, una app móvil que analiza
vídeos de equitación con IA y corrige al jinete como un profesor experto en biomecánica del caballo
(doma clásica, salto, completo, doma vaquera y trabajo pie a tierra).

## Ficheros de referencia en esta carpeta (léelos antes de empezar)
- **`Equus Lab.dc.html`** — el PROTOTIPO de diseño funcional y completo de la app. Es la fuente visual y
  de UX: pantallas, flujos, textos, estados, navegación. Ábrelo en el navegador para verlo. Replica su
  aspecto (colores cálidos, acento terracota #c05f3a, tipografía Manrope, esquinas redondeadas, modo
  claro/oscuro) y su comportamiento pantalla a pantalla.
- **`ARQUITECTURA-IA.md`** — decisiones de IA, costes, planes de suscripción y por qué. NO cambies el
  modelo elegido (Gemini 3.1 Flash-Lite) sin avisar.
- **`IMPLEMENTACION.md`** — el plano técnico con código real de las 3 capas (on-device, backend, IA).
  Sigue ese diseño.

## Qué construir

### 1. App móvil (React Native + Expo, TypeScript)
Recrea TODAS las pantallas del prototipo:
- **Onboarding:** bienvenida, crear cuenta, iniciar sesión, olvidé contraseña, modo demo.
- **Inicio:** saludo, "uso de hoy" (solo plan gratis), consejo del día, acceso a subir y al chat.
- **Subir vídeo:** abre el carrete del móvil, tope 3 min gratis / según plan en premium, elegir caballo,
  disciplina y foco (incluye "Pie a tierra"). Monta o trabajo pie a tierra.
- **Procesando** → **Resultado** (nota, correcciones con marca de tiempo, biomecánica del caballo).
- **Comparación** con técnica de referencia.
- **Chat** con el entrenador IA (gratis: 3 preguntas/día; premium: ilimitado con fair-use).
- **Progreso** (histórico y estadísticas).
- **Concursos:** grabar un simulacro y que la IA lo puntúe como un juez real por disciplina.
- **Perfil:** jinete (nombre, edad, años montando), caballos (nombre, edad, tipo —yegua/semental/
  castrado/macho/pony con distintivo visual—, raza, disciplina, alzada opcional, nivel opcional),
  añadir/editar/eliminar caballo.
- **Ajustes (⚙️):** tono del entrenador, notificaciones, suscripción, idioma (ES/EN), modo oscuro,
  cerrar sesión, eliminar perfil/cuenta.
- **Suscripción:** 3 planes (Premium 9,99€/300min, Pro 19,99€/800min, Elite 34,99€/2000min), mensual y
  anual (−20%), barra "uso del mes", pack extra +100 min, cancelar/reactivar.

### 2. Análisis ON-DEVICE (plan gratis, coste 0)
Integra **MediaPipe Pose** (o Vision en iOS / ML Kit en Android) para analizar el vídeo en el propio
móvil a 1–2 fps y sacar ángulos del jinete → nota + correcciones básicas. Ver código en
`IMPLEMENTACION.md` §1. Clips ≤ 2–3 min, sin llamar a ningún servidor.

### 3. Backend "portero" (Node/Express o Supabase)
Auth + cuentas + validación de suscripción (recibos Apple/Google o RevenueCat) + cuotas por plan +
rate-limit. Endpoints en `IMPLEMENTACION.md` §2. **La API key NUNCA en la app**, solo en el servidor.

### 4. Servidor IA (solo Premium): Gemini 3.1 Flash-Lite
El backend llama a Gemini con el system prompt de juez/entrenador y devuelve JSON (nota, correcciones,
biomecánica, ejercicio, chat). Código en `IMPLEMENTACION.md` §3. Prepáralo para poder cambiar a
Qwen-VL self-host sin tocar la app.

## Reglas
- Seguridad primero: claves en variables de entorno, HTTPS, tokens en Keychain/Keystore, vídeos con URL
  firmada. Ver `IMPLEMENTACION.md` §4.
- Los límites (minutos, nº de análisis, preguntas) los IMPONE el backend, no la app.
- Tono de la IA: técnico y experto en biomecánica, pero cercano y motivador. En español (y EN).
- Empieza por el esqueleto navegable de la app + on-device (para tener algo gratis funcionando), luego
  backend + suscripciones, luego IA premium.

## Entregables esperados
1. Repo de la app (Expo) con todas las pantallas navegables.
2. Módulo on-device funcionando con un vídeo de prueba.
3. Backend con los endpoints y validación de suscripción.
4. Integración Gemini para premium.
5. README con cómo arrancar cada parte y qué variables de entorno hacen falta.

Pregúntame lo que necesites antes de asumir. Prioriza que la parte gratis (on-device) funcione end-to-end
primero.
