// Daily goals and streaks. A day is recorded in goal_days the moment its goal is met,
// so changing the goal later never rewrites past streaks.

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.string('goal_kind', 16).notNullable().defaultTo('minutes') // minutes | lessons
    t.integer('goal_value').notNullable().defaultTo(10)
    t.string('timezone', 64).notNullable().defaultTo('UTC')
  })
  await knex.schema.createTable('goal_days', (t) => {
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
    t.date('day').notNullable() // the student's local date
    t.timestamp('met_at').notNullable().defaultTo(knex.fn.now())
    t.primary(['user_id', 'day'])
  })
  // Backfill with the default goal (10 minutes, or at least one lesson completed), using UTC days.
  await knex.raw(`INSERT IGNORE INTO goal_days (user_id, day, met_at)
    SELECT user_id, day, TIMESTAMP(day) FROM daily_usage GROUP BY user_id, day HAVING SUM(seconds) >= 600`)
  await knex.raw(`INSERT IGNORE INTO goal_days (user_id, day, met_at)
    SELECT user_id, DATE(created_at), MIN(created_at) FROM activity_events WHERE type = 'complete_concept' GROUP BY user_id, DATE(created_at)`)
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTableIfExists('goal_days')
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('goal_kind')
    t.dropColumn('goal_value')
    t.dropColumn('timezone')
  })
}
