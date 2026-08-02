import { Router } from 'express';
import { subsDb, usersDb } from '../db.js';
import { PLAN_DEFS } from '../plans.js';

export const webhooksRouter = Router();

// Eventos que conceden/renuevan un plan y su fecha de expiración
const GRANTING_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'SUBSCRIPTION_EXTENDED']);
// El usuario apagó la renovación automática: sigue activo hasta `expiration_at_ms`,
// coherente con cómo lo mostramos en Ajustes (subEstado:'cancelada' + fecha límite).
const SOFT_CANCEL_EVENTS = new Set(['CANCELLATION']);
// El plan ya terminó de verdad: vuelve a gratis.
const EXPIRING_EVENTS = new Set(['EXPIRATION']);

const ENTITLEMENT_ORDER = ['elite', 'pro', 'premium'];

function pickTier(entitlementIds) {
  return ENTITLEMENT_ORDER.find((t) => entitlementIds?.includes(t));
}

/**
 * Webhook de RevenueCat: fuente de verdad continua del estado de suscripción
 * (renovaciones, cancelaciones, impagos) sin que la app tenga que estar abierta.
 * Configúralo en RevenueCat → Integrations → Webhooks, con esta URL y el mismo
 * valor de cabecera Authorization que pongas en REVENUECAT_WEBHOOK_SECRET.
 *
 * Nota de seguridad: esto verifica solo la cabecera Authorization estática.
 * Para más garantías, RevenueCat también ofrece firma HMAC
 * (`X-RevenueCat-Webhook-Signature`) sobre el cuerpo crudo — recomendable antes
 * de manejar dinero real a gran escala (ver docs de RevenueCat, "Webhook signing").
 */
webhooksRouter.post('/webhooks/revenuecat', async (req, res) => {
  const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!expected || req.headers.authorization !== `Bearer ${expected}`) {
    return res.status(401).end();
  }

  const event = req.body?.event;
  if (!event?.app_user_id || !event?.type) return res.status(400).end();

  const userId = event.app_user_id; // configuramos Purchases.configure({ appUserID: nuestro user.id })
  const user = await usersDb.findById(userId);
  if (!user) return res.status(200).json({ ok: true, ignorado: 'usuario_no_encontrado' });

  if (GRANTING_EVENTS.has(event.type)) {
    const tier = pickTier(event.entitlement_ids);
    if (tier) {
      const def = PLAN_DEFS[tier];
      await subsDb.set(userId, {
        tier,
        subEstado: 'activa',
        minTotal: def.minMes,
        validUntil: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
      });
    }
  } else if (SOFT_CANCEL_EVENTS.has(event.type)) {
    await subsDb.set(userId, {
      subEstado: 'cancelada',
      validUntil: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
    });
  } else if (EXPIRING_EVENTS.has(event.type)) {
    await subsDb.set(userId, { tier: 'free', subEstado: 'gratis', minUsed: 0, minTotal: 0, validUntil: null });
  }

  res.json({ ok: true });
});
