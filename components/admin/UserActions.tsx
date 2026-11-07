'use client'

import { useRouter } from 'next/navigation'
import { apiCall, errorMessage } from '@/lib/client'

export function UserActions({ id, role, active, self }: { id: number; role: string; active: boolean; self: boolean }) {
  const router = useRouter()
  const patch = async (body: object) => {
    try { await apiCall('PATCH', `/admin/users/${id}`, body); router.refresh() } catch (e) { alert(errorMessage(e)) }
  }
  if (self) return <span className="tiny muted">You</span>
  return (
    <div className="row" style={{ gap: 4 }}>
      <button className="btn sm ghost" onClick={() => patch({ role: role === 'admin' ? 'student' : 'admin' })}>{role === 'admin' ? 'Make student' : 'Make admin'}</button>
      <button className={`btn sm ghost ${active ? 'danger' : ''}`} onClick={() => patch({ is_active: !active })}>{active ? 'Deactivate' : 'Reactivate'}</button>
    </div>
  )
}
