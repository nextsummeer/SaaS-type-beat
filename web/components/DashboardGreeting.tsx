'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function saudacao(h: number): string {
  if (h < 5) return 'Boa madrugada'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function DashboardGreeting() {
  const supabase = createClient()
  const [nome, setNome] = useState<string>('')
  const [agora, setAgora] = useState<Date | null>(null)

  useEffect(() => {
    let cancelado = false
    let intervalId: ReturnType<typeof setInterval> | undefined

    supabase.auth.getUser().then(({ data }) => {
      if (cancelado) return
      const e = data.user?.email ?? ''
      const handle = e.split('@')[0] ?? ''
      setNome(handle)
    })

    const tid = setTimeout(() => {
      if (cancelado) return
      setAgora(new Date())
      intervalId = setInterval(() => setAgora(new Date()), 30_000)
    }, 0)

    return () => {
      cancelado = true
      clearTimeout(tid)
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  const h = agora?.getHours() ?? 12
  const olá = saudacao(h)
  const hora = agora
    ? agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--'
  const data = agora
    ? agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })
    : ''

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="led led-pulse" style={{ color: 'var(--accent)' }} />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
          studio aberto · {hora}
        </span>
      </div>
      <h1
        className="font-display text-[44px] font-semibold leading-[1.05] tracking-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        {olá}, <span style={{ color: 'var(--accent)' }}>{nome || 'producer'}</span>.
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {data ? data.charAt(0).toUpperCase() + data.slice(1) + ' — ' : ''}
        Suba um beat e a IA monta título, descrição, tags e capa em menos de 2 minutos.
      </p>
    </div>
  )
}
