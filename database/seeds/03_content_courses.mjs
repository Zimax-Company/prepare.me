import path from 'node:path'
import { importCourse, listCourseFiles, readCourseFile } from '../course-loader.mjs'

/**
 * Seeds every course file in content/courses/*.json. Idempotent: a course whose slug already
 * exists is skipped, so admin edits are never overwritten on deploy.
 * @param {import('knex').Knex} knex
 */
export async function seed(knex) {
  for (const file of listCourseFiles()) {
    const parsed = readCourseFile(file)
    const added = await importCourse(knex, parsed)
    if (added) console.log(`  + course "${parsed.course.title}" from ${path.basename(file)}`)
  }
}
