import { listCourseFiles, readCourseFile, seedCourseFile } from '../course-loader.mjs'

/**
 * Seeds every course file in content/courses/*.json:
 * inserts new courses, and syncs changed files into existing ones unless they were edited in the admin area.
 * See seedCourseFile in database/course-loader.mjs.
 * @param {import('knex').Knex} knex
 */
export async function seed(knex) {
  for (const file of listCourseFiles()) {
    await seedCourseFile(knex, readCourseFile(file))
  }
}
