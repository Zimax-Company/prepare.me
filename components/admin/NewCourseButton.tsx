'use client'

import { useState } from 'react'
import { CourseForm } from './CourseForm'

export function NewCourseButton({ autoOpen = false }: { autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen)
  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}>+ New course</button>
      {open && (
        <div className="modal-back" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row between mb"><h2 style={{ margin: 0 }}>New course</h2><button className="btn ghost sm" onClick={() => setOpen(false)}>✕</button></div>
            <CourseForm />
          </div>
        </div>
      )}
    </>
  )
}
