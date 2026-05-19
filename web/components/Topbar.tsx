'use client'

import { usePathname } from 'next/navigation'
import { Search, Bell, HelpCircle, Command } from 'lucide-react'

const labels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/upload': 'Upload',
  '/beats': 'Meus beats',
  '/configuracoes': 'Configurações',
}

function getBreadcrumb(pathname: string): { secao: string; pagina: string } {
  if (pathname.startsWith('/beats/')) {
    if (pathname.endsWith('/review')) return { secao: 'Beats', pagina: 'Revisar IA' }
    return { secao: 'Beats', pagina: 'Detalhe' }
  }
  return { secao: 'Studio', pagina: labels[pathname] ?? 'Home' }
}

export function Topbar() {
  const pathname = usePathname()
  const { secao, pagina } = getBreadcrumb(pathname)

  return (
    <header
      className="flex h-14 shrink-0 items-center gap-4 px-6"
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-deepest)',
      }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2.5">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10.5,
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
          }}
        >
          {secao}
        </span>
        <span style={{ color: 'var(--text-subtle)' }}>/</span>
        <span
          className="text-[13px] font-medium"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.005em' }}
        >
          {pagina}
        </span>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div
        className="hidden items-center gap-2 rounded-lg px-3 py-1.5 md:flex"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          minWidth: 300,
        }}
      >
        <Search size={14} style={{ color: 'var(--text-subtle)' }} />
        <span className="flex-1 text-[12.5px]" style={{ color: 'var(--text-subtle)' }}>
          Buscar beats, comandos…
        </span>
        <kbd
          className="flex items-center gap-1 rounded px-1.5 py-0.5 font-mono"
          style={{
            fontSize: 10,
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Command size={9} />K
        </kbd>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          title="Ajuda"
          className="flex h-9 w-9 items-center justify-center rounded-lg transition"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-surface)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <HelpCircle size={16} />
        </button>
        <button
          type="button"
          title="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg transition"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-surface)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <Bell size={16} />
          {/* Notif dot — magenta como acento cirúrgico semântico */}
          <span
            className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
            style={{
              background: 'var(--magenta-bright)',
              boxShadow: '0 0 6px var(--magenta-bright)',
            }}
          />
        </button>
      </div>
    </header>
  )
}
