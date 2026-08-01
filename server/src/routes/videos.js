import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import { subsDb } from '../db.js';
import { PLAN_DEFS } from '../plans.js';

export const videosRouter = Router();

/**
 * Registra un vídeo y valida el límite de duración del plan ANTES de aceptar nada
 * (ver ARQUITECTURA-IA.md §7-8). Devuelve un `uploadUrl` firmado para subir el
 * binario directamente a almacenamiento (S3/GCS) sin pasar por este proceso.
 *
 * STUB: aquí falta generar una URL firmada real (p. ej. `s3.getSignedUrlPromise
 * ('putObject', ...)` o el equivalente de GCS). De momento devolvemos una URL de
 * ejemplo para que el contrato de la API ya esté fijado.
 */
videosRouter.post('/videos', requireAuth, async (req, res) => {
  const { fileName, durationSec } = req.body ?? {};
  const durationMin = (durationSec ?? 0) / 60;
  const sub = await subsDb.get(req.user.id);
  const maxMin = sub.tier === 'free' ? 3 : PLAN_DEFS[sub.tier].clipMaxMin;
  if (durationMin > maxMin) {
    return res.status(413).json({ error: 'clip_demasiado_largo', maxMin });
  }
  const id = crypto.randomBytes(8).toString('hex');
  res.status(201).json({
    id,
    uploadUrl: `https://storage.example.invalid/equus-lab/${req.user.id}/${id}-${encodeURIComponent(fileName ?? 'video.mp4')}`,
  });
});
