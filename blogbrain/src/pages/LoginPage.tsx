import { Navigate } from 'react-router-dom'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Skeleton } from '@/components/ui/skeleton'

export function LoginPage() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-64 w-full max-w-md" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/projects" replace />
  }

  return <LoginForm />
}
