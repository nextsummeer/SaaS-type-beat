'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Upload,
  Music,
  BarChart3,
  Settings,
  ChevronRight,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

const navPrincipal: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Novo beat', icon: Upload },
  { href: '/beats', label: 'Meus beats', icon: Music },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
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

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const inicial = (email?.[0] ?? '?').toUpperCase()
  const handle = email?.split('@')[0] ?? 'producer'

  function NavLink({ item }: { item: NavItem }) {
    const ativo = isActive(item.href)
    const Icon = item.icon
    return (
      <Link
        href={item.href}
        className="group/item relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
        style={{
          background: ativo ? 'rgba(255,255,255,0.04)' : 'transparent',
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
        <Icon
          size={18}
          strokeWidth={ativo ? 2 : 1.75}
          className="shrink-0"
        />
        <span
          className="text-[14.5px]"
          style={{ fontWeight: ativo ? 500 : 400 }}
        >
          {item.label}
        </span>
      </Link>
    )
  }

  return (
    <aside
      className="relative z-10 flex w-[280px] flex-shrink-0 flex-col"
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-7 pb-6">
        <Link href="/dashboard" className="group flex items-center gap-3">
          <div
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'var(--accent)' }}
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
            className="font-display text-[17px] font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            BeatPost
          </span>
        </Link>
      </div>

      {/* Nav principal */}
      <nav className="flex flex-col gap-1 px-3">
        {navPrincipal.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Separador */}
      <div className="mx-5 my-5 h-px" style={{ background: 'var(--border)' }} />

      {/* Nav secundária */}
      <nav className="flex flex-col gap-1 px-3">
        {navSecundaria.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Espaço vazio respirando */}
      <div className="flex-1" />

      {/* Footer — perfil */}
      <div
        className="px-3 pb-3 pt-3"
        style={{ borderTop: '1px solid var(--border)' }}
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
              background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-overlay))',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-strong)',
            }}
          >
            {inicial}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[14px] font-semibold leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {handle}
            </p>
            <p
              className="mt-0.5 truncate text-[12px] leading-tight"
              style={{ color: 'var(--text-muted)' }}
            >
              Producer · Free
            </p>
          </div>
          <ChevronRight
            size={16}
            strokeWidth={1.75}
            className="shrink-0 transition group-hover/perfil:translate-x-0.5"
            style={{ color: 'var(--text-subtle)' }}
          />
        </button>
      </div>
    </aside>
  )
}
