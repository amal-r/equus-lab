/**
 * Postgres real (antes: Maps en memoria, ver historial). Todas las funciones
 * siguen siendo async con la MISMA firma que antes a propósito: las rutas
 * (analyses.js, chat.js, horses.js, shows.js, subscription.js, webhooks.js,
 * middleware/auth.js) no necesitan cambiar nada, solo este fichero.
 *
 * Requiere DATABASE_URL en el entorno. Ejecuta `node scripts/migrate.js` una
 * vez contra esa base de datos antes del primer arranque (crea las tablas si
 * no existen).
 */
import crypto from 'node:crypto';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL en el entorno (Postgres). Ver README §Backend.');
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

function genId() {
  return crypto.randomBytes(12).toString('hex');
}
function todayDate() {
  return new Date().toISOString().slice(0, 10);
}
function toDateStr(d) {
  if (!d) return null;
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
}

function mapUser(row) {
  return { id: row.id, name: row.name, email: row.email, passwordHash: row.password_hash, createdAt: row.created_at?.toISOString() };
}

export const usersDb = {
  async create({ name, email, passwordHash }) {
    const id = genId();
    try {
      await pool.query('BEGIN');
      const { rows } = await pool.query(
        'INSERT INTO users (id, name, email, password_hash) VALUES ($1,$2,$3,$4) RETURNING *',
        [id, name, email, passwordHash]
      );
      await pool.query('INSERT INTO subscriptions (user_id) VALUES ($1)', [id]);
      await pool.query('COMMIT');
      return mapUser(rows[0]);
    } catch (err) {
      await pool.query('ROLLBACK');
      if (err.code === '23505') throw Object.assign(new Error('email_en_uso'), { status: 409 });
      throw err;
    }
  },
  async findByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ? mapUser(rows[0]) : null;
  },
  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? mapUser(rows[0]) : null;
  },
  async remove(id) {
    // ON DELETE CASCADE en el resto de tablas se lleva subscriptions/horses/
    // analyses/veredictos/chat_usage de este usuario.
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  },
};

const DEFAULT_SUB = { tier: 'free', ciclo: 'mensual', subEstado: 'gratis', minUsed: 0, minTotal: 0, validUntil: null };

function mapSub(row) {
  return {
    tier: row.tier,
    ciclo: row.ciclo,
    subEstado: row.sub_estado,
    minUsed: Number(row.min_used),
    minTotal: Number(row.min_total),
    validUntil: row.valid_until ? row.valid_until.toISOString() : null,
  };
}

export const subsDb = {
  async get(userId) {
    const { rows } = await pool.query('SELECT * FROM subscriptions WHERE user_id = $1', [userId]);
    return rows[0] ? mapSub(rows[0]) : { ...DEFAULT_SUB };
  },
  async set(userId, partial) {
    const next = { ...(await this.get(userId)), ...partial };
    await pool.query(
      `INSERT INTO subscriptions (user_id, tier, ciclo, sub_estado, min_used, min_total, valid_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (user_id) DO UPDATE SET
         tier = $2, ciclo = $3, sub_estado = $4, min_used = $5, min_total = $6, valid_until = $7`,
      [userId, next.tier, next.ciclo, next.subEstado, next.minUsed, next.minTotal, next.validUntil]
    );
    return next;
  },
  async addMinutes(userId, min) {
    const cur = await this.get(userId);
    return this.set(userId, { minUsed: cur.minUsed + min });
  },
};

export const horsesDb = {
  async list(userId) {
    const { rows } = await pool.query('SELECT id, data FROM horses WHERE user_id = $1 ORDER BY id', [userId]);
    return rows.map((r) => ({ id: r.id, ...r.data }));
  },
  async add(userId, horse) {
    const id = genId();
    const record = { sesiones: 0, ...horse };
    await pool.query('INSERT INTO horses (id, user_id, data) VALUES ($1,$2,$3)', [id, userId, record]);
    return { id, ...record };
  },
  async update(userId, id, partial) {
    const { rows } = await pool.query('SELECT data FROM horses WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!rows[0]) throw Object.assign(new Error('caballo_no_encontrado'), { status: 404 });
    const next = { ...rows[0].data, ...partial };
    await pool.query('UPDATE horses SET data = $1 WHERE id = $2 AND user_id = $3', [next, id, userId]);
    return { id, ...next };
  },
  async remove(userId, id) {
    await pool.query('DELETE FROM horses WHERE id = $1 AND user_id = $2', [id, userId]);
  },
};

export const analysesDb = {
  async create(userId, data) {
    const id = genId();
    const { rows } = await pool.query('INSERT INTO analyses (id, user_id, data) VALUES ($1,$2,$3) RETURNING fecha', [id, userId, data]);
    return { id, userId, fecha: rows[0].fecha.toISOString(), ...data };
  },
  async get(userId, id) {
    const { rows } = await pool.query('SELECT id, user_id, fecha, data FROM analyses WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!rows[0]) return null;
    return { id: rows[0].id, userId: rows[0].user_id, fecha: rows[0].fecha.toISOString(), ...rows[0].data };
  },
  async listByUser(userId) {
    const { rows } = await pool.query('SELECT id, user_id, fecha, data FROM analyses WHERE user_id = $1 ORDER BY fecha DESC', [userId]);
    return rows.map((r) => ({ id: r.id, userId: r.user_id, fecha: r.fecha.toISOString(), ...r.data }));
  },
};

export const veredictosDb = {
  async create(userId, data) {
    const id = genId();
    const { rows } = await pool.query('INSERT INTO veredictos (id, user_id, data) VALUES ($1,$2,$3) RETURNING fecha', [id, userId, data]);
    return { id, userId, fecha: rows[0].fecha.toISOString(), ...data };
  },
  async listByUser(userId) {
    const { rows } = await pool.query('SELECT id, user_id, fecha, data FROM veredictos WHERE user_id = $1 ORDER BY fecha DESC', [userId]);
    return rows.map((r) => ({ id: r.id, userId: r.user_id, fecha: r.fecha.toISOString(), ...r.data }));
  },
};

export const chatUsageDb = {
  async countToday(userId) {
    const { rows } = await pool.query('SELECT daily_date, daily_count FROM chat_usage WHERE user_id = $1', [userId]);
    const row = rows[0];
    if (!row || toDateStr(row.daily_date) !== todayDate()) return 0;
    return row.daily_count;
  },
  async countTotal(userId) {
    const { rows } = await pool.query('SELECT lifetime_count FROM chat_usage WHERE user_id = $1', [userId]);
    return rows[0]?.lifetime_count ?? 0;
  },
  async increment(userId) {
    const t = todayDate();
    const { rows } = await pool.query('SELECT daily_date, daily_count, lifetime_count FROM chat_usage WHERE user_id = $1', [userId]);
    const row = rows[0];
    const dailyCount = row && toDateStr(row.daily_date) === t ? row.daily_count + 1 : 1;
    const lifetimeCount = (row?.lifetime_count ?? 0) + 1;
    await pool.query(
      `INSERT INTO chat_usage (user_id, daily_date, daily_count, lifetime_count) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE SET daily_date = $2, daily_count = $3, lifetime_count = $4`,
      [userId, t, dailyCount, lifetimeCount]
    );
    return dailyCount;
  },
};
