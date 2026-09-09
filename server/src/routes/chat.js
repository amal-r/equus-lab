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
  // Gratis: cupo de por vida por cuenta, nunca se resetea. Premium: fair-use diario
  // (no es un limite comercial, ver ARQUITECTURA-IA.md §6).
  const isFree = sub.tier === 'free';
  const used = isFree ? await chatUsageDb.countTotal(req.user.id) : await chatUsageDb.countToday(req.user.id);
  const cap = isFree ? FREE_LIMITS.preguntasChatGratisTotal : PREMIUM_FAIR_USE_PER_DAY;
  if (used >= cap) {
    return res.status(429).json({ error: isFree ? 'limite_gratis_agotado' : 'fair_use_excedido' });
  }

  const { reply } = await aiChat({ question, history, metrics });
  await chatUsageDb.increment(req.user.id);
  res.json({ reply });
});
