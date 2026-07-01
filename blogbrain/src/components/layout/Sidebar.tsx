import { NavLink, useParams } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  Brain,
  Database,
  FileText,
  FolderKanban,
  Globe,
  PenLine,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkspaceSwitcher } from '@/features/workspace/components/WorkspaceSwitcher'
import { useProject } from '@/features/projects/hooks/useProjectContext'
import { useBrain } from '@/features/brain/hooks/useBrain'
import { Separator } from '@/components/ui/separator'

type NavItem = {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
  end?: boolean
}

function buildProjectNav(projectSlug: string | undefined): NavItem[] {
  const base = projectSlug ? `/p/${projectSlug}` : null

  return [
    { label: 'Projects', to: '/projects', icon: FolderKanban, end: true },
    { label: 'Sources', to: base ? `${base}/sources` : '/projects', icon: Globe, disabled: !base },
    { label: 'Knowledge', to: base ? `${base}/knowledge` : '/projects', icon: Database, disabled: !base },
    { label: 'Learning', to: base ? `${base}/learning` : '/projects', icon: BookOpen, disabled: !base },
    { label: 'Patterns', to: base ? `${base}/patterns` : '/projects', icon: Sparkles, disabled: !base },
    { label: 'Trends', to: base ? `${base}/trends` : '/projects', icon: TrendingUp, disabled: !base },
    { label: 'Writer', to: '#', icon: PenLine, disabled: true },
    { label: 'SEO', to: '#', icon: Search, disabled: true },
    { label: 'Analytics', to: '#', icon: BarChart3, disabled: true },
    { label: 'Settings', to: '/settings', icon: Settings, end: true },
  ]
}

export function Sidebar() {
  const { projectSlug } = useParams()
  const { activeProject, activeBrain, projects, setActiveProjectSlug } = useProject()
  const { brain } = useBrain(activeProject?.id)
  const navItems = buildProjectNav(projectSlug ?? activeProject?.slug)
  const brainScore = brain?.brain_score ?? activeBrain?.brain_score ?? 0

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border/60 bg-card/30">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Brain className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">BlogBrain</p>
          <p className="text-xs text-muted-foreground">Blog OS</p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <WorkspaceSwitcher />
      </div>

      {projects.length > 0 && (
        <div className="px-4 pb-4">
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            Active Project
          </label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={activeProject?.slug ?? ''}
            onChange={(event) => setActiveProjectSlug(event.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.slug}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {(brain || activeBrain) && (
        <div className="mx-4 mb-4 rounded-lg border border-border/60 px-3 py-2">
          <p className="text-xs text-muted-foreground">Brain Score</p>
          <p className="text-lg font-semibold">{brainScore}</p>
        </div>
      )}

      <Separator />

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon

          if (item.disabled) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/50"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.label === 'Writer' || item.label === 'SEO' || item.label === 'Analytics' ? (
                  <span className="ml-auto text-[10px] uppercase tracking-wide">Soon</span>
                ) : null}
              </div>
            )
          }

          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-border/60 px-4 py-4">
        <NavLink
          to={activeProject ? `/p/${activeProject.slug}` : '/projects'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )
          }
        >
          <FileText className="h-4 w-4" />
          <span>Brain Dashboard</span>
        </NavLink>
      </div>
    </aside>
  )
}
