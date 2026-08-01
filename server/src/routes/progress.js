import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { analysesDb } from '../db.js';

export const progressRouter = Router();

progressRouter.get('/progress', requireAuth, async (req, res) => {
  const analyses = await analysesDb.listByUser(req.user.id);
  const notaMedia = analyses.length ? analyses.reduce((s, a) => s + a.nota, 0) / analyses.length : 0;

  const skillMap = new Map();
  for (const a of analyses) {
    for (const ss of a.subscores ?? []) {
      const cur = skillMap.get(ss.label) ?? { sum: 0, n: 0 };
      cur.sum += ss.val;
      cur.n += 1;
      skillMap.set(ss.label, cur);
    }
  }
  const porDestreza = Array.from(skillMap.entries()).map(([label, { sum, n }]) => ({ label, val: sum / n }));

  res.json({
    sesiones: analyses.length,
    notaMedia: Math.round(notaMedia * 10) / 10,
    porDestreza,
    recientes: analyses.slice(0, 10),
  });
});
