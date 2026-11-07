import Link from 'next/link'
import { InlineMd } from '@/components/Markdown'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { loadLearn } from '@/lib/learn-context'
import { groupBySection, markViewed, toConcept, toPublic, toQuestion } from '@/lib/learning'
import { levelsUpTo } from '@/lib/types'
import { Blocks } from '@/components/Blocks'
import { ConceptActions } from '@/components/ConceptActions'
import { ReadAloud } from '@/components/ReadAloud'
import { UsageTracker } from '@/components/UsageTracker'
import { logEvent } from '@/lib/activity'
import { narrateConcept, narrateQuestions } from '@/lib/narration'
import { LevelBadge, ProgressBar } from '@/components/ui'

export default async function ConceptPage({ params }: { params: Promise<{ slug: string; concept: string }> }) {
  const { slug, concept: conceptSlug } = await params
  const { user, course, enrollment, sections, visible, progress, percent, done } = await loadLearn(slug)
  const groups = groupBySection(visible, sections).filter((g) => g.concepts.length)
  const idx = visible.findIndex((c) => c.slug === conceptSlug)
  if (idx < 0) notFound()
  const row = await db('concepts').where({ id: visible[idx].id }).first()
  const concept = toConcept(row)
  const questions = (await db('questions').where({ concept_id: concept.id, in_practice: true }).whereIn('level', levelsUpTo(enrollment.level)).orderByRaw("FIELD(level, 'beginner', 'intermediate', 'advanced'), id"))
    .map(toQuestion).map(toPublic)
  const [narration, spokenQuestions] = await Promise.all([narrateConcept(concept.title, concept.summary, concept.blocks), narrateQuestions(questions)])
  await markViewed(user.id, concept.id)
  if (user.role === 'student') await logEvent(user.id, 'view_concept', { courseId: course.id, conceptId: concept.id })
  const section = sections.find((x) => x.id === concept.section_id)
  const prev = visible[idx - 1]
  const next = visible[idx + 1]

  return (
    <main className="container page">
      <UsageTracker courseId={course.id} />
      <div className="learn">
        <aside className="learn-side">
          <Link href={`/learn/${slug}`} className="small muted">← {course.title}</Link>
          <div className="mt mb">
            <div className="row between small"><span className="muted">{done}/{visible.length} complete</span><b>{percent}%</b></div>
            <div style={{ marginTop: 6 }}><ProgressBar value={percent} thin /></div>
          </div>
          <nav className="stack" style={{ gap: 2 }}>
            {groups.map((g, gi) => {
              const links = g.concepts.map((c) => {
                const isDone = !!progress.get(c.id)?.completed_at
                return (
                  <Link key={c.id} href={`/learn/${slug}/${c.slug}`} className={`side-link ${c.id === concept.id ? 'active' : ''}`}>
                    <span className={`side-dot ${isDone ? 'done' : ''}`}>{isDone ? '✓' : ''}</span>
                    <span className="grow">{c.title}</span>
                  </Link>
                )
              })
              if (!g.section) return <div key="loose">{links}</div>
              const doneHere = g.concepts.filter((c) => progress.get(c.id)?.completed_at).length
              return (
                <details key={g.section.id} className="side-section" open={g.section.id === concept.section_id}>
                  <summary><span>{g.section.title}</span><span>{doneHere}/{g.concepts.length}</span></summary>
                  {links}
                </details>
              )
            })}
            <Link href={`/learn/${slug}/exam`} className="side-link mt"><span className="side-dot">📝</span>Exam</Link>
          </nav>
        </aside>
        <article className="stack-lg" style={{ minWidth: 0 }}>
          <header data-block={-1}>
            <div className="row wrap small muted" style={{ gap: 8 }}>Concept {idx + 1} of {visible.length} <LevelBadge level={concept.level} /> <span>⏱ {concept.est_minutes} min</span><span className="grow" /><ReadAloud key={concept.id} segments={narration} /></div>
            {section && <div className="small" style={{ color: 'var(--primary)', fontWeight: 600, marginTop: 6 }}>{section.title}</div>}
            <h1 style={{ margin: '8px 0 4px', fontSize: '2.1rem' }}>{concept.title}</h1>
            {concept.summary && <p className="muted" style={{ fontSize: '1.08rem' }}><InlineMd text={concept.summary} /></p>}
          </header>
          <Blocks blocks={concept.blocks} />
          <ConceptActions
            key={concept.id}
            conceptId={concept.id}
            completed={!!progress.get(concept.id)?.completed_at}
            questions={spokenQuestions}
            nextHref={next ? `/learn/${slug}/${next.slug}` : null}
            examHref={`/learn/${slug}/exam`}
          />
          <div className="row between">
            {prev ? <Link className="btn ghost pager-btn" href={`/learn/${slug}/${prev.slug}`}>← {prev.title}</Link> : <span />}
            {next && <Link className="btn ghost pager-btn" style={{ textAlign: 'right' }} href={`/learn/${slug}/${next.slug}`}>{next.title} →</Link>}
          </div>
        </article>
      </div>
    </main>
  )
}
