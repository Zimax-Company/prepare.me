import { Nav } from '@/components/Nav'
import { GoalCelebration } from '@/components/GoalCelebration'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
      <GoalCelebration />
    </>
  )
}
