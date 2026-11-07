import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listCatalog } from '@/lib/learning'
import { CourseCard } from '@/components/CourseCard'

export default async function Home() {
  if (await getSessionUser()) redirect('/dashboard')
  const courses = (await listCatalog()).slice(0, 3)
  const features = [
    { icon: '🧩', title: 'Interactive concepts', body: 'Flip cards, animated diagrams, drag-to-order drills and step-through walkthroughs. You learn by doing.' },
    { icon: '🎯', title: 'Three difficulty levels', body: 'Start as a beginner or jump straight to advanced. Content and questions adapt to the level you pick.' },
    { icon: '💬', title: 'Q&A on every concept', body: 'Practice questions with instant feedback and explanations after each lesson.' },
    { icon: '⏱️', title: 'Timed exams', body: 'Random questions from the bank, a live countdown, autosave and instant scoring.' },
    { icon: '📈', title: 'Track every attempt', body: 'Progress bars per course and a score history across all your exam attempts.' },
    { icon: '🧪', title: 'Lots of examples', body: 'Worked problems with hidden solutions, so you can try each one before you peek.' },
  ]
  return (
    <main>
      <section className="hero container">
        <span className="badge primary mb">✦ Learn it. Practice it. Prove it.</span>
        <h1>Get <span className="grad">properly prepared</span>,<br />one concept at a time.</h1>
        <p className="lead">Interactive courses that mix clear text, graphics and hands-on drills, followed by practice Q&amp;A and timed exams that show what you really know.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link href="/register" className="btn primary lg">Start learning free</Link>
          <Link href="/courses" className="btn lg">Browse courses</Link>
        </div>
      </section>
      <section className="container">
        <div className="grid grid-3">
          {features.map((f) => (
            <div key={f.title} className="card flat feature">
              <div className="feature-icon">{f.icon}</div>
              <div><div className="card-title">{f.title}</div><div className="muted small">{f.body}</div></div>
            </div>
          ))}
        </div>
      </section>
      {courses.length > 0 && (
        <section className="container mt-lg page">
          <div className="row between mb"><h2 style={{ margin: 0 }}>Popular courses</h2><Link href="/courses" className="btn ghost sm">See all →</Link></div>
          <div className="grid grid-3">{courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        </section>
      )}
    </main>
  )
}
