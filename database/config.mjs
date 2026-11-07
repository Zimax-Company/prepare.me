// Shared by the Next.js runtime (lib/db.ts) and the artisan CLI (scripts/artisan.mjs).
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export function connectionFromEnv(env = process.env) {
  // Tolerate stray whitespace or quotes pasted into a dashboard.
  const raw = (env.DATABASE_URL ?? '').trim().replace(/^(['"])(.*)\1$/, '$2')
  if (!raw) throw new Error('DATABASE_URL is not set')
  const url = parseDatabaseUrl(raw)
  const ssl = url.searchParams.get('ssl')
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    ssl: ssl === 'true' ? { rejectUnauthorized: true } : undefined,
    timezone: 'Z',
    supportBigNumbers: true,
    decimalNumbers: true,
    charset: 'utf8mb4',
  }
}

// Never echo the value: it holds the password.
function parseDatabaseUrl(raw) {
  const fail = (why) => {
    throw new Error(`DATABASE_URL is invalid: ${why}. Expected mysql://user:password@host:port/database?ssl=true`)
  }
  if (!/^mysql:\/\//i.test(raw)) fail("it must start with 'mysql://'")
  if (/\s/.test(raw)) fail('it contains whitespace')
  // A raw '#', '?' or '/' in the password ends the host part early, so the user name gets parsed as the host.
  const credentials = raw.match(/^mysql:\/\/(.*)@/i)?.[1] ?? ''
  if (/[#?/]/.test(credentials)) fail("the user or password contains '#', '?' or '/'; URL-encode it (encodeURIComponent)")
  if (/%(?![0-9a-f]{2})/i.test(credentials)) fail("the password contains a '%' that isn't part of an encoding; URL-encode it")
  let url
  try {
    url = new URL(raw)
  } catch {
    fail('it could not be parsed; URL-encode the user and password (encodeURIComponent)')
  }
  if (!url.hostname) fail('the host is missing')
  if (!url.pathname.replace(/^\//, '')) fail('the database name is missing')
  return url
}

export function knexConfig(env = process.env) {
  return {
    client: 'mysql2',
    connection: connectionFromEnv(env),
    // Small pool: serverless functions each hold their own.
    pool: { min: 0, max: Number(env.DB_POOL_MAX || 5) },
    migrations: {
      directory: path.join(here, 'migrations'),
      tableName: 'migrations',
      loadExtensions: ['.mjs'],
    },
    seeds: {
      directory: path.join(here, 'seeds'),
      loadExtensions: ['.mjs'],
    },
  }
}
