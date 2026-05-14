'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Upload,
  Music,
  Settings,
  LogOut,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

const grupos: { label: string; itens: NavItem[] }[] = [
  {
    label: 'PRODUÇÃO',
    itens: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/upload', label: 'Novo beat', icon: Upload },
      { href: '/beats', label: 'Meus beats', icon: Music },
    ],
  },
  {
    label: 'CONTA',
    itens: [
      { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
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
    return () => { cancelado = true }
  }, [])

  async function handleSair() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  const inicial = (email?.[0] ?? '?').toUpperCase()
  const handle = email?.split('@')[0] ?? 'producer'

  return (
    <aside
      className="relative z-10 flex w-60 flex-shrink-0 flex-col"
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo + wordmark */}
      <div className="flex items-center justify-between px-5 pt-6 pb-5">
        <Link href="/dashboard" className="group flex items-center gap-2.5">
          <div
            className="relative flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-glow-accent)' }}
          >
            <div className="wave-bars" style={{ color: '#fff' }}>
              <span /><span /><span /><span /><span />
            </div>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              BEATPOST
            </span>
            <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-subtle)' }}>
              v1.0 · beta
            </span>
          </div>
        </Link>
      </div>

      {/* Status REC */}
      <div className="mx-5 mb-4 flex items-center gap-2">
        <span className="led led-pulse" style={{ color: 'var(--accent)' }} />
        <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
          online · ready
        </span>
        <span className="ml-auto h-px flex-1" style={{ background: 'var(--border-muted)' }} />
      </div>

      {/* Navegação */}
      <nav className="flex flex-1 flex-col gap-5 px-3 pb-3">
        {grupos.map((grupo) => (
          <div key={grupo.label}>
            <p
              className="mb-1.5 px-3 font-mono text-[9px] font-medium uppercase tracking-[0.22em]"
              style={{ color: 'var(--text-subtle)' }}
            >
              {grupo.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {grupo.itens.map((item) => {
                const ativo = isActive(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all"
                    style={{
                      background: ativo ? 'var(--bg-elevated)' : 'transparent',
                      color: ativo ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: ativo ? 500 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (!ativo) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!ativo) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-muted)'
                      }
                    }}
                  >
                    {ativo && (
                      <span
                        className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full"
                        style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)' }}
                      />
                    )}
                    <Icon
                      size={15}
                      strokeWidth={ativo ? 2.2 : 1.75}
                      style={{ color: ativo ? 'var(--accent)' : 'currentColor' }}
                    />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Card de upgrade Pro */}
      <div className="px-3 pb-3">
        <div
          className="relative overflow-hidden rounded-xl p-4"
          style={{
            background: 'linear-gradient(160deg, rgba(255,90,31,0.12), rgba(255,90,31,0.02) 60%)',
            border: '1px solid rgba(255,90,31,0.25)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full"
            style={{ background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)' }}
          />
          <div className="relative">
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} style={{ color: 'var(--accent)' }} />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
                beatpost pro
              </span>
            </div>
            <p className="mt-2 font-display text-[15px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
              Capas ilimitadas e analytics avançado
            </p>
            <p className="mt-1 text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
              Tire o teto de uploads e desbloqueie métricas profundas.
            </p>
            <button
              type="button"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition"
              style={{ background: 'var(--accent)', color: '#fff' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)' }}
            >
              Conhecer
              <ArrowUpRight size={11} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Conta */}
      <div className="px-3 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-2 pt-3">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold"
            style={{ background: 'var(--bg-elevated)', color: 'var(--accent)', border: '1px solid var(--border)' }}
          >
            {inicial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {handle}
            </p>
            <p className="truncate font-mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-subtle)' }}>
              free tier
            </p>
          </div>
          <button
            type="button"
            onClick={handleSair}
            title="Sair"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <LogOut size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  )
}
