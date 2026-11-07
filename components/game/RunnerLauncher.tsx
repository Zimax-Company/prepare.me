'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnswerRunner } from './AnswerRunner'

type CourseOpt = { id: number; title: string; icon: string; sections: { id: number; title: string; playable: number }[]; playable: number }

/** Course/level picker that launches a run. */
export function RunnerLauncher({ courses, initialCourse }: { courses: CourseOpt[]; initialCourse?: number }) {
  const [courseId, setCourseId] = useState<number>(initialCourse ?? courses[0]?.id)
  const [sectionId, setSectionId] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const router = useRouter()
  const course = courses.find((c) => c.id === courseId)

  // Full-screen while playing: no page scroll behind the game.
  useEffect(() => {
    if (!playing) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [playing])

  if (playing && course) {
    return (
      <div className="runner-fullscreen" role="dialog" aria-label="Answer Runner">
        <AnswerRunner courseId={course.id} sectionId={sectionId} courseTitle={course.title} onExit={() => { setPlaying(false); router.refresh() }} />
      </div>
    )
  }

  return (
    <div className="card stack">
      <label className="field">Course
        <select className="input" value={courseId} onChange={(e) => { setCourseId(Number(e.target.value)); setSectionId(null) }}>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}
        </select>
      </label>
      {course && course.sections.length > 0 && (
        <label className="field">Questions from
          <select className="input" value={sectionId ?? ''} onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Every level open to you ({course.playable} questions)</option>
            {course.sections.map((s) => <option key={s.id} value={s.id} disabled={s.playable < 8}>{s.title} ({s.playable}){s.playable < 8 ? ': not enough' : ''}</option>)}
          </select>
        </label>
      )}
      <button className="btn primary lg block" onClick={() => setPlaying(true)} disabled={!course || course.playable < 8}>🚀 Play Answer Runner</button>
      <p className="tiny muted center" style={{ margin: 0 }}>Uses single-choice and true/false questions at your enrolled level. Answers count as practice.</p>
    </div>
  )
}
