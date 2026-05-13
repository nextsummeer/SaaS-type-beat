'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Upload,
  Music,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react'

const grupos = [
  {
    label: 'GERAL',
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

  async function handleSair() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  return (
    <aside
      className="flex w-56 flex-shrink-0 flex-col py-5"
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="mb-6 flex items-center gap-2 px-4">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{ background: 'var(--accent)' }}
        >
          <Zap size={14} color="#fff" strokeWidth={2.5} />
        </div>
        <span
          className="text-sm font-semibold tracking-wide"
          style={{ color: 'var(--text-primary)' }}
        >
          BeatPost
        </span>
      </div>

      {/* Navegação por grupos */}
      <nav className="flex flex-1 flex-col gap-4 px-2">
        {grupos.map((grupo) => (
          <div key={grupo.label}>
            <p
              className="mb-1 px-2 text-[10px] font-semibold tracking-widest"
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
                    className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors"
                    style={{
                      background: ativo ? 'var(--bg-elevated)' : 'transparent',
                      color: ativo ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: ativo ? 500 : 400,
                    }}
                  >
                    <Icon
                      size={15}
                      strokeWidth={ativo ? 2 : 1.75}
                      style={{ color: ativo ? 'var(--accent)' : 'var(--text-muted)' }}
                    />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sair */}
      <div className="px-2 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleSair}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors"
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
          <LogOut size={15} strokeWidth={1.75} />
          Sair
        </button>
      </div>
    </aside>
  )
}
