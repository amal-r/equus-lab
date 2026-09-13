import { Router } from 'express';
import fs from 'node:fs';
import os from 'node:os';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { subsDb, morphScansDb, scanUsageDb } from '../db.js';
import { MORPH_LIMITS } from '../plans.js';
import { analyzeMorphology } from '../ai/index.js';

export const morphologyRouter = Router();
// Con ruta ('/morphology'): sin ella, intercepta cualquier petición /api/* que
// llegue a este router, no solo las suyas (ver mismo comentario en horses.js).
morphologyRouter.use('/morphology', requireAuth);

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 30 * 1024 * 1024 } });
const uploadFields = upload.fields([
  { name: 'perfil', maxCount: 1 },
  { name: 'frontal', maxCount: 1 },
  { name: 'posterior', maxCount: 1 },
]);

const ESCALAS_VALIDAS = ['vara', 'alzada_ficha', 'ninguna'];

morphologyRouter.post('/morphology', uploadFields, async (req, res) => {
  const { caballo } = req.body ?? {};
  const escala = ESCALAS_VALIDAS.includes(req.body?.escala) ? req.body.escala : 'ninguna';
  const perfilPath = req.files?.perfil?.[0]?.path;
  const frontalPath = req.files?.frontal?.[0]?.path;
  const posteriorPath = req.files?.posterior?.[0]?.path;
  const allPaths = [perfilPath, frontalPath, posteriorPath].filter(Boolean);
  if (!perfilPath || !frontalPath || !posteriorPath || !caballo) {
    await Promise.all(allPaths.map((p) => fs.promises.unlink(p).catch(() => {})));
    return res.status(400).json({ error: 'datos_invalidos' });
  }

  try {
    const sub = await subsDb.get(req.user.id);
    const cap = sub.tier === 'free' ? MORPH_LIMITS.scansPorMesGratis : MORPH_LIMITS.scansPorMesPremium;
    const used = await scanUsageDb.countThisMonth(req.user.id);
    if (used >= cap) return res.status(429).json({ error: 'cuota_agotada' });

    const feedback = await analyzeMorphology({ perfilUrl: perfilPath, frontalUrl: frontalPath, posteriorUrl: posteriorPath, caballo, escala });
    await scanUsageDb.increment(req.user.id);

    // images no viaja aqui: los temporales se borran al terminar (no hay
    // almacenamiento permanente de las fotos en el backend). La app usa sus
    // propias copias locales, ver morphologyService.ts.
    const record = await morphScansDb.create(req.user.id, {
      caballo,
      indice: feedback.indice,
      resumen: feedback.resumen ?? '',
      zonas: feedback.zonas ?? [],
      medidas: feedback.medidas ?? [],
      escala,
      confianza: typeof feedback.confianza === 'number' ? feedback.confianza : 0.5,
      plan: feedback.plan ?? '',
      alertas: feedback.alertas ?? [],
      origen: feedback.origen ?? 'gemini',
    });
    res.status(201).json(record);
  } finally {
    await Promise.all(allPaths.map((p) => fs.promises.unlink(p).catch(() => {})));
  }
});

morphologyRouter.get('/morphology', async (req, res) => {
  res.json(await morphScansDb.listByUser(req.user.id));
});
