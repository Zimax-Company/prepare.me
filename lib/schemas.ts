import { z } from 'zod'
import { LEVELS } from './types'

export const answersSchema = z.record(z.string(), z.array(z.string().max(500)).max(20))

const level = z.enum(LEVELS)
const slug = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes')

export const courseSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug,
  tagline: z.string().trim().max(255).default(''),
  description: z.string().max(20000).default(''),
  category: z.string().trim().min(1).max(80).default('General'),
  icon: z.string().trim().min(1).max(16).default('📘'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6d5efc'),
  published: z.boolean().default(false),
})

export const examSettingsSchema = z.object({
  duration_minutes: z.number().int().min(1).max(600),
  question_count: z.number().int().min(1).max(200),
  pass_mark: z.number().int().min(1).max(100),
  max_attempts: z.number().int().min(0).max(100),
  cooldown_minutes: z.number().int().min(0).max(10080),
  shuffle_options: z.boolean(),
  show_review: z.boolean(),
  include_lower_levels: z.boolean(),
})

// Blocks are free-form JSON validated loosely: a type tag plus string/array fields.
const block = z.looseObject({ type: z.enum(['text', 'callout', 'code', 'example', 'image', 'diagram', 'flashcards', 'steps', 'reveal', 'order', 'match', 'check', 'video']) })

export const conceptSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug,
  summary: z.string().trim().max(255).default(''),
  level,
  est_minutes: z.number().int().min(1).max(600).default(10),
  section_id: z.number().int().positive().nullable().optional(),
  blocks: z.array(block).max(200).default([]),
})

const option = z.object({ id: z.string().min(1).max(20), text: z.string().min(1).max(1000) })

export const questionSchema = z
  .object({
    course_id: z.number().int().positive(),
    concept_id: z.number().int().positive().nullable().default(null),
    level,
    type: z.enum(['single', 'multiple', 'true_false', 'short']),
    prompt: z.string().trim().min(3).max(5000),
    options: z.array(option).max(10).default([]),
    answer: z.array(z.string().min(1).max(500)).min(1).max(20),
    explanation: z.string().max(5000).default(''),
    in_exam: z.boolean().default(true),
    in_practice: z.boolean().default(true),
  })
  .transform((q) => (q.type === 'true_false' ? { ...q, options: [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }] } : q))
  .superRefine((q, ctx) => {
    if (q.type === 'short') return
    const ids = new Set(q.options.map((o) => o.id))
    if (q.options.length < 2) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Add at least two options' })
    if (q.answer.some((a) => !ids.has(a))) ctx.addIssue({ code: 'custom', path: ['answer'], message: 'Answer must reference an option' })
    if (q.type !== 'multiple' && q.answer.length !== 1) ctx.addIssue({ code: 'custom', path: ['answer'], message: 'Pick exactly one correct option' })
  })

export const sectionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  objective: z.string().max(5000).default(''),
  competencies: z.array(z.string().max(500)).max(50).default([]),
  assessment: z.string().max(2000).default(''),
})
