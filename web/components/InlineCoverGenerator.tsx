'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  AlertCircle,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  createBrief,
  fetchBriefs,
  fetchCoverCredits,
  fetchCovers,
  generateCover,
  type BriefPreset,
  type CoverBrief,
  type CoverCreditsState,
  type CoverLibraryItem,
} from '@/lib/api'
import { CapasWizard } from './CapasWizard'

type View = 'loading' | 'picking' | 'generating' | 'done' | 'error'

type Props = {
  open: boolean
  onClose: () => void
  /** Chamado quando o produtor confirma usar a capa gerada. Passa o cover_id
   * (uma capa ja com status='ready' na cover_library). */
  onGenerated: (coverId: string) => void
}

/**
 * Modal de geracao de capa por IA disparado do CoverPicker no /upload (T4.44).
 *
 * Fluxo:
 *   1. picking  — escolhe um brief salvo OU cria um novo (CapasWizard)
 *   2. generating — POST /covers/generate (sincrono, ~30s) com orb
 *   3. done     — mostra a capa pronta; "Usar essa capa" devolve o cover_id
 *
 * Reusa CapasWizard + lib/api (fetchBriefs/createBrief/generateCover). Brief
 * novo criado aqui FICA SALVO na lista do produtor (decisao Gustavo 2026-06-02).
 */
