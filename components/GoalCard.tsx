import type { GoalStatus } from '@/lib/streaks'
import { GoalSettings } from './GoalSettings'
import { ProgressRing } from './ui'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function GoalCard({ goal }: { goal: NonNullable<GoalStatus> }) {
  const unit = goal.kind === 'minutes' ? 'min' : goal.target === 1 ? 'lesson' : 'lessons'
  const left = Math.max(0, goal.target - goal.progress)
  const pct = Math.min(100, (goal.progress / goal.target) * 100)
  return (
    <div id="goal" className="card" style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: 22, alignItems: 'center' }}>
      <ProgressRing value={pct} size={92} stroke={9} label={goal.met ? '✓' : `${goal.progress}/${goal.target}`} color={goal.met ? '#ff7a3d' : 'var(--primary)'} />
      <div className="stack" style={{ gap: 8, minWidth: 0 }}>
        <div className="row wrap" style={{ gap: 10 }}>
          <span style={{ fontSize: '1.6rem' }} aria-hidden>🔥</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{goal.streak}-day streak</span>
          {goal.longest > goal.streak && <span className="tiny muted">best {goal.longest}</span>}
        </div>
        <div className="small">
          {goal.met ? <>Daily goal done. <b>Come back tomorrow</b> to keep it going.</>
            : goal.streak > 0 ? <><b>{left} {goal.kind === 'minutes' ? 'min' : left === 1 ? 'lesson' : 'lessons'} to go</b> today to keep your streak alive.</>
            : <>Do <b>{goal.target} {unit}</b> today to start a streak.</>}
          <span className="muted"> Goal: {goal.target} {unit} a day · {goal.freezeAvailable ? '❄️ streak freeze ready this week' : '❄️ freeze used this week'}</span>
        </div>
        <div className="goal-week" style={{ maxWidth: 320 }}>
          {goal.week.map((d, i) => (
            <div key={d.day} className="goal-day" title={`${d.day}: ${d.status}`}>
              <div className={`goal-dot ${d.status}`}>{d.status === 'met' ? '🔥' : d.status === 'frozen' ? '❄️' : ''}</div>
              <span style={d.day === goal.today ? { color: 'var(--text)', fontWeight: 700 } : undefined}>{DOW[i]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="stack" style={{ alignItems: 'flex-end' }}>
        <GoalSettings kind={goal.kind} target={goal.target} />
      </div>
      <style>{`@media (max-width: 640px) { #goal { grid-template-columns: auto 1fr !important; } #goal > :last-child { grid-column: 1 / -1; align-items: flex-start !important; } }`}</style>
    </div>
  )
}
