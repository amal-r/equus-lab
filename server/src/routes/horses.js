import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { horsesDb } from '../db.js';

export const horsesRouter = Router();
horsesRouter.use(requireAuth);

horsesRouter.get('/horses', async (req, res) => {
  res.json(await horsesDb.list(req.user.id));
});

horsesRouter.post('/horses', async (req, res) => {
  const { nombre, tipo, raza, edad, disciplina, alzada, nivel } = req.body ?? {};
  if (!nombre) return res.status(400).json({ error: 'nombre_requerido' });
  const horse = await horsesDb.add(req.user.id, { nombre, tipo, raza, edad, disciplina, alzada, nivel });
  res.status(201).json(horse);
});

horsesRouter.put('/horses/:id', async (req, res) => {
  try {
    const horse = await horsesDb.update(req.user.id, req.params.id, req.body ?? {});
    res.json(horse);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

horsesRouter.delete('/horses/:id', async (req, res) => {
  await horsesDb.remove(req.user.id, req.params.id);
  res.json({ ok: true });
});
