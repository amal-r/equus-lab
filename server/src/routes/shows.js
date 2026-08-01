import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { subsDb, veredictosDb } from '../db.js';
import { judgeShow as aiJudgeShow } from '../ai/index.js';

export const showsRouter = Router();
showsRouter.use(requireAuth);

showsRouter.post('/shows/judge', async (req, res) => {
  const { videoUrl, disciplina, prueba, caballo } = req.body ?? {};
  if (!videoUrl || !disciplina) return res.status(400).json({ error: 'datos_invalidos' });

  const sub = await subsDb.get(req.user.id);
  if (sub.tier === 'free') return res.status(402).json({ error: 'necesita_premium' });

  const result = await aiJudgeShow({ videoUrl, disciplina, prueba: prueba ?? `${disciplina} · simulacro` });
  const record = await veredictosDb.create(req.user.id, {
    disciplina,
    prueba: prueba ?? `${disciplina} · simulacro`,
    caballo: caballo ?? '—',
    puntuacionFinal: result.puntuacionFinal,
    puesto: result.puesto,
    sheetRows: result.sheetRows,
    colectivas: result.colectivas,
    comentario: result.comentario,
  });
  res.status(201).json(record);
});

showsRouter.get('/shows', async (req, res) => {
  res.json(await veredictosDb.listByUser(req.user.id));
});
