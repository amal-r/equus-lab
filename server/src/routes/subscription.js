import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { subsDb } from '../db.js';
import { PLAN_DEFS, EXTRA_PACK_MIN } from '../plans.js';
import { fetchSubscriberTier } from '../revenuecat.js';

export const subscriptionRouter = Router();

subscriptionRouter.get('/subscription', requireAuth, async (req, res) => {
  const sub = await subsDb.get(req.user.id);
  res.json(sub);
});

/**
 * Confirma una compra recién hecha en la app consultando el estado REAL del
 * suscriptor en RevenueCat (que a su vez ya validó el recibo con Apple/Google).
 * `revenueCatAppUserId` es el id con el que la app llamó a
 * `Purchases.configure({ appUserID })` — en nuestro caso, el id de este mismo
 * usuario, así no hace falta guardar un mapeo aparte.
 *
 * Esto es solo la confirmación inmediata tras comprar; los cambios posteriores
 * (renovación, cancelación, impago) llegan por el webhook de
 * `routes/webhooks.js`, que es la fuente de verdad continua.
 */
subscriptionRouter.post('/subscription/verify', requireAuth, async (req, res) => {
  const { revenueCatAppUserId } = req.body ?? {};
  if (!revenueCatAppUserId) return res.status(400).json({ error: 'revenue_cat_app_user_id_requerido' });

  try {
    const result = await fetchSubscriberTier(revenueCatAppUserId);
    if (!result) return res.status(402).json({ error: 'sin_suscripcion_activa' });
    const def = PLAN_DEFS[result.tier];
    const sub = await subsDb.set(req.user.id, {
      tier: result.tier,
      subEstado: 'activa',
      minUsed: 0,
      minTotal: def.minMes,
      validUntil: result.expiresDate,
    });
    res.json(sub);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

/**
 * "Cancelar" en el sentido de Apple/Google no lo dispara la app: el usuario lo
 * hace desde la pantalla nativa de gestión de suscripciones (la app solo abre
 * ese enlace, ver `Purchases.showManageSubscriptions()` en el cliente). Este
 * endpoint existe para marcar el estado localmente en cuanto llega el webhook
 * de CANCELLATION; no lo debe llamar la app directamente.
 */
subscriptionRouter.post('/subscription/cancel', requireAuth, async (req, res) => {
  const sub = await subsDb.set(req.user.id, { subEstado: 'cancelada' });
  res.json(sub);
});

subscriptionRouter.post('/subscription/reactivate', requireAuth, async (req, res) => {
  const sub = await subsDb.set(req.user.id, { subEstado: 'activa' });
  res.json(sub);
});

subscriptionRouter.post('/subscription/buy-pack', requireAuth, async (req, res) => {
  const cur = await subsDb.get(req.user.id);
  const sub = await subsDb.set(req.user.id, { minTotal: cur.minTotal + EXTRA_PACK_MIN });
  res.json(sub);
});
