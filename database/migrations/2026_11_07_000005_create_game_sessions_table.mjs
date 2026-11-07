// Arcade game runs (Answer Runner). The server owns the state, so scores can't be faked.

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('game_sessions', (t) => {
    t.increments('id')
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
    t.integer('course_id').unsigned().notNullable().references('courses.id').onDelete('CASCADE')
    t.integer('section_id').unsigned().nullable().references('course_sections.id').onDelete('SET NULL')
    t.string('game', 32).notNullable().defaultTo('runner')
    t.timestamp('started_at').notNullable().defaultTo(knex.fn.now())
    t.timestamp('last_answer_at').nullable()
    t.timestamp('ended_at').nullable()
    t.text('question_ids').notNullable() // JSON number[], served order
    t.text('answers') // JSON [{ q, o, c, ms }]
    t.integer('score').notNullable().defaultTo(0)
    t.integer('answered').notNullable().defaultTo(0)
    t.integer('correct').notNullable().defaultTo(0)
    t.integer('streak').notNullable().defaultTo(0)
    t.integer('max_streak').notNullable().defaultTo(0)
    t.integer('lives').notNullable().defaultTo(3)
    t.index(['game', 'course_id', 'score'])
    t.index(['user_id', 'game'])
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTableIfExists('game_sessions')
}
