import { getSessionUser } from '@/lib/auth'
import { listCatalog } from '@/lib/learning'
import { CourseCard } from '@/components/CourseCard'
import { Empty } from '@/components/ui'

export const metadata = { title: 'Courses' }

export default async function Courses() {
  const user = await getSessionUser()
  const courses = await listCatalog(user?.id)
  const categories = [...new Set(courses.map((c) => c.category))]
  return (
    <main className="container page">
      <h1>Course catalog</h1>
      <p className="muted">Pick a course and choose your level: beginner, intermediate or advanced.</p>
      {!courses.length && <Empty title="No courses yet">An admin can publish courses from the admin area.</Empty>}
      {categories.map((cat) => (
        <section key={cat} className="mt-lg">
          <h3 className="muted" style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.08em' }}>{cat}</h3>
          <div className="grid grid-3">{courses.filter((c) => c.category === cat).map((c) => <CourseCard key={c.id} course={c} />)}</div>
        </section>
      ))}
    </main>
  )
}
