/**
 * "Base de datos" en memoria para desarrollo. Se pierde al reiniciar el proceso
 * a propósito: es el punto de reemplazo por Postgres/Supabase en producción
 * (ver README §Backend → "Pasar a una base de datos real"). Todas las funciones
 * son async para que el cambio a un cliente SQL real no obligue a tocar las rutas.
 */
import crypto from 'node:crypto';

const users = new Map(); // id -> { id, name, email, passwordHash }
const usersByEmail = new Map(); // email -> id
const subs = new Map(); // userId -> { tier, ciclo, subEstado, minUsed, minTotal, validUntil }
const horses = new Map(); // userId -> Horse[]
const analyses = new Map(); // id -> analysis record (incluye userId)
const veredictos = new Map(); // id -> veredicto record (incluye userId)
const chatDaily = new Map(); // userId -> { date, count }

function genId() {
  return crypto.randomBytes(12).toString('hex');
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export const usersDb = {
  async create({ name, email, passwordHash }) {
    if (usersByEmail.has(email)) throw Object.assign(new Error('email_en_uso'), { status: 409 });
    const id = genId();
    const user = { id, name, email, passwordHash, createdAt: new Date().toISOString() };
    users.set(id, user);
    usersByEmail.set(email, id);
    subs.set(id, { tier: 'free', ciclo: 'mensual', subEstado: 'gratis', minUsed: 0, minTotal: 0, validUntil: null });
    horses.set(id, []);
    return user;
  },
  async findByEmail(email) {
    const id = usersByEmail.get(email);
    return id ? users.get(id) : null;
  },
  async findById(id) {
    return users.get(id) ?? null;
  },
  async remove(id) {
    const user = users.get(id);
    if (!user) return;
    usersByEmail.delete(user.email);
    users.delete(id);
    subs.delete(id);
    horses.delete(id);
    for (const [aid, a] of analyses) if (a.userId === id) analyses.delete(aid);
    for (const [vid, v] of veredictos) if (v.userId === id) veredictos.delete(vid);
    chatDaily.delete(id);
  },
};

export const subsDb = {
  async get(userId) {
    return subs.get(userId) ?? { tier: 'free', ciclo: 'mensual', subEstado: 'gratis', minUsed: 0, minTotal: 0, validUntil: null };
  },
  async set(userId, partial) {
    const cur = await this.get(userId);
    const next = { ...cur, ...partial };
    subs.set(userId, next);
    return next;
  },
  async addMinutes(userId, min) {
    const cur = await this.get(userId);
    const next = { ...cur, minUsed: cur.minUsed + min };
    subs.set(userId, next);
    return next;
  },
};

export const horsesDb = {
  async list(userId) {
    return horses.get(userId) ?? [];
  },
  async add(userId, horse) {
    const list = horses.get(userId) ?? [];
    const record = { id: genId(), sesiones: 0, ...horse };
    list.push(record);
    horses.set(userId, list);
    return record;
  },
  async update(userId, id, partial) {
    const list = horses.get(userId) ?? [];
    const idx = list.findIndex((h) => h.id === id);
    if (idx === -1) throw Object.assign(new Error('caballo_no_encontrado'), { status: 404 });
    list[idx] = { ...list[idx], ...partial };
    return list[idx];
  },
  async remove(userId, id) {
    const list = horses.get(userId) ?? [];
    horses.set(
      userId,
      list.filter((h) => h.id !== id)
    );
  },
};

export const analysesDb = {
  async create(userId, data) {
    const id = genId();
    const record = { id, userId, fecha: new Date().toISOString(), ...data };
    analyses.set(id, record);
    return record;
  },
  async get(userId, id) {
    const record = analyses.get(id);
    if (!record || record.userId !== userId) return null;
    return record;
  },
  async listByUser(userId) {
    return Array.from(analyses.values())
      .filter((a) => a.userId === userId)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  },
};

export const veredictosDb = {
  async create(userId, data) {
    const id = genId();
    const record = { id, userId, fecha: new Date().toISOString(), ...data };
    veredictos.set(id, record);
    return record;
  },
  async listByUser(userId) {
    return Array.from(veredictos.values())
      .filter((v) => v.userId === userId)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  },
};

export const chatUsageDb = {
  async countToday(userId) {
    const rec = chatDaily.get(userId);
    if (!rec || rec.date !== today()) return 0;
    return rec.count;
  },
  async increment(userId) {
    const t = today();
    const rec = chatDaily.get(userId);
    const count = rec && rec.date === t ? rec.count + 1 : 1;
    chatDaily.set(userId, { date: t, count });
    return count;
  },
};
