/**
 * Definición de planes y límites. Es la ÚNICA fuente de verdad para cuotas:
 * la app nunca decide esto, solo lo muestra. Coincide con ARQUITECTURA-IA.md §6 y §13.
 */
export const PLAN_DEFS = {
  premium: { id: 'premium', nombre: 'Premium', minMes: 300, clipMaxMin: 20, precioMensual: 9.99, precioAnual: 95.9 },
  pro: { id: 'pro', nombre: 'Pro', minMes: 800, clipMaxMin: 40, precioMensual: 19.99, precioAnual: 191.9 },
  elite: { id: 'elite', nombre: 'Elite', minMes: 2000, clipMaxMin: 90, precioMensual: 34.99, precioAnual: 335.9 },
};

export const FREE_LIMITS = {
  clipMaxMin: 3,
  analisisPorDia: 2,
  preguntasChatPorDia: 3,
};

export const EXTRA_PACK_MIN = 100;
