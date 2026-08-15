import { apiFetch, ApiError } from './apiClient';
import { HAS_BACKEND } from './config';

/**
 * Avisa al backend de una compra recién confirmada por RevenueCat, para que
 * sincronice su propia cuota de minutos (que es lo que de verdad protege el
 * gasto de IA — ver server/src/routes/analyses.js). Es "best effort": si el
 * backend no está configurado o la llamada falla, no bloqueamos al usuario,
 * porque el entitlement real ya lo dio RevenueCat/StoreKit en el propio
 * dispositivo. La consistencia final llega por el webhook de RevenueCat.
 */
export async function notifyBackendOfPurchase(revenueCatAppUserId: string): Promise<void> {
  if (!HAS_BACKEND) return;
  try {
    await apiFetch('/api/subscription/verify', {
      method: 'POST',
      body: JSON.stringify({ revenueCatAppUserId }),
    });
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    // no_backend o error puntual: se reconciliará con el próximo webhook/sync.
  }
}

/** Igual que notifyBackendOfPurchase, pero para el pack de +100 min (compra consumible, sin entitlement). */
export async function notifyBackendOfExtraPack(): Promise<void> {
  if (!HAS_BACKEND) return;
  try {
    await apiFetch('/api/subscription/buy-pack', { method: 'POST' });
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }
}
