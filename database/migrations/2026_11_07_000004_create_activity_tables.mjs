// Usage analytics: an append-only activity log plus per-day learning time.

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('activity_events', (t) => {
    t.bigIncrements('id')
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
    t.integer('course_id').unsigned().nullable().references('courses.id').onDelete('CASCADE')
    t.integer('concept_id').unsigned().nullable().references('concepts.id').onDelete('SET NULL')
    // login | register | enroll | view_concept | complete_concept | practice_answer | exam_start | exam_submit
    t.string('type', 32).notNullable()
    t.text('meta') // JSON, e.g. { questionId, correct } or { attemptId, percent, passed }
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    t.index(['created_at'])
    t.index(['user_id', 'created_at'])
    t.index(['course_id', 'created_at'])
    t.index(['type', 'created_at'])
  })

  // Seconds of active learning per student, course and day (fed by a heartbeat while a lesson or exam is open).
  await knex.schema.createTable('daily_usage', (t) => {
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
    t.integer('course_id').unsigned().notNullable().references('courses.id').onDelete('CASCADE')
    t.date('day').notNullable()
    t.integer('seconds').notNullable().defaultTo(0)
    t.primary(['user_id', 'course_id', 'day'])
    t.index(['day'])
  })

  // Backfill history from what was already recorded, so charts aren't empty on day one.
  await knex.raw(`INSERT INTO activity_events (user_id, course_id, type, created_at)
    SELECT user_id, course_id, 'enroll', enrolled_at FROM enrollments`)
  await knex.raw(`INSERT INTO activity_events (user_id, course_id, concept_id, type, created_at)
    SELECT p.user_id, c.course_id, p.concept_id, 'complete_concept', p.completed_at
    FROM concept_progress p JOIN concepts c ON c.id = p.concept_id WHERE p.completed_at IS NOT NULL`)
  await knex.raw(`INSERT INTO activity_events (user_id, course_id, concept_id, type, created_at)
    SELECT p.user_id, c.course_id, p.concept_id, 'view_concept', p.viewed_at
    FROM concept_progress p JOIN concepts c ON c.id = p.concept_id WHERE p.viewed_at IS NOT NULL`)
  await knex.raw(`INSERT INTO activity_events (user_id, course_id, type, meta, created_at)
    SELECT user_id, course_id, 'exam_start', JSON_OBJECT('attemptId', id), started_at FROM exam_attempts`)
  await knex.raw(`INSERT INTO activity_events (user_id, course_id, type, meta, created_at)
    SELECT user_id, course_id, 'exam_submit', JSON_OBJECT('attemptId', id, 'percent', percent, 'passed', passed), submitted_at
    FROM exam_attempts WHERE submitted_at IS NOT NULL`)
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTableIfExists('daily_usage')
  await knex.schema.dropTableIfExists('activity_events')
}
