import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { subsDb } from '../db.js';
import { PLAN_DEFS, EXTRA_PACK_MIN } from '../plans.js';

export const subscriptionRouter = Router();

subscriptionRouter.get('/subscription', requireAuth, async (req, res) => {
  const sub = await subsDb.get(req.user.id);
  res.json(sub);
});

/**
 * Valida el recibo de Apple/Google (o el evento de RevenueCat) y activa el plan.
 * STUB: aquí falta la llamada real a App Store Server API / Play Developer API /
 * el webhook firmado de RevenueCat (ver README → "Conectar compras reales").
 * Nunca actives un plan fiándote de un flag mandado por la app sin pasar por aquí.
 */
subscriptionRouter.post('/subscription/verify', requireAuth, async (req, res) => {
  const { tier, ciclo, receipt } = req.body ?? {};
  if (!PLAN_DEFS[tier]) return res.status(400).json({ error: 'plan_invalido' });
  if (!receipt) return res.status(400).json({ error: 'recibo_requerido' });

  const def = PLAN_DEFS[tier];
  const validUntil = new Date(Date.now() + (ciclo === 'anual' ? 365 : 30) * 86400000).toISOString();
  const sub = await subsDb.set(req.user.id, {
    tier,
    ciclo: ciclo === 'anual' ? 'anual' : 'mensual',
    subEstado: 'activa',
    minUsed: 0,
    minTotal: def.minMes,
    validUntil,
  });
  res.json(sub);
});

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
