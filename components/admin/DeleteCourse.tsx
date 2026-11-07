'use client'

import { apiCall } from '@/lib/client'

export function DeleteCourse({ id, title }: { id: number; title: string }) {
  return (
    <button
      className="btn danger"
      onClick={async () => {
        if (prompt(`This permanently deletes "${title}", its concepts, questions, enrollments and attempts.\nType DELETE to confirm.`) !== 'DELETE') return
        await apiCall('DELETE', `/admin/courses/${id}`)
        window.location.href = '/admin/courses'
      }}
    >
      Delete course
    </button>
  )
}
