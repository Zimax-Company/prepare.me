import bcrypt from 'bcryptjs'

/** Idempotent: runs on every production deploy. */
export async function seed(knex) {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@prepare.me').toLowerCase()
  if (await knex('users').where({ email }).first()) return
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!password && process.env.VERCEL_ENV === 'production') {
    console.warn('  SEED_ADMIN_PASSWORD not set; skipping admin seed.')
    return
  }
  await knex('users').insert({ name: 'Admin', email, password_hash: await bcrypt.hash(password || 'password', 10), role: 'admin' })
  if (process.env.VERCEL_ENV !== 'production') {
    await knex('users').insert({ name: 'Demo Student', email: 'student@prepare.me', password_hash: await bcrypt.hash('password', 10), role: 'student' }).onConflict('email').ignore()
  }
}
