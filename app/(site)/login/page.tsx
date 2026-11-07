import { AuthForm } from '@/components/AuthForm'

export const metadata = { title: 'Log in' }

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthForm mode="login" next={(await searchParams).next} />
}
