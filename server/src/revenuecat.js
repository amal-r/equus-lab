/**
 * Cliente mínimo de la REST API de RevenueCat (servidor → RevenueCat, con la
 * clave SECRETA — nunca la clave pública que lleva el SDK del móvil).
 * Referencia: https://www.revenuecat.com/docs/api-v1
 */
const SECRET_KEY = process.env.REVENUECAT_SECRET_API_KEY;

// Debe coincidir con los identificadores de entitlement creados en el dashboard
// de RevenueCat (uno por nivel de plan). De mayor a menor, para quedarnos con el
// más alto si por lo que sea hubiera más de uno activo.
const ENTITLEMENT_ORDER = ['elite', 'pro', 'premium'];

/**
 * Consulta el estado real de un suscriptor en RevenueCat. `appUserId` debe ser
 * el mismo id que la app pasó a `Purchases.configure({ appUserID })` (usamos el
 * id de nuestro propio usuario, así no hace falta tabla de mapeo aparte).
 * Devuelve `null` si no tiene ningún entitlement de plan activo ahora mismo.
 */
export async function fetchSubscriberTier(appUserId) {
  if (!SECRET_KEY) {
    throw Object.assign(new Error('revenuecat_no_configurado'), { status: 500 });
  }
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${SECRET_KEY}` },
  });
  if (!res.ok) {
    throw Object.assign(new Error('revenuecat_error'), { status: res.status === 404 ? 404 : 502 });
  }
  const data = await res.json();
  const entitlements = data?.subscriber?.entitlements ?? {};
  for (const tier of ENTITLEMENT_ORDER) {
    const ent = entitlements[tier];
    const stillValid = ent && (!ent.expires_date || new Date(ent.expires_date).getTime() > Date.now());
    if (stillValid) {
      return { tier, expiresDate: ent.expires_date ?? null };
    }
  }
  return null;
}
