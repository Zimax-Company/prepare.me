#!/usr/bin/env node
// Laravel-flavoured database CLI on top of Knex.
//   node scripts/artisan.mjs migrate [--force] [--seed] [--deploy]
//   node scripts/artisan.mjs migrate:rollback [--step=N | --all]
//   node scripts/artisan.mjs migrate:fresh [--seed]
//   node scripts/artisan.mjs migrate:status
//   node scripts/artisan.mjs make:migration create_things_table
//   node scripts/artisan.mjs db:seed
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import knexFactory from 'knex'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
if (fs.existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'))

const { knexConfig } = await import('../database/config.mjs')

const [command, ...rest] = process.argv.slice(2)
const flags = Object.fromEntries(
  rest.filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.slice(2).split('=')
    return [k, v ?? true]
  }),
)
const args = rest.filter((a) => !a.startsWith('--'))

const info = (msg) => console.log(`\x1b[36m  INFO\x1b[0m  ${msg}`)
const done = (msg) => console.log(`\x1b[32m  DONE\x1b[0m  ${msg}`)

function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}_${p(d.getMonth() + 1)}_${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

if (command === 'make:migration') {
  const name = args[0]
  if (!name || !/^[a-z0-9_]+$/.test(name)) {
    console.error('Usage: make:migration <snake_case_name>')
    process.exit(1)
  }
  const file = path.join(root, 'database/migrations', `${stamp()}_${name}.mjs`)
  fs.writeFileSync(
    file,
    `/** @param {import('knex').Knex} knex */\nexport async function up(knex) {\n}\n\n/** @param {import('knex').Knex} knex */\nexport async function down(knex) {\n}\n`,
  )
  done(`Created migration ${path.relative(root, file)}`)
  process.exit(0)
}

if (command === 'migrate') {
  if (process.env.SKIP_MIGRATIONS === 'true') {
    info('SKIP_MIGRATIONS=true, skipping.')
    process.exit(0)
  }
  // --deploy (used by vercel-build): preview deployments must not migrate a shared database
  // unless they opt in with their own DATABASE_URL and MIGRATE_ON_PREVIEW=true.
  const vercelEnv = process.env.VERCEL_ENV
  if (flags.deploy && vercelEnv && vercelEnv !== 'production' && process.env.MIGRATE_ON_PREVIEW !== 'true') {
    info(`VERCEL_ENV=${vercelEnv}: skipping migrations (set MIGRATE_ON_PREVIEW=true to enable).`)
    process.exit(0)
  }
}

const knex = knexFactory(knexConfig())

async function seed() {
  const [files] = await knex.seed.run()
  files.forEach((f) => done(`Seeded ${path.basename(f)}`))
}

try {
  switch (command) {
    case 'migrate': {
      const [batch, files] = await knex.migrate.latest()
      if (!files.length) info('Nothing to migrate.')
      else files.forEach((f) => done(`Migrated ${f} (batch ${batch})`))
      if (flags.seed) await seed()
      break
    }
    case 'migrate:rollback': {
      let total = []
      const steps = flags.all ? Infinity : Number(flags.step ?? 1)
      for (let i = 0; i < steps; i++) {
        const [, files] = await knex.migrate.rollback(undefined, false)
        if (!files.length) break
        total = total.concat(files)
      }
      if (!total.length) info('Nothing to rollback.')
      else total.forEach((f) => done(`Rolled back ${f}`))
      break
    }
    case 'migrate:fresh': {
      if (process.env.NODE_ENV === 'production' && !flags.force) {
        throw new Error('Refusing to run migrate:fresh in production without --force')
      }
      const tables = await knex.raw('SHOW TABLES').then(([rows]) => rows.map((r) => Object.values(r)[0]))
      await knex.raw('SET FOREIGN_KEY_CHECKS = 0')
      for (const t of tables) await knex.schema.dropTableIfExists(t)
      await knex.raw('SET FOREIGN_KEY_CHECKS = 1')
      info(`Dropped ${tables.length} tables.`)
      const [, files] = await knex.migrate.latest()
      files.forEach((f) => done(`Migrated ${f}`))
      if (flags.seed) await seed()
      break
    }
    case 'migrate:status': {
      const [completed, pending] = await knex.migrate.list()
      completed.forEach((m) => console.log(`  \x1b[32mRan\x1b[0m      ${m.name}`))
      pending.forEach((m) => console.log(`  \x1b[33mPending\x1b[0m  ${m.file}`))
      break
    }
    case 'db:seed':
      await seed()
      break
    default:
      console.error(`Unknown command "${command ?? ''}". Commands: migrate, migrate:rollback, migrate:fresh, migrate:status, make:migration, db:seed`)
      process.exitCode = 1
  }
} catch (err) {
  console.error(`\x1b[31m  ERROR\x1b[0m ${err.message}`)
  process.exitCode = 1
} finally {
  await knex.destroy()
}
