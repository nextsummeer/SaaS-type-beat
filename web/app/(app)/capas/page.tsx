'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchCovers,
  fetchCoverCredits,
  type CoverLibraryItem,
  type CoverCreditsState,
  type CoverBrief,
} from '@/lib/api'
import { CapasHeader } from '@/components/CapasHeader'
import { CapasGrid } from '@/components/CapasGrid'

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }

/**
 * Aba /capas — biblioteca + geração de capas via IA.
 *
 * Estados visuais cobertos:
 *  - LOADING: skeleton no header + skeleton grid
 *  - EMPTY + SEM BRIEF: hero centralizado pedindo configuração
 *  - EMPTY + COM BRIEF: header completo + grid vazio com CTA
 *  - CONTEÚDO: header + grid de capas
 *  - SEM CRÉDITOS: header + grid + botões disabled
 */
export default function CapasPage() {
  const supabase = createClient()

  const [state, setState] = useState<PageState>({ kind: 'loading' })
  const [covers, setCovers] = useState<CoverLibraryItem[]>([])
  const [credits, setCredits] = useState<CoverCreditsState | null>(null)
  const [defaultBrief, setDefaultBrief] = useState<CoverBrief | null>(null)
  const [artistaNome, setArtistaNome] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setState({ kind: 'error', message: 'Sessão expirada' })
        return
      }

      // 1. Profile (default_brief) — vem do Supabase direto, sem endpoint dedicado
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('default_brief')
        .single()

      const brief = (profile?.default_brief as CoverBrief | null) ?? null
      setDefaultBrief(brief)

      // 2. Se tem brief com artista_id, resolve o nome do artista
      if (brief?.artista_id) {
        const { data: artist } = await supabase
          .from('artistas_referencia')
          .select('nome_canonico')
          .eq('id', brief.artista_id)
          .single()
        setArtistaNome(artist?.nome_canonico ?? null)
      } else {
        setArtistaNome(null)
      }

      // 3. Em paralelo: créditos + biblioteca
      const [creditsRes, coversRes] = await Promise.all([
        fetchCoverCredits(token),
        fetchCovers(token),
      ])
      setCredits(creditsRes)
      setCovers(coversRes)
      setState({ kind: 'ready' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar capas'
      setState({ kind: 'error', message })
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── HANDLERS (todos placeholder por enquanto — implementação real em T4.13+) ──
  const handleEditStyle = () => {
    console.log('TODO T4.13: abrir wizard de edição de estilo')
  }
  const handleConfigureStyle = () => {
    console.log('TODO T4.13: abrir wizard de configuração inicial')
  }
  const handleGenerate = (lote: 1 | 3) => {
    console.log(`TODO T4.18: confirmar geração de ${lote} capa(s)`)
  }
  const handleGenerateDifferent = () => {
    console.log('TODO T4.13: abrir modal de brief pontual')
  }
  const handleDownload = (cover: CoverLibraryItem) => {
    // Implementação simples agora — abre URL direto pra download
    const link = document.createElement('a')
    link.href = cover.image_url
    link.download = `capa-${cover.id.slice(0, 8)}.jpg`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  const handleUseInBeat = (cover: CoverLibraryItem) => {
    console.log('TODO T2.11: redirecionar pra /upload com cover_id pre-selecionado', cover.id)
  }
  const handleDiscard = (cover: CoverLibraryItem) => {
    console.log('TODO: confirmar e deletar capa', cover.id)
  }

  // ── RENDER ──

  if (state.kind === 'error') {
    return <PageError message={state.message} onRetry={loadData} />
  }

  // EMPTY + SEM BRIEF — hero centralizado pedindo configuração
  // Mostra após loading terminar, se não tem default_brief configurado
  if (state.kind === 'ready' && !defaultBrief) {
    return <EmptyNoBrief onConfigure={handleConfigureStyle} />
  }

  const isLoading = state.kind === 'loading'

  return (
    <div className="space-y-10">
      {/* HEADER editorial */}
      <header className="rise rise-1">
        <SectionLabel num="01" label="Sua biblioteca de capas" />
        <CapasHeader
          defaultBrief={defaultBrief}
          artistaNome={artistaNome}
          credits={credits}
          loading={isLoading}
          onEditStyle={handleEditStyle}
          onGenerate={handleGenerate}
          onGenerateWithDifferentBrief={handleGenerateDifferent}
        />
      </header>

      {/* GRID */}
      <section className="rise rise-2">
        <SectionLabel num="02" label="Capas geradas" />
        <CapasGrid
          covers={covers}
          loading={isLoading}
          generatingCount={0}
          onDownload={handleDownload}
          onUseInBeat={handleUseInBeat}
          onDiscard={handleDiscard}
        />
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Sub-componentes locais
// ─────────────────────────────────────────────────────────────────────

function SectionLabel({ num, label }: { num: string; label: string }) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <span
        className="font-mono"
        style={{
          fontSize: 10,
          color: 'var(--text-subtle)',
          letterSpacing: '0.22em',
        }}
      >
        {num}
      </span>
      <span
        className="font-mono uppercase"
        style={{
          fontSize: 10.5,
          fontWeight: 500,
          letterSpacing: '0.22em',
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </span>
      <span aria-hidden className="flex-1 hairline" />
    </div>
  )
}

/**
 * Estado inicial: produtor nunca configurou estilo.
 * Hero centralizado com decoração editorial — 3 retângulos quadrados
 * em sequência sugerindo "capas a nascer".
 */
function EmptyNoBrief({ onConfigure }: { onConfigure: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-12">
      <div className="rise rise-1 mb-10">
        <BlankCoversArt />
      </div>

      <div className="rise rise-2 max-w-md text-center">
        <p
          className="eyebrow mb-4"
          style={{ color: 'var(--text-subtle)' }}
        >
          Capas · Geração via IA
        </p>
        <h1
          className="font-display text-[34px] font-semibold leading-[1.06]"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.028em' }}
        >
          Vamos configurar seu<br />
          <span className="text-gradient-brand">estilo visual</span>.
        </h1>
        <p
          className="mx-auto mt-5 max-w-sm text-[14px] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          O BeatPost gera capas pra você com IA. Comece definindo o estilo
          que combina com seus type beats — depois é só clicar pra criar.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={onConfigure}
            className="btn-primary group"
          >
            <Sparkles size={14} strokeWidth={2.2} />
            Configurar agora
            <ArrowUpRight
              size={13}
              strokeWidth={2.4}
              className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </button>

          <Link
            href="/upload"
            className="group inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            Subir capa manual no upload
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Decoração SVG do estado vazio — 3 quadrados em sequência editorial,
 * com numeração mono e gradientes sutis. Sugere "biblioteca a nascer".
 */
function BlankCoversArt() {
  return (
    <svg
      width="280"
      height="120"
      viewBox="0 0 280 120"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="blank-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
        <linearGradient id="blank-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(199,181,255,0.10)" />
          <stop offset="100%" stopColor="rgba(255,80,214,0.04)" />
        </linearGradient>
      </defs>

      {/* Card 1 — outline esquerdo */}
      <rect
        x="20"
        y="20"
        width="80"
        height="80"
        rx="6"
        fill="url(#blank-grad-1)"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      <text
        x="32"
        y="93"
        fill="rgba(255,255,255,0.30)"
        fontSize="9"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.18em"
      >
        [01]
      </text>

      {/* Card 2 — destaque centro com leve gradient */}
      <rect
        x="110"
        y="20"
        width="80"
        height="80"
        rx="6"
        fill="url(#blank-grad-2)"
        stroke="rgba(199,181,255,0.28)"
        strokeWidth="1"
      />
      {/* Cintilação central — sparkle marker */}
      <g transform="translate(150, 60)">
        <circle r="2" fill="#C7B5FF" opacity="0.85" />
        <circle r="6" fill="none" stroke="rgba(199,181,255,0.30)" strokeWidth="1">
          <animate attributeName="r" values="4;10;4" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.45;0;0.45" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </g>
      <text
        x="122"
        y="93"
        fill="#C7B5FF"
        opacity="0.65"
        fontSize="9"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.18em"
      >
        [02]
      </text>

      {/* Card 3 — outline direito */}
      <rect
        x="200"
        y="20"
        width="80"
        height="80"
        rx="6"
        fill="url(#blank-grad-1)"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      <text
        x="212"
        y="93"
        fill="rgba(255,255,255,0.30)"
        fontSize="9"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.18em"
      >
        [03]
      </text>

      {/* Linhas guias entre cards — sutil, editorial */}
      <line x1="100" y1="60" x2="110" y2="60" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1="190" y1="60" x2="200" y2="60" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
    </svg>
  )
}

function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p
        className="font-mono uppercase mb-3"
        style={{
          fontSize: 10,
          letterSpacing: '0.22em',
          color: 'var(--led-error)',
        }}
      >
        Erro
      </p>
      <h2
        className="font-display text-[20px] font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        Não consegui carregar suas capas
      </h2>
      <p
        className="mt-2 max-w-sm text-[13px]"
        style={{ color: 'var(--text-muted)' }}
      >
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="btn-ghost mt-6"
      >
        Tentar de novo
      </button>
    </div>
  )
}
