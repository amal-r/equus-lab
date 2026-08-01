/**
 * Config del cliente. `EXPO_PUBLIC_API_URL` apunta al backend "portero" (server/).
 * Si no está definida, la app funciona igualmente: el plan gratis analiza on-device
 * (coste 0, sin red) y las funciones Premium caen a una simulación local muy básica
 * en vez de fallar, para que el flujo se pueda demostrar sin backend desplegado.
 *
 * Variables EXPO_PUBLIC_* se inyectan en tiempo de build por Expo (ver app/.env.example).
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
export const HAS_BACKEND = API_URL.length > 0;
