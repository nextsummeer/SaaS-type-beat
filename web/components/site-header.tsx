'use client'

import { usePathname } from 'next/navigation'
import { Search, Bell, HelpCircle, Command } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'

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

export function SiteHeader() {
  const pathname = usePathname()
  const { secao, pagina } = getBreadcrumb(pathname)

  return (
    <header
      className="sticky top-0 z-40 flex h-(--header-height) shrink-0 items-center gap-3 px-4"
      style={{
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <SidebarTrigger
        className="-ml-1"
        style={{ color: 'var(--text-muted)' }}
      />

      <div className="h-5 w-px" style={{ background: 'var(--border)' }} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px]">
        <span style={{ color: 'var(--text-muted)' }}>{secao}</span>
        <span style={{ color: 'var(--text-subtle)' }}>/</span>
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {pagina}
        </span>
      </div>

      <div className="flex-1" />

      {/* Search (decorativo) */}
      <div
        className="hidden items-center gap-2 rounded-lg px-3 py-1.5 md:flex"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          minWidth: 280,
        }}
      >
        <Search size={14} style={{ color: 'var(--text-subtle)' }} />
        <span className="flex-1 text-[12px]" style={{ color: 'var(--text-subtle)' }}>
          Buscar beats, comandos…
        </span>
        <kbd
          className="flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[10px]"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-muted)',
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
          <span
            className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent-glow)' }}
          />
        </button>
      </div>
    </header>
  )
}
