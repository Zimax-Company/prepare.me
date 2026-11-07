import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'

export async function POST() {
  const res = NextResponse.json({ data: null })
  clearSessionCookie(res)
  return res
}
