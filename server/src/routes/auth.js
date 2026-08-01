import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { usersDb } from '../db.js';
import { signSession } from '../utils/jwt.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'datos_invalidos' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await usersDb.create({ name: name?.trim() || 'Jinete', email: email.toLowerCase().trim(), passwordHash });
    const token = signSession(user);
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = await usersDb.findByEmail((email ?? '').toLowerCase().trim());
  if (!user || !(await bcrypt.compare(password ?? '', user.passwordHash))) {
    return res.status(401).json({ error: 'credenciales_invalidas' });
  }
  const token = signSession(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

authRouter.post('/forgot-password', async (req, res) => {
  // Stub: en producción, generar un token de un solo uso y enviarlo por email
  // (p. ej. con Resend/SES). Nunca revelamos si el email existe o no.
  res.json({ ok: true });
});

export const accountRouter = Router();
accountRouter.delete('/account', requireAuth, async (req, res) => {
  await usersDb.remove(req.user.id);
  res.json({ ok: true });
});
