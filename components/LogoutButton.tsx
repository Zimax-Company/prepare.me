'use client'

export function LogoutButton() {
  return (
    <button
      className="btn sm"
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        window.location.href = '/'
      }}
    >
      Log out
    </button>
  )
}
