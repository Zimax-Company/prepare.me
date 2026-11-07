import { AuthForm } from '@/components/AuthForm'

export const metadata = { title: 'Sign up' }

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthForm mode="register" next={(await searchParams).next} />
}
