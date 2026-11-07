const LEVELS = ['beginner', 'intermediate', 'advanced']

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('users', (t) => {
    t.increments('id')
    t.string('name', 120).notNullable()
    t.string('email', 190).notNullable().unique()
    t.string('password_hash', 100).notNullable()
    t.enu('role', ['student', 'admin']).notNullable().defaultTo('student')
    t.boolean('is_active').notNullable().defaultTo(true)
    t.timestamps(true, true)
  })

  await knex.schema.createTable('courses', (t) => {
    t.increments('id')
    t.string('slug', 120).notNullable().unique()
    t.string('title', 160).notNullable()
    t.string('tagline', 255).notNullable().defaultTo('')
    t.text('description')
    t.string('category', 80).notNullable().defaultTo('General')
    t.string('icon', 16).notNullable().defaultTo('📘')
    t.string('color', 16).notNullable().defaultTo('#6d5efc')
    t.boolean('published').notNullable().defaultTo(false)
    t.timestamps(true, true)
  })

  await knex.schema.createTable('concepts', (t) => {
    t.increments('id')
    t.integer('course_id').unsigned().notNullable().references('courses.id').onDelete('CASCADE')
    t.string('slug', 120).notNullable()
    t.string('title', 160).notNullable()
    t.string('summary', 255).notNullable().defaultTo('')
    t.enu('level', LEVELS).notNullable().defaultTo('beginner')
    t.integer('position').notNullable().defaultTo(0)
    t.integer('est_minutes').notNullable().defaultTo(10)
    // Ordered list of content blocks (text, example, diagram, flashcards, ...), stored as JSON text.
    t.text('blocks', 'longtext')
    t.timestamps(true, true)
    t.unique(['course_id', 'slug'])
    t.index(['course_id', 'position'])
  })

  await knex.schema.createTable('questions', (t) => {
    t.increments('id')
    t.integer('course_id').unsigned().notNullable().references('courses.id').onDelete('CASCADE')
    t.integer('concept_id').unsigned().nullable().references('concepts.id').onDelete('SET NULL')
    t.enu('level', LEVELS).notNullable().defaultTo('beginner')
    t.enu('type', ['single', 'multiple', 'true_false', 'short']).notNullable().defaultTo('single')
    t.text('prompt').notNullable()
    t.text('options') // JSON [{id, text}]
    t.text('answer').notNullable() // JSON string[] (option ids, or accepted short answers)
    t.text('explanation')
    t.boolean('in_exam').notNullable().defaultTo(true)
    t.boolean('in_practice').notNullable().defaultTo(true)
    t.timestamps(true, true)
    t.index(['course_id', 'level'])
  })

  await knex.schema.createTable('exam_settings', (t) => {
    t.integer('course_id').unsigned().primary().references('courses.id').onDelete('CASCADE')
    t.integer('duration_minutes').notNullable().defaultTo(20)
    t.integer('question_count').notNullable().defaultTo(10)
    t.integer('pass_mark').notNullable().defaultTo(70)
    t.integer('max_attempts').notNullable().defaultTo(0) // 0 = unlimited
    t.integer('cooldown_minutes').notNullable().defaultTo(0)
    t.boolean('shuffle_options').notNullable().defaultTo(true)
    t.boolean('show_review').notNullable().defaultTo(true)
    t.boolean('include_lower_levels').notNullable().defaultTo(true)
  })

  await knex.schema.createTable('enrollments', (t) => {
    t.increments('id')
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
    t.integer('course_id').unsigned().notNullable().references('courses.id').onDelete('CASCADE')
    t.enu('level', LEVELS).notNullable().defaultTo('beginner')
    t.timestamp('enrolled_at').notNullable().defaultTo(knex.fn.now())
    t.timestamp('last_activity_at').nullable()
    t.unique(['user_id', 'course_id'])
  })

  await knex.schema.createTable('concept_progress', (t) => {
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
    t.integer('concept_id').unsigned().notNullable().references('concepts.id').onDelete('CASCADE')
    t.timestamp('viewed_at').nullable()
    t.timestamp('completed_at').nullable()
    t.integer('practice_correct').notNullable().defaultTo(0)
    t.integer('practice_answered').notNullable().defaultTo(0)
    t.primary(['user_id', 'concept_id'])
  })

  await knex.schema.createTable('exam_attempts', (t) => {
    t.increments('id')
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
    t.integer('course_id').unsigned().notNullable().references('courses.id').onDelete('CASCADE')
    t.enu('level', LEVELS).notNullable()
    t.integer('duration_minutes').notNullable()
    t.integer('pass_mark').notNullable()
    t.timestamp('started_at').notNullable().defaultTo(knex.fn.now())
    t.timestamp('expires_at').notNullable()
    t.timestamp('submitted_at').nullable()
    t.text('question_ids').notNullable() // JSON number[] in display order
    t.text('answers') // JSON { [questionId]: string[] }
    t.integer('score').nullable()
    t.integer('total').notNullable()
    t.decimal('percent', 5, 2).nullable()
    t.boolean('passed').nullable()
    t.index(['user_id', 'course_id'])
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  for (const t of ['exam_attempts', 'concept_progress', 'enrollments', 'exam_settings', 'questions', 'concepts', 'courses', 'users']) {
    await knex.schema.dropTableIfExists(t)
  }
}
