import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { subsDb, analysesDb } from '../db.js';
import { PLAN_DEFS } from '../plans.js';
import { analyzeVideo } from '../ai/index.js';

export const analysesRouter = Router();
analysesRouter.use(requireAuth);

function timeLabel(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

analysesRouter.post('/analyses', async (req, res) => {
  const { videoUrl, durationSec, disciplina, foco, esPieATierra, caballo } = req.body ?? {};
  if (!videoUrl || !disciplina || !caballo) return res.status(400).json({ error: 'datos_invalidos' });

  const sub = await subsDb.get(req.user.id);
  if (sub.tier === 'free') return res.status(402).json({ error: 'necesita_premium' });

  const clipMin = (durationSec ?? 0) / 60;
  const def = PLAN_DEFS[sub.tier];
  if (clipMin > def.clipMaxMin) return res.status(413).json({ error: 'clip_demasiado_largo', maxMin: def.clipMaxMin });
  if (sub.minUsed + clipMin > sub.minTotal) {
    return res.status(429).json({ error: 'cuota_agotada', restante: Math.max(0, sub.minTotal - sub.minUsed) });
  }

  const feedback = await analyzeVideo({ videoUrl, durationSec, disciplina, foco, esPieATierra, caballo });
  await subsDb.addMinutes(req.user.id, clipMin);

  const tips = (feedback.tips ?? []).map((t) => ({
    timeSec: t.timeSec,
    timeLabel: t.timeLabel ?? timeLabel(t.timeSec ?? 0),
    text: t.text,
  }));

  const record = await analysesDb.create(req.user.id, {
    caballo,
    disciplina,
    foco: foco ?? 'Todo el conjunto',
    ejercicio: esPieATierra ? 'Trabajo pie a tierra' : disciplina === 'Salto' ? 'Gimnasia de salto' : 'Sesión analizada',
    esPieATierra: !!esPieATierra,
    nota: feedback.nota,
    subscores: feedback.subscores ?? [],
    bienHecho: feedback.bienHecho ?? '',
    tips,
    ejercicioSemana: feedback.ejercicioSemana ?? '',
    biomecanicaCaballo: feedback.biomecanicaCaballo,
    videoUri: videoUrl,
    origen: feedback.origen ?? 'gemini',
  });
  res.status(201).json(record);
});

analysesRouter.get('/analyses/:id', async (req, res) => {
  const record = await analysesDb.get(req.user.id, req.params.id);
  if (!record) return res.status(404).json({ error: 'no_encontrado' });
  res.json(record);
});

analysesRouter.get('/analyses', async (req, res) => {
  res.json(await analysesDb.listByUser(req.user.id));
});
