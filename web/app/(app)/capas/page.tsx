'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { CapasWizard } from '@/components/CapasWizard'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

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
  const [hasGeneratedFirstCover, setHasGeneratedFirstCover] = useState<boolean>(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [generatingCount, setGeneratingCount] = useState(0)

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setState({ kind: 'error', message: 'Sessão expirada' })
        return
      }

      // 1. Profile (default_brief + has_generated_first_cover) — vem do Supabase direto.
      //    Artista vem como texto livre dentro do brief (artista_nome),
      //    nao precisa resolver de tabela.
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('default_brief, has_generated_first_cover')
        .single()

      const brief = (profile?.default_brief as CoverBrief | null) ?? null
      setDefaultBrief(brief)
      setHasGeneratedFirstCover(Boolean(profile?.has_generated_first_cover))

      // 2. Em paralelo: créditos + biblioteca
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

  // ── HANDLERS ──
  const handleEditStyle = () => setWizardOpen(true)
  const handleConfigureStyle = () => setWizardOpen(true)

  /**
   * Chamado pelo wizard quando produtor salva o brief.
   * - Persiste default_brief em user_profiles
   * - Fecha o modal LOGO (UX: produtor não fica preso esperando 30s da geração)
   * - Se action='save_and_generate', dispara POST /covers/generate em background.
   *   Aba mostra skeleton via generatingCount enquanto roda.
   *   Primeira capa pode ser gratis (logica no backend via has_generated_first_cover).
   */
  const handleWizardSave = useCallback(
    async (brief: CoverBrief, action: 'save_only' | 'save_and_generate') => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Sessão expirada')

      // 1. Persiste o brief (rápido, ~200ms)
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ default_brief: brief })
        .eq('user_id', session.user.id)

      if (updateError) {
        console.error('Falha ao salvar default_brief:', updateError)
        throw new Error('Falha ao salvar estilo padrão')
      }

      // 2. Fecha o wizard ANTES de atualizar defaultBrief no state.
      //    Isso evita race condition que disparava reset do useEffect interno
      //    do wizard (Step 1 bug de 2026-05-21).
      setWizardOpen(false)
      setDefaultBrief(brief)

      // 3. Geração em background (não bloqueia o fechamento do modal)
      if (action === 'save_and_generate') {
        setGeneratingCount(1)
        try {
          const res = await fetch(`${API_URL}/covers/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ brief, lote: 1, save_as_default: false }),
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            console.error('Falha ao gerar capa:', body)
          }
        } catch (err) {
          console.error('Erro no fetch /covers/generate:', err)
        } finally {
          setGeneratingCount(0)
        }
      }

      // 4. Recarrega tudo (créditos, biblioteca, has_generated_first_cover)
      await loadData()
    },
    [supabase, loadData],
  )

  const handleGenerate = (lote: 1 | 3) => {
    // T4.18 vai implementar modal de confirmação + chamada real.
    console.log(`TODO T4.18: confirmar geração de ${lote} capa(s)`)
  }
  const handleGenerateDifferent = () => {
    // V1.5 — por enquanto também leva pro wizard (vai poder editar antes de gerar pontual)
    console.log('TODO T4.18: abrir modal de brief pontual sem salvar como default')
  }
  const handleDownload = (cover: CoverLibraryItem) => {
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

  const isLoading = state.kind === 'loading'
  const showEmptyNoBrief = state.kind === 'ready' && !defaultBrief
  const isFirstTime = !defaultBrief
  const isOnboardingFree = !hasGeneratedFirstCover

  let pageContent: React.ReactNode

  if (state.kind === 'error') {
    pageContent = <PageError message={state.message} onRetry={loadData} />
  } else if (showEmptyNoBrief) {
    pageContent = <EmptyNoBrief onConfigure={handleConfigureStyle} />
  } else {
    pageContent = (
      <div className="space-y-10">
        {/* HEADER editorial */}
        <header className="rise rise-1">
          <SectionLabel num="01" label="Sua biblioteca de capas" />
          <CapasHeader
            defaultBrief={defaultBrief}
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
            generatingCount={generatingCount}
            onDownload={handleDownload}
            onUseInBeat={handleUseInBeat}
            onDiscard={handleDiscard}
          />
        </section>
      </div>
    )
  }

  return (
    <>
      {pageContent}
      <CapasWizard
        open={wizardOpen}
        initialBrief={defaultBrief}
        isFirstTime={isFirstTime}
        isOnboardingFree={isOnboardingFree}
        onClose={() => setWizardOpen(false)}
        onSave={handleWizardSave}
      />
    </>
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

        <div className="mt-8 flex justify-center">
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
        </div>
      </div>
    </div>
  )
}

/**
 * Decoração SVG do estado vazio — 3 quadrados em sequência editorial.
 * O do meio é o "destaque": gradient roxo→magenta visível + sparkle pulsando.
 * Os laterais são placeholders tracejados marcantes.
 * Sugere "biblioteca a nascer com IA".
 */
function BlankCoversArt() {
  return (
    <svg
      width="380"
      height="180"
      viewBox="0 0 380 180"
      fill="none"
      aria-hidden
    >
      <defs>
        {/* Gradient interno das boxes laterais (sutil, sugere "ainda vazio") */}
        <linearGradient id="blank-side" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>

        {/* Gradient da box central — destaque MARCANTE roxo→magenta */}
        <linearGradient id="blank-hero" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(65,0,255,0.32)" />
          <stop offset="55%" stopColor="rgba(101,51,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,26,190,0.18)" />
        </linearGradient>

        {/* Glow externo da box central */}
        <radialGradient id="blank-hero-glow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(199,181,255,0.30)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        {/* Filtro de glow pro sparkle */}
        <filter id="sparkle-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Card 01 — placeholder lateral esquerdo ── */}
      <g>
        <rect
          x="20"
          y="30"
          width="110"
          height="110"
          rx="8"
          fill="url(#blank-side)"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.2"
          strokeDasharray="3 5"
        />
        <text
          x="34"
          y="128"
          fill="rgba(255,255,255,0.55)"
          fontSize="11"
          fontWeight="500"
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.20em"
        >
          [01]
        </text>
      </g>

      {/* ── Card 02 — destaque MARCANTE central ── */}
      <g>
        {/* Halo externo morfando */}
        <rect
          x="130"
          y="20"
          width="120"
          height="120"
          rx="14"
          fill="url(#blank-hero-glow)"
          opacity="0.85"
        >
          <animate
            attributeName="opacity"
            values="0.55;1;0.55"
            dur="3.2s"
            repeatCount="indefinite"
          />
        </rect>

        {/* Box principal */}
        <rect
          x="140"
          y="30"
          width="110"
          height="110"
          rx="8"
          fill="url(#blank-hero)"
          stroke="rgba(199,181,255,0.55)"
          strokeWidth="1.2"
        />

        {/* Sparkle SVG central — 4 pontas, estilo Lucide */}
        <g transform="translate(195, 78)" filter="url(#sparkle-glow)">
          <path
            d="M 0 -12 L 2 -2 L 12 0 L 2 2 L 0 12 L -2 2 L -12 0 L -2 -2 Z"
            fill="#FFFFFF"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to="360"
              dur="16s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.85;1;0.85"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </path>

          {/* Anel pulsante secundário */}
          <circle r="20" fill="none" stroke="rgba(199,181,255,0.55)" strokeWidth="1">
            <animate attributeName="r" values="14;24;14" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.65;0;0.65" dur="2.4s" repeatCount="indefinite" />
          </circle>

          {/* 2º anel pulsante (defasado) */}
          <circle r="20" fill="none" stroke="rgba(255,80,214,0.45)" strokeWidth="1">
            <animate attributeName="r" values="14;24;14" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.55;0;0.55" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
          </circle>
        </g>

        <text
          x="154"
          y="128"
          fill="rgba(255,255,255,0.92)"
          fontSize="11"
          fontWeight="500"
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.20em"
        >
          [02]
        </text>
      </g>

      {/* ── Card 03 — placeholder lateral direito ── */}
      <g>
        <rect
          x="260"
          y="30"
          width="110"
          height="110"
          rx="8"
          fill="url(#blank-side)"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.2"
          strokeDasharray="3 5"
        />
        <text
          x="274"
          y="128"
          fill="rgba(255,255,255,0.55)"
          fontSize="11"
          fontWeight="500"
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.20em"
        >
          [03]
        </text>
      </g>

      {/* Linhas guias finas conectando as boxes — editorial */}
      <line x1="130" y1="85" x2="140" y2="85" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
      <line x1="250" y1="85" x2="260" y2="85" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
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
