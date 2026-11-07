// Remembers which version (content hash) of each content/courses/*.json file was last seeded,
// so deploys can bring courses up to date without clobbering edits made in the admin area.

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('content_seeds', (t) => {
    t.string('slug', 120).primary()
    t.string('hash', 64).notNullable()
    t.timestamp('seeded_at').notNullable().defaultTo(knex.fn.now())
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTableIfExists('content_seeds')
}
