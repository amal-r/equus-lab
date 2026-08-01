import { verifySession } from '../utils/jwt.js';
import { usersDb } from '../db.js';

/** Exige un token de sesión válido. Adjunta `req.user = { id, email }`. */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'no_auth' });
  try {
    const payload = verifySession(token);
    const user = await usersDb.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'sesion_invalida' });
    req.user = { id: user.id, email: user.email };
    next();
  } catch {
    return res.status(401).json({ error: 'token_invalido_o_caducado' });
  }
}
