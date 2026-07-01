import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeInitializer } from '@/hooks/useTheme'
import { WorkspaceProvider } from '@/features/workspace/hooks/useWorkspaceContext'
import { ProjectProvider } from '@/features/projects/hooks/useProjectContext'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      <WorkspaceProvider>
        <ProjectProvider>{children}</ProjectProvider>
      </WorkspaceProvider>
    </QueryClientProvider>
  )
}
