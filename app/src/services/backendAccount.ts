import { apiFetch, ApiError } from './apiClient';
import { HAS_BACKEND } from './config';
import { setToken } from './session';
import { identifyUser } from './purchases';
import { RiderProfile } from '../types/models';

interface RegisterResponse {
  token: string;
  user: { id: string; name: string; email: string };
}

function randomPassword(): string {
  // Solo autentica llamadas internas de esta app a su propio backend -- el
  // usuario nunca la ve ni la necesita. Si reinstala o cambia de móvil,
  // recupera su plan con "Restaurar compras" (RevenueCat/Apple), no haciendo
  // login con esto.
  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}Aa1!`;
}

/**
 * Crea una cuenta real en el backend la PRIMERA vez que alguien compra un
 * plan de pago -- nunca antes. Así, quien se queda en el plan gratis (la
 * inmensa mayoría) no genera ni una fila en la base de datos: el backend solo
 * se entera de quien realmente paga. Ver AjustesSuscripcionScreen.handleSubscribe.
 */
export async function ensureBackendAccount(rider: RiderProfile): Promise<string | null> {
  if (!HAS_BACKEND) return null;
  try {
    const email = rider.email?.trim() || `sub-${Date.now()}-${Math.random().toString(36).slice(2)}@equuslab.local`;
    const { token, user } = await apiFetch<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: rider.nombre || 'Jinete', email, password: randomPassword() }),
    });
    await setToken(token);
    return user.id;
  } catch (err) {
    // No bloqueamos la compra por esto: Apple/RevenueCat ya la confirmó. Si
    // falla (p.ej. email_en_uso de un intento previo), se reconciliará más
    // adelante -- el entitlement real vive en RevenueCat, no aquí.
    if (err instanceof ApiError) return null;
    throw err;
  }
}

/**
 * Red de seguridad para cuentas que ya eran Premium ANTES de que existiera
 * ensureBackendAccount (p.ej. compraron en una build anterior a este cambio):
 * sin esto se quedarian con planTier != 'free' pero sin backendUserId ni
 * token, y cualquier llamada al backend (chat, analisis) fallaria con 401 en
 * silencio. Se llama justo antes de usar una funcion Premium que necesite el
 * backend -- si ya hay backendUserId, no hace nada.
 */
export async function ensurePremiumIdentity(
  rider: RiderProfile,
  backendUserId: string | null,
  setBackendUserId: (id: string) => void
): Promise<void> {
  if (backendUserId || !HAS_BACKEND) return;
  const uid = await ensureBackendAccount(rider);
  if (uid) {
    setBackendUserId(uid);
    await identifyUser(uid);
  }
}
