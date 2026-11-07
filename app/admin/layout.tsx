import { Nav } from '@/components/Nav'
import { AdminSide } from '@/components/admin/AdminSide'
import { requirePageAdmin } from '@/lib/auth'

export const metadata = { title: { default: 'Admin', template: '%s · Admin · prepare.me' } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageAdmin()
  return (
    <>
      <Nav />
      <div className="admin">
        <AdminSide />
        <main className="admin-main">{children}</main>
      </div>
    </>
  )
}
