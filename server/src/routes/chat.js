import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { subsDb, chatUsageDb } from '../db.js';
import { FREE_LIMITS } from '../plans.js';
import { chat as aiChat } from '../ai/index.js';

export const chatRouter = Router();

const PREMIUM_FAIR_USE_PER_DAY = 200; // fair-use, no es un límite comercial (ver ARQUITECTURA-IA.md §6)

chatRouter.post('/chat', requireAuth, async (req, res) => {
  const { question, history, metrics } = req.body ?? {};
  if (!question) return res.status(400).json({ error: 'pregunta_requerida' });

  const sub = await subsDb.get(req.user.id);
  const usedToday = await chatUsageDb.countToday(req.user.id);
  const cap = sub.tier === 'free' ? FREE_LIMITS.preguntasChatPorDia : PREMIUM_FAIR_USE_PER_DAY;
  if (usedToday >= cap) {
    return res.status(429).json({ error: sub.tier === 'free' ? 'limite_gratis_agotado' : 'fair_use_excedido' });
  }

  const { reply } = await aiChat({ question, history, metrics });
  await chatUsageDb.increment(req.user.id);
  res.json({ reply });
});
