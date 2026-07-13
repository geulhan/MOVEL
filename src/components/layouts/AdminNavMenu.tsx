import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import type { AdminNavEntry, AdminNavGroup } from '../../lib/adminNav'
import {
  flattenNavForMobile,
  isNavGroupActive,
  isNavPathActive,
} from '../../lib/adminNav'

function QueryNavLink({
  to,
  label,
  icon,
  className,
  nested = false,
}: {
  to: string
  label: string
  icon?: string
  className: string
  nested?: boolean
}) {
  const location = useLocation()
  const active = isNavPathActive(location.pathname, location.search, to)

  return (
    <Link
      to={to}
      className={`${className} ${nested ? 'pl-9' : ''}`}
      style={{
        background: active ? 'var(--center-tab-active-bg)' : undefined,
        color: active ? 'var(--center-tab-active-text)' : 'var(--center-sidebar-muted)',
      }}
    >
      {icon ? (
        <>
          <span className="w-4 shrink-0 text-center text-sm opacity-80">{icon}</span>
          <span className="truncate">{label}</span>
        </>
      ) : (
        label
      )}
    </Link>
  )
}

function DesktopNavGroup({
  group,
  pathname,
  search,
}: {
  group: AdminNavGroup
  pathname: string
  search: string
}) {
  const active = isNavGroupActive(pathname, search, group)
  const [open, setOpen] = useState(active)

  useEffect(() => {
    if (active) setOpen(true)
  }, [active])

  if (group.children.length === 1) {
    const only = group.children[0]
    const [path, query] = only.to.split('?')
    if (query) {
      return (
        <QueryNavLink
          to={only.to}
          label={only.label}
          icon={group.icon}
          className="flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition"
        />
      )
    }

    return (
      <NavLink
        to={path}
        end={only.end}
        className="flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition"
        style={({ isActive }) =>
          isActive
            ? {
                background: 'var(--center-tab-active-bg)',
                color: 'var(--center-tab-active-text)',
              }
            : { color: 'var(--center-sidebar-muted)' }
        }
      >
        <span className="w-4 shrink-0 text-center text-sm opacity-80">
          {group.icon}
        </span>
        <span className="truncate">{only.label}</span>
      </NavLink>
    )
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap transition"
        style={{
          color: active ? 'var(--center-tab-active-text)' : 'var(--center-sidebar-muted)',
          background: active
            ? 'color-mix(in srgb, var(--center-tab-active-bg) 55%, transparent)'
            : undefined,
        }}
      >
        <span className="w-4 shrink-0 text-center text-sm opacity-80">
          {group.icon}
        </span>
        <span className="flex-1 truncate">{group.label}</span>
        <span className="text-xs opacity-70">{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <div className="space-y-0.5">
          {group.children.map((child) => {
            const [path, query] = child.to.split('?')
            if (query) {
              return (
                <QueryNavLink
                  key={child.to}
                  to={child.to}
                  label={child.label}
                  nested
                  className="block rounded-lg py-2 pr-3 text-sm font-medium transition"
                />
              )
            }
            return (
              <NavLink
                key={child.to}
                to={path}
                end={child.end}
                className="block rounded-lg py-2 pr-3 pl-9 text-sm font-medium transition"
                style={({ isActive }) =>
                  isActive
                    ? {
                        background: 'var(--center-tab-active-bg)',
                        color: 'var(--center-tab-active-text)',
                      }
                    : { color: 'var(--center-sidebar-muted)' }
                }
              >
                {child.label}
              </NavLink>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function AdminNavMenu({
  entries,
  variant,
}: {
  entries: AdminNavEntry[]
  variant: 'desktop' | 'mobile'
}) {
  const location = useLocation()
  const pathname = location.pathname
  const search = location.search

  const mobileItems = useMemo(() => flattenNavForMobile(entries), [entries])

  if (variant === 'mobile') {
    return (
      <>
        {mobileItems.map((item) => {
          const [path, query] = item.to.split('?')
          if (query) {
            const isActive = isNavPathActive(pathname, search, item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className="chip rounded-full border px-3 py-1.5 text-xs font-medium transition"
                style={{
                  background: isActive ? 'var(--center-tab-active-bg)' : undefined,
                  color: isActive
                    ? 'var(--center-tab-active-text)'
                    : 'var(--center-sidebar-muted)',
                  borderColor: isActive
                    ? 'color-mix(in srgb, var(--center-accent) 40%, transparent)'
                    : 'color-mix(in srgb, var(--center-sidebar-text) 12%, transparent)',
                }}
              >
                {item.label}
              </Link>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={path}
              end={item.end}
              className="chip rounded-full border px-3 py-1.5 text-xs font-medium transition"
              style={({ isActive }) =>
                isActive
                  ? {
                      background: 'var(--center-tab-active-bg)',
                      color: 'var(--center-tab-active-text)',
                      borderColor:
                        'color-mix(in srgb, var(--center-accent) 40%, transparent)',
                    }
                  : {
                      background:
                        'color-mix(in srgb, var(--center-sidebar-text) 8%, transparent)',
                      color: 'var(--center-sidebar-muted)',
                      borderColor:
                        'color-mix(in srgb, var(--center-sidebar-text) 12%, transparent)',
                    }
              }
            >
              {item.label}
            </NavLink>
          )
        })}
      </>
    )
  }

  return (
    <>
      {entries.map((entry) => {
        if (entry.type === 'link') {
          return (
            <NavLink
              key={entry.to}
              to={entry.to}
              end={entry.end}
              className="flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition"
              style={({ isActive }) =>
                isActive
                  ? {
                      background: 'var(--center-tab-active-bg)',
                      color: 'var(--center-tab-active-text)',
                    }
                  : { color: 'var(--center-sidebar-muted)' }
              }
            >
              <span className="w-4 shrink-0 text-center text-sm opacity-80">
                {entry.icon}
              </span>
              <span className="truncate">{entry.label}</span>
            </NavLink>
          )
        }

        return (
          <DesktopNavGroup
            key={entry.id}
            group={entry}
            pathname={pathname}
            search={search}
          />
        )
      })}
    </>
  )
}
