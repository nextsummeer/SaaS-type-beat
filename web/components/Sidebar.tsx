'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Upload,
  Music,
  CalendarRange,
  BarChart3,
  Trophy,
  Settings,
  ChevronRight,
} from 'lucide-react'

type SubItem = {
  href: string
  label: string
}

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  subItems?: SubItem[]
  exact?: boolean
}

const navPrincipal: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/upload', label: 'Novo beat', icon: Upload },
  { href: '/beats', label: 'Meus beats', icon: Music, exact: true },
  { href: '/agenda', label: 'Agenda', icon: CalendarRange, exact: true },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
    subItems: [
      { href: '/analytics', label: 'Visão geral' },
      { href: '/analytics/beats', label: 'Meus beats' },
      { href: '/analytics/fontes', label: 'De onde vêm' },
    ],
  },
  { href: '/conquistas', label: 'Conquistas', icon: Trophy, exact: true },
]

const navSecundaria: NavItem[] = [
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelado) setEmail(data.user?.email ?? null)
    })
    return () => {
      cancelado = true
    }
  }, [])

  async function handleSair() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const inicial = (email?.[0] ?? '?').toUpperCase()
  const handle = email?.split('@')[0] ?? 'producer'

  function NavLink({ item }: { item: NavItem }) {
    const ativo = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/')
    const Icon = item.icon
    const temSub = item.subItems && item.subItems.length > 0
    const dentroDoGrupo = !!temSub && (pathname === item.href || pathname.startsWith(item.href + '/'))

    return (
      <div>
        <Link
          href={item.href}
          className="group/item relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
          style={{
            background: ativo ? 'rgba(255,255,255,0.05)' : 'transparent',
            color: ativo ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
          onMouseEnter={(e) => {
            if (!ativo) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }
          }}
          onMouseLeave={(e) => {
            if (!ativo) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }
          }}
        >
          {/* Barra lateral branca no ativo */}
          {ativo && (
            <span
              aria-hidden
              className="absolute -left-3 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full"
              style={{ background: '#FFFFFF' }}
            />
          )}

          <Icon
            size={17}
            strokeWidth={ativo ? 2 : 1.6}
            className="shrink-0"
          />
          <span
            className="text-[14px]"
            style={{ fontWeight: ativo ? 500 : 400, letterSpacing: '-0.005em' }}
          >
            {item.label}
          </span>
        </Link>

        {/* Sub-items */}
        {dentroDoGrupo && item.subItems && (
          <div
            className="ml-[28px] mt-1 flex flex-col gap-0.5 border-l pl-3"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {item.subItems.map((sub) => {
              const subAtivo = pathname === sub.href
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className="relative flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors"
                  style={{
                    color: subAtivo ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: subAtivo ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!subAtivo) e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                  onMouseLeave={(e) => {
                    if (!subAtivo) e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                >
                  {subAtivo && (
                    <span
                      aria-hidden
                      className="absolute -left-[15px] h-1.5 w-1.5 rounded-full"
                      style={{ background: '#FFFFFF' }}
                    />
                  )}
                  {sub.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside
      className="relative z-10 flex w-[260px] flex-shrink-0 flex-col"
      style={{
        background: 'var(--bg-base)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-7 pb-7">
        <Link href="/dashboard" className="group flex items-center gap-3">
          <div
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <div className="wave-bars" style={{ color: '#fff' }}>
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <span
            className="font-display text-[18px] font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
          >
            BeatPost
          </span>
        </Link>
      </div>

      {/* Eyebrow seção principal */}
      <div className="px-5 pb-2">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: '0.22em',
            color: 'var(--text-subtle)',
          }}
        >
          Studio
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        {navPrincipal.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="mx-5 my-5 h-px" style={{ background: 'var(--border-subtle)' }} />

      {/* Eyebrow seção secundária */}
      <div className="px-5 pb-2">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: '0.22em',
            color: 'var(--text-subtle)',
          }}
        >
          Conta
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        {navSecundaria.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="flex-1" />

      {/* Footer — perfil */}
      <div
        className="px-3 pb-3 pt-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <button
          type="button"
          onClick={handleSair}
          className="group/perfil flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-semibold"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
            }}
          >
            {inicial}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[13.5px] font-semibold leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {handle}
            </p>
            <p
              className="mt-0.5 truncate text-[11.5px] leading-tight"
              style={{ color: 'var(--text-muted)' }}
            >
              Producer · Free
            </p>
          </div>
          <ChevronRight
            size={15}
            strokeWidth={1.6}
            className="shrink-0 transition group-hover/perfil:translate-x-0.5"
            style={{ color: 'var(--text-subtle)' }}
          />
        </button>
      </div>
    </aside>
  )
}
