export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export type Level = (typeof LEVELS)[number]
export const LEVEL_LABEL: Record<Level, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
export const levelRank = (l: Level) => LEVELS.indexOf(l)
/** Levels a student at `level` can access (their level and everything below it). */
export const levelsUpTo = (l: Level) => LEVELS.slice(0, levelRank(l) + 1)

export type Role = 'student' | 'admin'
export type User = { id: number; name: string; email: string; role: Role; is_active: boolean }

export type Course = {
  id: number
  slug: string
  title: string
  tagline: string
  description: string
  category: string
  icon: string
  color: string
  published: boolean
}

export type QuestionType = 'single' | 'multiple' | 'true_false' | 'short'
export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  single: 'Single choice',
  multiple: 'Multiple choice',
  true_false: 'True / False',
  short: 'Short answer',
}
export type Option = { id: string; text: string }

export type Question = {
  id: number
  course_id: number
  concept_id: number | null
  level: Level
  type: QuestionType
  prompt: string
  options: Option[]
  answer: string[]
  explanation: string
  in_exam: boolean
  in_practice: boolean
}
/** What the browser sees before answering: no answer, no explanation. */
export type PublicQuestion = Pick<Question, 'id' | 'type' | 'prompt' | 'options' | 'level'>

export type ExamSettings = {
  course_id: number
  duration_minutes: number
  question_count: number
  pass_mark: number
  max_attempts: number
  cooldown_minutes: number
  shuffle_options: boolean
  show_review: boolean
  include_lower_levels: boolean
}

// ---- Content blocks -------------------------------------------------------------------------
export type Block =
  | { type: 'text'; md: string }
  | { type: 'callout'; tone: 'info' | 'tip' | 'warning' | 'success'; title: string; md: string }
  | { type: 'code'; language: string; code: string; caption?: string }
  | { type: 'example'; title: string; problem: string; solution: string }
  | { type: 'image'; url: string; alt: string; caption?: string }
  | { type: 'diagram'; title?: string; nodes: string[] } // rendered as an animated flow
  | { type: 'flashcards'; cards: { front: string; back: string }[] }
  | { type: 'steps'; title: string; steps: { title: string; md: string }[] }
  | { type: 'reveal'; items: { q: string; a: string }[] } // accordion / FAQ
  | { type: 'order'; prompt: string; items: string[] } // items in the CORRECT order; shuffled in UI
  | { type: 'match'; prompt: string; pairs: { left: string; right: string }[] }
  | { type: 'check'; question: string; options: string[]; correct: number; explanation?: string }
  | { type: 'video'; url: string; caption?: string }

export type BlockType = Block['type']

export const BLOCK_META: Record<BlockType, { label: string; icon: string; hint: string }> = {
  text: { label: 'Text', icon: '¶', hint: 'Rich text with **bold**, _italic_, `code`, lists and headings' },
  callout: { label: 'Callout', icon: '💡', hint: 'Highlighted tip, note or warning' },
  code: { label: 'Code', icon: '</>', hint: 'Syntax block with copy button' },
  example: { label: 'Worked example', icon: '🧪', hint: 'Problem with a hidden, revealable solution' },
  image: { label: 'Image', icon: '🖼', hint: 'Picture or chart by URL' },
  diagram: { label: 'Flow diagram', icon: '➜', hint: 'Animated step-by-step flow graphic' },
  flashcards: { label: 'Flashcards', icon: '🃏', hint: 'Flip cards for key terms' },
  steps: { label: 'Step-through', icon: '👣', hint: 'Walkthrough the learner advances one step at a time' },
  reveal: { label: 'Q&A reveal', icon: '❓', hint: 'Questions with tap-to-reveal answers' },
  order: { label: 'Put in order', icon: '↕', hint: 'Drag items into the correct sequence' },
  match: { label: 'Match pairs', icon: '🔗', hint: 'Connect each term to its definition' },
  check: { label: 'Quick check', icon: '✔', hint: 'Inline single-answer knowledge check' },
  video: { label: 'Video', icon: '▶', hint: 'YouTube/Vimeo embed or MP4 URL' },
}

export function emptyBlock(type: BlockType): Block {
  switch (type) {
    case 'text': return { type, md: '' }
    case 'callout': return { type, tone: 'tip', title: 'Tip', md: '' }
    case 'code': return { type, language: 'js', code: '' }
    case 'example': return { type, title: 'Example', problem: '', solution: '' }
    case 'image': return { type, url: '', alt: '' }
    case 'diagram': return { type, title: '', nodes: ['Start', 'Middle', 'End'] }
    case 'flashcards': return { type, cards: [{ front: '', back: '' }] }
    case 'steps': return { type, title: '', steps: [{ title: 'Step 1', md: '' }] }
    case 'reveal': return { type, items: [{ q: '', a: '' }] }
    case 'order': return { type, prompt: 'Put these in the right order', items: ['First', 'Second', 'Third'] }
    case 'match': return { type, prompt: 'Match each term to its meaning', pairs: [{ left: '', right: '' }] }
    case 'check': return { type, question: '', options: ['', ''], correct: 0 }
    case 'video': return { type, url: '' }
  }
}
