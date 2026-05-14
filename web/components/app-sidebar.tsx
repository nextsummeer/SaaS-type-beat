'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  Music,
  Settings,
  LogOut,
  Sparkles,
  ArrowUpRight,
  HelpCircle,
  MessageCircle,
  ChevronsUpDown,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard }

const grupos: { label: string; itens: NavItem[] }[] = [
  {
    label: 'Produção',
    itens: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/upload', label: 'Novo beat', icon: Upload },
      { href: '/beats', label: 'Meus beats', icon: Music },
    ],
  },
  {
    label: 'Conta',
    itens: [
      { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
]

const ajudaItens: NavItem[] = [
  { href: '/configuracoes', label: 'Ajuda', icon: HelpCircle },
  { href: '/configuracoes', label: 'Feedback', icon: MessageCircle },
]

export function AppSidebar() {
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

  return (
    <Sidebar collapsible="icon" className="border-r" style={{ borderColor: 'var(--sidebar-border)' }}>
      {/* HEADER — logo + plano */}
      <SidebarHeader className="px-3 py-4">
        <Link
          href="/dashboard"
          className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-[var(--sidebar-accent)]"
        >
          <div
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-glow-accent)' }}
          >
            <div className="wave-bars" style={{ color: '#fff' }}>
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span
              className="font-display text-[15px] font-semibold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              BEATPOST
            </span>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--text-subtle)' }}
            >
              v1.0 · beta
            </span>
          </div>
        </Link>

        {/* REC online */}
        <div className="mt-2 flex items-center gap-2 px-2 group-data-[collapsible=icon]:hidden">
          <span className="led led-pulse" style={{ color: 'var(--accent)' }} />
          <span
            className="font-mono text-[10px] uppercase tracking-[0.2em]"
            style={{ color: 'var(--text-muted)' }}
          >
            online · ready
          </span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* CONTENT — grupos de navegação */}
      <SidebarContent className="gap-2 px-1 py-3">
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.label}>
            <SidebarGroupLabel
              className="font-mono uppercase tracking-[0.18em]"
              style={{ color: 'var(--text-subtle)', fontSize: 10, letterSpacing: '0.18em' }}
            >
              {grupo.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.itens.map((item) => {
                  const ativo = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={ativo}
                        size="lg"
                        tooltip={item.label}
                        className="relative h-10 gap-3 rounded-lg px-3 text-[13.5px] font-medium"
                      >
                        {ativo && (
                          <span
                            aria-hidden
                            className="absolute left-0 top-1/2 h-6 w-[2.5px] -translate-y-1/2 rounded-r-full group-data-[collapsible=icon]:hidden"
                            style={{
                              background: 'var(--accent)',
                              boxShadow: '0 0 10px var(--accent-glow)',
                            }}
                          />
                        )}
                        <Icon
                          strokeWidth={ativo ? 2.2 : 1.85}
                          style={{ color: ativo ? 'var(--accent)' : 'var(--text-muted)' }}
                        />
                        <span style={{ color: ativo ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {item.label}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* Upgrade card (escondido quando collapsed=icon) */}
        <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
          <div
            className="relative overflow-hidden rounded-xl p-4"
            style={{
              background:
                'linear-gradient(160deg, rgba(255,90,31,0.14), rgba(255,90,31,0.02) 65%)',
              border: '1px solid rgba(255,90,31,0.28)',
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full"
              style={{ background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)' }}
            />
            <div className="relative">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} style={{ color: 'var(--accent)' }} />
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.18em]"
                  style={{ color: 'var(--accent)' }}
                >
                  beatpost pro
                </span>
              </div>
              <p
                className="mt-2 font-display text-[14px] font-semibold leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Capas ilimitadas e analytics
              </p>
              <button
                type="button"
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition"
                style={{ background: 'var(--accent)', color: '#fff' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--accent)'
                }}
              >
                Conhecer
                <ArrowUpRight size={11} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </SidebarGroup>

        {/* Ajuda/Feedback */}
        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {ajudaItens.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      size="lg"
                      tooltip={item.label}
                      className="h-9 gap-3 rounded-lg px-3 text-[13px]"
                    >
                      <Icon strokeWidth={1.85} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      {/* FOOTER — conta */}
      <SidebarFooter className="px-2 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={handle}
              className="h-12 gap-3 rounded-lg px-2 text-left"
              onClick={handleSair}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono text-[12px] font-bold"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--accent)',
                  border: '1px solid var(--border)',
                }}
              >
                {inicial}
              </div>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span
                  className="truncate text-[13px] font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {handle}
                </span>
                <span
                  className="truncate text-[11px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {email ?? '—'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <LogOut size={14} strokeWidth={1.75} style={{ color: 'var(--text-subtle)' }} />
                <ChevronsUpDown
                  size={13}
                  strokeWidth={1.75}
                  style={{ color: 'var(--text-subtle)' }}
                  className="group-data-[collapsible=icon]:hidden"
                />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
