import { Router } from 'express';
import fs from 'node:fs';
import os from 'node:os';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { subsDb, analysesDb } from '../db.js';
import { PLAN_DEFS } from '../plans.js';
import { analyzeVideo } from '../ai/index.js';

export const analysesRouter = Router();
// Con ruta ('/analyses'): sin ella, intercepta cualquier petición /api/* que
// llegue a este router, no solo las suyas (ver mismo comentario en horses.js).
analysesRouter.use('/analyses', requireAuth);

// El vídeo llega como multipart/form-data (campo "video"), no como URL: el
// móvil no tiene ninguna forma de dar una URL http a un servidor remoto para
// un archivo que solo existe en su propio almacenamiento. Se guarda en un
// temporal y se borra en el finally de la ruta, tanto si el análisis sale
// bien como si falla.
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 200 * 1024 * 1024 } });

function timeLabel(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

analysesRouter.post('/analyses', upload.single('video'), async (req, res) => {
  const { durationSec, disciplina, foco, caballo } = req.body ?? {};
  const esPieATierra = req.body?.esPieATierra === 'true';
  const videoPath = req.file?.path;
  if (!videoPath || !disciplina || !caballo) {
    if (videoPath) await fs.promises.unlink(videoPath).catch(() => {});
    return res.status(400).json({ error: 'datos_invalidos' });
  }

  try {
    const sub = await subsDb.get(req.user.id);
    if (sub.tier === 'free') return res.status(402).json({ error: 'necesita_premium' });

    const clipMin = (Number(durationSec) || 0) / 60;
    const def = PLAN_DEFS[sub.tier];
    if (clipMin > def.clipMaxMin) return res.status(413).json({ error: 'clip_demasiado_largo', maxMin: def.clipMaxMin });
    if (sub.minUsed + clipMin > sub.minTotal) {
      return res.status(429).json({ error: 'cuota_agotada', restante: Math.max(0, sub.minTotal - sub.minUsed) });
    }

    const feedback = await analyzeVideo({ videoUrl: videoPath, durationSec: Number(durationSec), disciplina, foco, esPieATierra, caballo });
    await subsDb.addMinutes(req.user.id, clipMin);

    const tips = (feedback.tips ?? []).map((t) => ({
      timeSec: t.timeSec,
      timeLabel: t.timeLabel ?? timeLabel(t.timeSec ?? 0),
      text: t.text,
    }));

    // videoUri no viaja aqui: el temporal se borra al terminar (no hay
    // almacenamiento permanente del video en el backend). La app usa su
    // propia copia local para reproducirlo, ver analysisService.ts.
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
      origen: feedback.origen ?? 'gemini',
    });
    res.status(201).json(record);
  } finally {
    await fs.promises.unlink(videoPath).catch(() => {});
  }
});

analysesRouter.get('/analyses/:id', async (req, res) => {
  const record = await analysesDb.get(req.user.id, req.params.id);
  if (!record) return res.status(404).json({ error: 'no_encontrado' });
  res.json(record);
});

analysesRouter.get('/analyses', async (req, res) => {
  res.json(await analysesDb.listByUser(req.user.id));
});
