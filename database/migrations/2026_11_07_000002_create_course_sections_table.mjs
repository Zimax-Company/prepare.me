// Sections group concepts inside a course (e.g. "Level 3: Sequences and Limits") and carry
// the section's objective, expected competencies and assessment description.

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('course_sections', (t) => {
    t.increments('id')
    t.integer('course_id').unsigned().notNullable().references('courses.id').onDelete('CASCADE')
    t.integer('position').notNullable().defaultTo(0)
    t.string('title', 200).notNullable()
    t.text('objective')
    t.text('competencies') // JSON string[]
    t.text('assessment')
    t.timestamps(true, true)
    t.index(['course_id', 'position'])
  })
  await knex.schema.alterTable('concepts', (t) => {
    t.integer('section_id').unsigned().nullable().references('course_sections.id').onDelete('SET NULL').after('course_id')
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable('concepts', (t) => {
    t.dropForeign(['section_id'])
    t.dropColumn('section_id')
  })
  await knex.schema.dropTableIfExists('course_sections')
}