export function InlineCoverGenerator({ open, onClose, onGenerated }: Props) {
  const supabase = createClient()

  const [view, setView] = useState<View>('loading')
  const [briefs, setBriefs] = useState<BriefPreset[]>([])
  const [credits, setCredits] = useState<CoverCreditsState | null>(null)
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [generatedCover, setGeneratedCover] = useState<CoverLibraryItem | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const wasOpenRef = useRef(false)

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }, [supabase])

  // Carrega briefs + creditos na transicao fechado -> aberto
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current
    wasOpenRef.current = open
    if (!justOpened) return

    // Reset
    setView('loading')
    setSelectedBriefId(null)
    setGeneratedCover(null)
    setErrorMsg(null)
    setWizardOpen(false)

    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) throw new Error('Sessão expirada')
        const [briefsRes, creditsRes] = await Promise.all([
          fetchBriefs(token),
          fetchCoverCredits(token),
        ])
        if (cancelled) return
        setBriefs(briefsRes.items)
        setCredits(creditsRes)
        // Pre-seleciona o brief ativo, se houver
        const active = briefsRes.items.find((b) => b.is_active)
        setSelectedBriefId(active?.id ?? briefsRes.items[0]?.id ?? null)
        setView('picking')
      } catch (err) {
        if (cancelled) return
        setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar')
        setView('error')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, getToken])

  // Esc fecha (exceto durante geracao, pra nao abandonar a chamada paga)
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && view !== 'generating' && !wizardOpen) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, view, wizardOpen, onClose])

  // Lock body scroll enquanto aberto
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const semCredito = !!credits && credits.remaining <= 0

  const runGeneration = useCallback(
    async (brief: CoverBrief, briefPresetId: string | null) => {
      setView('generating')
      setErrorMsg(null)
      try {
        const token = await getToken()
        if (!token) throw new Error('Sessão expirada')

        const result = await generateCover(token, { brief, lote: 1, briefPresetId })
        if (!result.ok || result.generated_ids.length === 0) {
          throw new Error(result.errors[0] ?? 'Não consegui gerar a capa')
        }
        const novoId = result.generated_ids[0]

        // generateCover retorna so o id; busca a capa pra ter o image_url do preview
        const covers = await fetchCovers(token)
        const cover = covers.find((c) => c.id === novoId) ?? null
        setGeneratedCover(cover)
        setCredits((prev) =>
          prev ? { ...prev, remaining: result.credits_remaining, used: prev.limit - result.credits_remaining } : prev,
        )
        if (!cover) {
          // Gerou mas nao achou no fetch (raro) — ainda da pra usar pelo id
          onGenerated(novoId)
          return
        }
        setView('done')
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Erro ao gerar a capa')
        setView('error')
      }
    },
    [getToken, onGenerated],
  )

  const handleGenerateFromSelected = useCallback(() => {
    const brief = briefs.find((b) => b.id === selectedBriefId)
    if (!brief || semCredito) return
    void runGeneration(brief.brief, brief.id)
  }, [briefs, selectedBriefId, semCredito, runGeneration])

  // Salva o brief criado no wizard e (opcionalmente) gera na hora
  const handleWizardSave = useCallback(
    async (
      data: { name: string; brief: CoverBrief },
      action: 'save_only' | 'save_and_generate',
    ) => {
      const token = await getToken()
      if (!token) throw new Error('Sessão expirada')

      const saved = await createBrief(token, {
        name: data.name,
        brief: data.brief,
        activate: true,
      })
      // Recarrega a lista pra incluir o novo + seleciona
      const refreshed = await fetchBriefs(token)
      setBriefs(refreshed.items)
      setSelectedBriefId(saved.id)
      setWizardOpen(false)

      if (action === 'save_and_generate') {
        await runGeneration(saved.brief, saved.id)
      }
    },
    [getToken, runGeneration],
  )

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
        style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && view !== 'generating') onClose()
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gerar capa com IA"
          className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* HEADER */}
          <header
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles size={15} strokeWidth={2} style={{ color: 'var(--purple-light)' }} />
              <span
                className="font-mono uppercase"
                style={{ fontSize: 10.5, letterSpacing: '0.22em', color: 'var(--text-secondary)' }}
              >
                Gerar capa · IA
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={view === 'generating'}
              aria-label="Fechar"
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                if (view !== 'generating') {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </header>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {view === 'loading' && (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
              </div>
            )}

            {view === 'picking' && (
              <PickingView
                briefs={briefs}
                credits={credits}
                selectedBriefId={selectedBriefId}
                onSelect={setSelectedBriefId}
                onCreateNew={() => setWizardOpen(true)}
              />
            )}

            {view === 'generating' && <GeneratingView />}

            {view === 'done' && generatedCover && (
              <DoneView cover={generatedCover} />
            )}

            {view === 'error' && (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <AlertCircle size={24} strokeWidth={1.6} style={{ color: 'var(--led-error)' }} />
                <p className="max-w-sm text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {errorMsg ?? 'Algo deu errado.'}
                </p>
                <button type="button" onClick={() => setView('picking')} className="btn-ghost">
                  <RefreshCw size={13} strokeWidth={2} />
                  Tentar de novo
                </button>
              </div>
            )}
          </div>

          {/* FOOTER (dinamico por view) */}
          {view === 'picking' && (
            <footer
              className="flex items-center justify-between gap-3 px-6 py-4"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                {semCredito
                  ? 'Sem créditos no seu plano'
                  : credits
                    ? `${credits.remaining} ${credits.remaining === 1 ? 'crédito' : 'créditos'} restantes`
                    : ''}
              </span>
              <button
                type="button"
                onClick={handleGenerateFromSelected}
                disabled={!selectedBriefId || semCredito}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                title={
                  semCredito
                    ? 'Apague uma capa ou faça upgrade'
                    : !selectedBriefId
                      ? 'Escolha um brief primeiro'
                      : undefined
                }
              >
                <Sparkles size={13} strokeWidth={2.2} />
                Gerar
                <span
                  className="font-mono tabular"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: '0.08em',
                    color: 'rgba(255,255,255,0.78)',
                    paddingLeft: 8,
                    marginLeft: 2,
                    borderLeft: '1px solid rgba(255,255,255,0.22)',
                  }}
                >
                  1 CRÉDITO
                </span>
              </button>
            </footer>
          )}

          {view === 'done' && generatedCover && (
            <footer
              className="flex items-center justify-between gap-3 px-6 py-4"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <button type="button" onClick={() => setView('picking')} className="btn-ghost">
                <RefreshCw size={13} strokeWidth={2} />
                Gerar outra
              </button>
              <button
                type="button"
                onClick={() => onGenerated(generatedCover.id)}
                className="btn-primary"
              >
                <Check size={13} strokeWidth={2.4} />
                Usar essa capa
                <ArrowRight size={13} strokeWidth={2.4} />
              </button>
            </footer>
          )}
        </div>
      </div>

      {/* Wizard pra criar brief novo (fica salvo). Renderizado por ultimo pra
        * ficar acima deste modal. */}
      <CapasWizard
        open={wizardOpen}
        editingPresetId={null}
        initialBrief={null}
        isOnboardingFree={false}
        onClose={() => setWizardOpen(false)}
        onSave={handleWizardSave}
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Picking — escolhe um brief salvo ou cria novo
// ─────────────────────────────────────────────────────────────────────
function PickingView({
  briefs,
  credits,
  selectedBriefId,
  onSelect,
  onCreateNew,
}: {
  briefs: BriefPreset[]
  credits: CoverCreditsState | null
  selectedBriefId: string | null
  onSelect: (id: string) => void
  onCreateNew: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2
          className="font-display text-[20px] font-semibold leading-tight"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
        >
          Escolha o estilo da capa
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Use um brief salvo ou crie um novo. A capa entra direto no seu beat.
        </p>
      </div>

      {briefs.length > 0 ? (
        <div className="space-y-2">
          <span
            className="font-mono uppercase block"
            style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-muted)' }}
          >
            Seus briefs
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {briefs.map((b) => (
              <BriefCard
                key={b.id}
                brief={b}
                selected={selectedBriefId === b.id}
                onClick={() => onSelect(b.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl px-4 py-5 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-medium)' }}
        >
          <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Você ainda não tem nenhum brief. Crie o primeiro pra gerar sua capa.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onCreateNew}
        className="font-mono uppercase inline-flex items-center gap-2 rounded-lg border border-dashed px-3.5 py-2.5 transition-all"
        style={{
          borderColor: 'var(--border-medium)',
          color: 'var(--text-muted)',
          background: 'transparent',
          fontSize: 10.5,
          letterSpacing: '0.18em',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-purple)'
          e.currentTarget.style.color = 'var(--text-primary)'
          e.currentTarget.style.background = 'rgba(199,181,255,0.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-medium)'
          e.currentTarget.style.color = 'var(--text-muted)'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <Plus size={12} strokeWidth={2.2} />
        Criar novo brief
      </button>

      {credits && credits.limit > 0 && (
        <div
          className="h-[3px] w-full overflow-hidden rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          aria-hidden
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(0, Math.min(100, (credits.remaining / credits.limit) * 100))}%`,
              background: 'var(--gradient-primary)',
            }}
          />
        </div>
      )}
    </div>
  )
}

function BriefCard({
  brief,
  selected,
  onClick,
}: {
  brief: BriefPreset
  selected: boolean
  onClick: () => void
}) {
  const artista = brief.brief.artista_primario ?? brief.brief.artista_nome ?? null
  const genero = brief.brief.genero_primario
    ? brief.brief.genero_primario.replace(/_/g, ' ')
    : null
  const sub = [artista, genero].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex flex-col items-start gap-0.5 rounded-lg px-3.5 py-3 text-left transition-all"
      style={{
        background: selected ? 'rgba(199,181,255,0.10)' : 'rgba(255,255,255,0.02)',
        border: selected ? '1px solid var(--border-purple)' : '1px solid var(--border-subtle)',
        boxShadow: selected ? 'var(--shadow-glow-purple)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.045)'
          e.currentTarget.style.borderColor = 'var(--border-medium)'
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
          e.currentTarget.style.borderColor = 'var(--border-subtle)'
        }
      }}
    >
      <span
        className="truncate text-[13.5px] font-medium leading-tight"
        style={{ color: selected ? 'var(--text-primary)' : 'var(--text-secondary)', maxWidth: '100%' }}
      >
        {brief.name}
      </span>
      {sub && (
        <span className="truncate text-[11px]" style={{ color: 'var(--text-subtle)', maxWidth: '100%' }}>
          {sub}
        </span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Generating — orb signature da plataforma (mesmo do PendingCard /capas)
// ─────────────────────────────────────────────────────────────────────
function GeneratingView() {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <Orb />
      <div className="text-center">
        <p
          className="font-display text-[18px] font-semibold leading-tight"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.018em' }}
        >
          Gerando sua capa
        </p>
        <p className="mt-1.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          A IA está montando a arte — leva uns 30 segundos.
        </p>
      </div>
      <div
        className="h-[3px] w-48 overflow-hidden rounded-full"
        style={{ background: 'rgba(255,255,255,0.06)' }}
        aria-hidden
      >
        <div
          className="h-full w-1/3 rounded-full shimmer"
          style={{ background: 'var(--gradient-primary)' }}
        />
      </div>
    </div>
  )
}

/** Orb morphing — mesma assinatura visual do PendingCard da /capas. */
function Orb() {
  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <div
        aria-hidden
        className="absolute inset-0 animate-pulse-slow"
        style={{
          background: 'radial-gradient(circle, rgba(65,0,255,0.55), transparent 62%)',
          filter: 'blur(14px)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 68% 38%, rgba(255,26,190,0.45), transparent 58%)',
          filter: 'blur(18px)',
          animation: 'pulse-slow 3.4s ease-in-out infinite',
          animationDelay: '-1.2s',
        }}
      />
      <span
        aria-hidden
        className="absolute"
        style={{
          width: '92%',
          height: '92%',
          borderRadius: '50%',
          border: '1px dashed rgba(199, 181, 255, 0.28)',
          animation: 'rotate-slow 14s linear infinite',
        }}
      />
      <div
        className="relative h-[58%] w-[58%] animate-orb-morph"
        style={{
          background:
            'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, transparent 28%), linear-gradient(135deg, #4100FF 0%, #FF1ABE 100%)',
          boxShadow:
            '0 0 24px rgba(65,0,255,0.55), 0 0 40px rgba(255,26,190,0.32), inset 0 0 14px rgba(255,255,255,0.20), inset -8px -12px 22px rgba(0,0,0,0.34)',
          borderRadius: '50%',
        }}
      >
        <span
          aria-hidden
          className="absolute"
          style={{
            top: '18%',
            left: '22%',
            width: '24%',
            height: '24%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.75)',
            filter: 'blur(4px)',
          }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Done — preview da capa gerada
// ─────────────────────────────────────────────────────────────────────
function DoneView({ cover }: { cover: CoverLibraryItem }) {
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="flex items-center gap-2">
        <span className="led led-pulse" style={{ color: 'var(--led-success)' }} />
        <span
          className="font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: '0.22em', color: 'var(--led-success)' }}
        >
          Capa pronta
        </span>
      </div>
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          aspectRatio: '1 / 1',
          width: 280,
          maxWidth: '100%',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-purple)',
          boxShadow: 'var(--shadow-glow-purple)',
        }}
      >
        {cover.image_url && (
          <Image
            src={cover.image_url}
            alt="Capa gerada por IA"
            fill
            sizes="280px"
            className="object-cover"
            unoptimized
          />
        )}
      </div>
    </div>
  )
}
