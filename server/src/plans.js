/**
 * Definición de planes y límites. Es la ÚNICA fuente de verdad para cuotas:
 * la app nunca decide esto, solo lo muestra. Coincide con ARQUITECTURA-IA.md §6 y §13.
 */
export const PLAN_DEFS = {
  premium: { id: 'premium', nombre: 'Premium', minMes: 300, clipMaxMin: 20, precioMensual: 9.99, precioAnual: 95.9 },
  pro: { id: 'pro', nombre: 'Pro', minMes: 800, clipMaxMin: 40, precioMensual: 19.99, precioAnual: 191.99 },
  elite: { id: 'elite', nombre: 'Elite', minMes: 2000, clipMaxMin: 90, precioMensual: 34.99, precioAnual: 339.99 },
};

// Cupo gratis DE POR VIDA por cuenta -- no se resetea nunca (ni a diario ni de
// ninguna otra forma). Ver models.ts FREE_LIMITS en la app, debe ir sincronizado.
export const FREE_LIMITS = {
  clipMaxMin: 3,
  analisisGratisTotal: 1,
  preguntasChatGratisTotal: 3,
};

export const EXTRA_PACK_MIN = 100;

// Escaneo morfológico: se resetea cada mes (no es "de por vida" como
// analisisGratisTotal). Ver models.ts MORPH_LIMITS en la app, debe ir sincronizado.
export const MORPH_LIMITS = {
  scansPorMesGratis: 1,
  scansPorMesPremium: 10,
};
