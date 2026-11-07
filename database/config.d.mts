import type { Knex } from 'knex'
export function connectionFromEnv(env?: NodeJS.ProcessEnv): Knex.MySql2ConnectionConfig
export function knexConfig(env?: NodeJS.ProcessEnv): Knex.Config
