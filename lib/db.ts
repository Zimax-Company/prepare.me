import knex, { type Knex } from 'knex'
import { knexConfig } from '@/database/config.mjs'

const globalForDb = globalThis as unknown as { __prepareDb?: Knex }

export const db: Knex = globalForDb.__prepareDb ?? knex(knexConfig())

if (process.env.NODE_ENV !== 'production') globalForDb.__prepareDb = db

/** JSON columns are stored as TEXT for portability; parse defensively. */
export function json<T>(value: unknown, fallback: T): T {
  if (value == null || value === '') return fallback
  if (typeof value !== 'string') return value as T
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
