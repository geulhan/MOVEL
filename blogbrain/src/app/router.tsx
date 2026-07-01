import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { BrainDashboardPage } from '@/pages/BrainDashboardPage'
import { SourcesPage } from '@/pages/SourcesPage'
import { KnowledgePage } from '@/pages/KnowledgePage'
import { LearningPage } from '@/pages/LearningPage'
import { PatternsPage } from '@/pages/PatternsPage'
import { TrendsPage } from '@/pages/TrendsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { useAuth } from '@/features/auth/hooks/useAuth'

function RootRedirect() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return null
  return <Navigate to={isAuthenticated ? '/projects' : '/login'} replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route path="/p/:projectSlug" element={<BrainDashboardPage />} />
            <Route path="/p/:projectSlug/sources" element={<SourcesPage />} />
            <Route path="/p/:projectSlug/knowledge" element={<KnowledgePage />} />
            <Route path="/p/:projectSlug/learning" element={<LearningPage />} />
            <Route path="/p/:projectSlug/patterns" element={<PatternsPage />} />
            <Route path="/p/:projectSlug/trends" element={<TrendsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
