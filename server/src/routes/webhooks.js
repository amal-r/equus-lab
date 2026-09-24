import { Router } from 'express';
import crypto from 'node:crypto';
import { subsDb, usersDb } from '../db.js';
import { PLAN_DEFS } from '../plans.js';

export const webhooksRouter = Router();

// Firma HMAC del webhook (RevenueCat → Integrations → Webhooks → "Signing
// secret", DISTINTO del valor de la cabecera Authorization de más abajo).
// Si no se configura, se sigue aceptando solo con el secreto estático como
// hasta ahora -- no rompe nada mientras no se añada la variable en Railway.
const SIGNATURE_TOLERANCE_SEC = 300;

function verifyWebhookSignature(rawBody, header, secret) {
  if (!header || !rawBody) return false;
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const idx = p.indexOf('=');
      return [p.slice(0, idx), p.slice(idx + 1)];
    })
  );
  const timestamp = parts.t;
  const expectedSig = parts.v1;
  if (!timestamp || !expectedSig) return false;

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const computed = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expectedSig))) return false;
  } catch {
    return false; // longitudes distintas -> timingSafeEqual lanza en vez de devolver false
  }

  if (Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) > SIGNATURE_TOLERANCE_SEC) return false;
  return true;
}

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
 * Verificación en dos capas: la cabecera Authorization estática de siempre,
 * más (si REVENUECAT_WEBHOOK_SIGNING_SECRET está configurado) la firma HMAC
 * real sobre el cuerpo crudo -- así, aunque alguien adivinara/filtrara el
 * secreto estático, no podría falsificar un evento sin el secreto de firma.
 */
webhooksRouter.post('/webhooks/revenuecat', async (req, res) => {
  const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!expected || req.headers.authorization !== `Bearer ${expected}`) {
    return res.status(401).end();
  }

  const signingSecret = process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
  if (signingSecret) {
    const sigHeader = req.headers['x-revenuecat-webhook-signature'];
    if (!verifyWebhookSignature(req.rawBody, sigHeader, signingSecret)) {
      return res.status(401).end();
    }
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
