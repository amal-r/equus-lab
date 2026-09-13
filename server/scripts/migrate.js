/**
 * Crea las tablas si no existen. Ejecutar una vez contra la base de datos real
 * (`DATABASE_URL` en el entorno) antes del primer arranque del servidor:
 *
 *   DATABASE_URL=postgres://... node scripts/migrate.js
 *
 * Es seguro volver a ejecutarlo (todo con IF NOT EXISTS) si se añaden tablas
 * nuevas más adelante.
 */
import 'dotenv/config';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL en el entorno.');
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

const SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free',
  ciclo TEXT NOT NULL DEFAULT 'mensual',
  sub_estado TEXT NOT NULL DEFAULT 'gratis',
  min_used NUMERIC NOT NULL DEFAULT 0,
  min_total NUMERIC NOT NULL DEFAULT 0,
  valid_until TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS horses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS horses_user_id_idx ON horses(user_id);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  data JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS analyses_user_id_idx ON analyses(user_id);

CREATE TABLE IF NOT EXISTS veredictos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  data JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS veredictos_user_id_idx ON veredictos(user_id);

CREATE TABLE IF NOT EXISTS chat_usage (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  daily_date DATE,
  daily_count INT NOT NULL DEFAULT 0,
  lifetime_count INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS morph_scans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  data JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS morph_scans_user_id_idx ON morph_scans(user_id);

CREATE TABLE IF NOT EXISTS scan_usage (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  month TEXT,
  count INT NOT NULL DEFAULT 0
);
`;

async function main() {
  await pool.query(SQL);
  console.log('Migración aplicada correctamente.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
