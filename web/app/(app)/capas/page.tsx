'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchCovers,
  fetchCoverCredits,
  deleteCover,
  fetchBriefs,
  createBrief,
  updateBrief,
  deleteBrief as apiDeleteBrief,
  activateBrief,
  type CoverLibraryItem,
  type CoverCreditsState,
  type CoverBrief,
  type BriefPreset,
} from '@/lib/api'
import { CapasHeader } from '@/components/CapasHeader'
import { CapasGrid } from '@/components/CapasGrid'
import { CapasWizard } from '@/components/CapasWizard'
import { ConfirmGenerateModal } from '@/components/ConfirmGenerateModal'
import { ManageBriefsModal } from '@/components/ManageBriefsModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }

/**
 * Aba /capas — biblioteca + geração de capas via IA.
 *
 * Modelo de brief: presets nomeados (brief_presets). Um é "ativo".
 * Botões "Gerar 1/3" usam o brief ativo.
 *
 * Status das capas vem do DB (cover_library.status): pending/ready/failed.
 * Skeleton de "Gerando" sobrevive a refresh (não é mais state local).
 */
export default function CapasPage() {
  const supabase = createClient()
  const router = useRouter()

  const [state, setState] = useState<PageState>({ kind: 'loading' })
  const [covers, setCovers] = useState<CoverLibraryItem[]>([])
  const [credits, setCredits] = useState<CoverCreditsState | null>(null)
  const [presets, setPresets] = useState<BriefPreset[]>([])
  const [presetLimit, setPresetLimit] = useState<number>(1)
  const [hasGeneratedFirstCover, setHasGeneratedFirstCover] = useState<boolean>(false)

  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardEditingId, setWizardEditingId] = useState<string | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [confirmLote, setConfirmLote] = useState<1 | 3 | null>(null)
  // 'new' = capa nova do zero | 'variation' = outra leitura do mesmo brief.
  // Tecnicamente identicos (mesmo brief, novo sorteio de variation_seeds).
  // Diferenca e apenas signaling UX pro produtor.
  const [confirmIntent, setConfirmIntent] = useState<'new' | 'variation'>('new')
  /** Capa pendente de confirmacao de delete (modal ConfirmDialog) */
  const [confirmDiscard, setConfirmDiscard] = useState<CoverLibraryItem | null>(null)
  const [discardLoading, setDiscardLoading] = useState(false)
  /**
   * Skeletons "fantasma" que aparecem instantaneamente ao clicar Gerar,
   * antes do INSERT pending real chegar via Realtime. Some assim que o
   * primeiro real pending aparece (ou após N segundos como fallback).
   */
  const [optimisticPending, setOptimisticPending] = useState(0)

  const activeBrief = presets.find((p) => p.is_active) ?? null

  // ─────────────────────────────────────────────────────────────────
  // CARREGAMENTO INICIAL
  // ─────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setState({ kind: 'error', message: 'Sessão expirada' })
        return
      }

      // Profile (has_generated_first_cover)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('has_generated_first_cover')
        .single()
      setHasGeneratedFirstCover(Boolean(profile?.has_generated_first_cover))

      // Em paralelo: créditos + biblioteca + briefs
      const [creditsRes, coversRes, briefsRes] = await Promise.all([
        fetchCoverCredits(token),
        fetchCovers(token),
        fetchBriefs(token),
      ])
      setCredits(creditsRes)
      setCovers(coversRes)
      setPresets(briefsRes.items)
      setPresetLimit(briefsRes.limit)
      setState({ kind: 'ready' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar capas'
      setState({ kind: 'error', message })
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ─────────────────────────────────────────────────────────────────
  // REALTIME — cover_library INSERT e UPDATE
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let channelRef: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    async function setupRealtime() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user || cancelled) return

      channelRef = supabase
        .channel(`cover-library-${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',  // INSERT (pending) e UPDATE (ready/failed)
            schema: 'public',
            table: 'cover_library',
            filter: `user_id=eq.${session.user.id}`,
          },
          () => {
            loadData()
          },
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      cancelled = true
      if (channelRef) supabase.removeChannel(channelRef)
    }
  }, [supabase, loadData])

  // ─────────────────────────────────────────────────────────────────
  // GERAÇÃO
  // ─────────────────────────────────────────────────────────────────
  const triggerGenerate = useCallback(
    async (brief: CoverBrief, lote: 1 | 3, intent: 'new' | 'variation' = 'new') => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return

      // Log local de signaling -- futuro: plugar em analytics real
      console.log(`[covers] generate intent=${intent} lote=${lote}`)

      // OTIMISMO: mostra skeleton "Gerando" IMEDIATAMENTE (antes do Realtime/fetch)
      setOptimisticPending((prev) => prev + lote)

      try {
        const res = await fetch(`${API_URL}/covers/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ brief, lote, save_as_default: false }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          console.error('Falha ao gerar capa:', body)
        }
      } catch (err) {
        console.error('Erro no fetch /covers/generate:', err)
      } finally {
        // Remove os skeletons fantasma — a essa altura, os reais ja foram
        // criados em cover_library (status='ready' apos o worker terminar)
        setOptimisticPending((prev) => Math.max(0, prev - lote))
        loadData()
      }
    },
    [supabase, loadData],
  )

  const handleGenerate = (lote: 1 | 3, intent: 'new' | 'variation' = 'new') => {
    if (!activeBrief) return
    setConfirmIntent(intent)
    setConfirmLote(lote)
  }

  const confirmGenerateAction = useCallback(() => {
    if (!confirmLote || !activeBrief) return
    const lote = confirmLote
    const intent = confirmIntent
    const briefSnapshot = activeBrief.brief
    setConfirmLote(null)
    void triggerGenerate(briefSnapshot, lote, intent)
  }, [confirmLote, confirmIntent, activeBrief, triggerGenerate])

  // ─────────────────────────────────────────────────────────────────
  // BRIEFS (CRUD)
  // ─────────────────────────────────────────────────────────────────
  const handleOpenWizardNew = () => {
    setWizardEditingId(null)
    setWizardOpen(true)
  }

  const handleOpenWizardEdit = (id: string) => {
    setWizardEditingId(id)
    setWizardOpen(true)
    setManageOpen(false)
  }

  const handleWizardSave = useCallback(
    async (
      data: { name: string; brief: CoverBrief },
      action: 'save_only' | 'save_and_generate',
    ) => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Sessão expirada')

      let savedPreset: BriefPreset
      if (wizardEditingId) {
        // Edit
        savedPreset = await updateBrief(token, wizardEditingId, {
          name: data.name,
          brief: data.brief,
        })
      } else {
        // Create — activate=true por padrao
        savedPreset = await createBrief(token, {
          name: data.name,
          brief: data.brief,
          activate: true,
        })
      }

      // Se acabou de editar um brief NAO-ativo e pediu pra gerar capa com
      // ele, ATIVA esse brief tambem (do contrario o header continua
      // mostrando o anterior como ativo, mesmo que a capa nova use este).
      if (
        action === 'save_and_generate' &&
        wizardEditingId &&
        !savedPreset.is_active
      ) {
        try {
          await activateBrief(token, savedPreset.id)
        } catch (err) {
          console.warn('Falha ao ativar brief apos save_and_generate:', err)
        }
      }

      setWizardOpen(false)
      await loadData()

      if (action === 'save_and_generate') {
        await triggerGenerate(savedPreset.brief, 1)
      }
    },
    [supabase, loadData, triggerGenerate, wizardEditingId],
  )

  const handleSelectBrief = useCallback(
    async (id: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return
      try {
        await activateBrief(token, id)
        await loadData()
      } catch (err) {
        console.error('Falha ao ativar brief:', err)
      }
    },
    [supabase, loadData],
  )

  const handleRenameBrief = useCallback(
    async (id: string, newName: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Sessão expirada')
      await updateBrief(token, id, { name: newName })
      await loadData()
    },
    [supabase, loadData],
  )

  const handleDeleteBrief = useCallback(
    async (id: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Sessão expirada')
      await apiDeleteBrief(token, id)
      await loadData()
    },
    [supabase, loadData],
  )

  // ─────────────────────────────────────────────────────────────────
  // CAPA — handlers
  // ─────────────────────────────────────────────────────────────────
  const handleDownload = async (cover: CoverLibraryItem) => {
    if (!cover.image_url) return
    // Pra forçar download (e não abrir aba), precisa fetch como blob primeiro:
    // o attr `download` em <a> é ignorado pra URLs cross-origin (storage Supabase).
    try {
      const res = await fetch(cover.image_url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `capa-${cover.id.slice(0, 8)}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      // Libera memoria do object URL apos 1s (tempo do browser consumir)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    } catch (err) {
      console.error('Falha ao baixar capa:', err)
      // Fallback: abre em nova aba se CORS bloqueou
      window.open(cover.image_url, '_blank')
    }
  }
  const handleUseInBeat = (cover: CoverLibraryItem) => {
    // Redireciona pro upload com a capa ja selecionada via query param.
    // UploadForm le `?cover_id` e seta selectedCoverId inicial.
    router.push(`/upload?cover_id=${cover.id}`)
  }
  // Click no menu "Descartar" abre o modal de confirmação
  const handleDiscard = useCallback((cover: CoverLibraryItem) => {
    setConfirmDiscard(cover)
  }, [])

  // Click "Confirmar" no modal de descarte: chama o endpoint DELETE
  const confirmDiscardAction = useCallback(async () => {
    if (!confirmDiscard) return
    const cover = confirmDiscard

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      setConfirmDiscard(null)
      return
    }

    setDiscardLoading(true)
    try {
      await deleteCover(token, cover.id)
      await loadData()
      setConfirmDiscard(null)
    } catch (err) {
      console.error('Falha ao deletar capa:', err)
      // Mantem o modal aberto pra user ver erro no console; toast/inline error vem depois
      setConfirmDiscard(null)
    } finally {
      setDiscardLoading(false)
    }
  }, [confirmDiscard, supabase, loadData])

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  const isLoading = state.kind === 'loading'
  const showEmptyNoBrief = state.kind === 'ready' && presets.length === 0
  const isOnboardingFree = !hasGeneratedFirstCover

  const editingPreset = wizardEditingId ? presets.find((p) => p.id === wizardEditingId) ?? null : null

  let pageContent: React.ReactNode
  if (state.kind === 'error') {
    pageContent = <PageError message={state.message} onRetry={loadData} />
  } else if (showEmptyNoBrief) {
    pageContent = <EmptyNoBrief onConfigure={handleOpenWizardNew} />
  } else {
    pageContent = (
      <div className="space-y-10">
        <header className="rise rise-1">
          <SectionLabel num="01" label="Sua biblioteca de capas" />
          <CapasHeader
            presets={presets}
            activeBriefId={activeBrief?.id ?? null}
            credits={credits}
            loading={isLoading}
            onOpenBriefManager={() => setManageOpen(true)}
            onGenerate={handleGenerate}
          />
        </header>

        <section className="rise rise-2">
          <SectionLabel num="02" label="Capas geradas" />
          <CapasGrid
            covers={covers}
            ghostPendingCount={Math.max(
              0,
              optimisticPending - covers.filter((c) => c.status === 'pending').length,
            )}
            loading={isLoading}
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
        editingPresetId={wizardEditingId}
        initialName={editingPreset?.name}
        initialBrief={editingPreset?.brief ?? null}
        isOnboardingFree={isOnboardingFree}
        onClose={() => setWizardOpen(false)}
        onSave={handleWizardSave}
      />

      <ManageBriefsModal
        open={manageOpen}
        presets={presets}
        limit={presetLimit}
        onClose={() => setManageOpen(false)}
        onRename={handleRenameBrief}
        onDelete={handleDeleteBrief}
        onActivate={handleSelectBrief}
        onEditFull={handleOpenWizardEdit}
        onCreate={() => {
          setManageOpen(false)
          handleOpenWizardNew()
        }}
      />

      <ConfirmGenerateModal
        open={confirmLote !== null}
        lote={confirmLote ?? 1}
        remaining={credits?.remaining ?? 0}
        isOnboardingFree={isOnboardingFree}
        loading={false}
        onCancel={() => setConfirmLote(null)}
        onConfirm={confirmGenerateAction}
      />

      <ConfirmDialog
        open={confirmDiscard !== null}
        title="Descartar essa capa?"
        description="A capa será removida da biblioteca e o arquivo apagado. Essa ação não pode ser desfeita."
        confirmLabel="Descartar"
        cancelLabel="Cancelar"
        danger
        loading={discardLoading}
        onCancel={() => !discardLoading && setConfirmDiscard(null)}
        onConfirm={confirmDiscardAction}
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
          Crie seu primeiro<br />
          <span className="text-gradient-brand">brief de estilo</span>.
        </h1>
        <p
          className="mx-auto mt-5 max-w-sm text-[14px] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Dê um nome ao estilo (ex: <em>"Drake noite"</em>), defina os elementos
          visuais, e gere quantas capas quiser com IA. Você pode ter vários
          briefs salvos e trocar entre eles.
        </p>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onConfigure}
            className="btn-primary group"
          >
            <Sparkles size={14} strokeWidth={2.2} />
            Criar meu primeiro brief
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

function BlankCoversArt() {
  return (
    <svg width="380" height="180" viewBox="0 0 380 180" fill="none" aria-hidden>
      <defs>
        <linearGradient id="blank-side" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
        <linearGradient id="blank-hero" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(65,0,255,0.32)" />
          <stop offset="55%" stopColor="rgba(101,51,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,26,190,0.18)" />
        </linearGradient>
        <radialGradient id="blank-hero-glow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(199,181,255,0.30)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="sparkle-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g>
        <rect x="20" y="30" width="110" height="110" rx="8" fill="url(#blank-side)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" strokeDasharray="3 5" />
        <text x="34" y="128" fill="rgba(255,255,255,0.55)" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace" letterSpacing="0.20em">[01]</text>
      </g>

      <g>
        <rect x="130" y="20" width="120" height="120" rx="14" fill="url(#blank-hero-glow)" opacity="0.85">
          <animate attributeName="opacity" values="0.55;1;0.55" dur="3.2s" repeatCount="indefinite" />
        </rect>
        <rect x="140" y="30" width="110" height="110" rx="8" fill="url(#blank-hero)" stroke="rgba(199,181,255,0.55)" strokeWidth="1.2" />
        <g transform="translate(195, 78)" filter="url(#sparkle-glow)">
          <path d="M 0 -12 L 2 -2 L 12 0 L 2 2 L 0 12 L -2 2 L -12 0 L -2 -2 Z" fill="#FFFFFF">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="16s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.85;1;0.85" dur="2.2s" repeatCount="indefinite" />
          </path>
          <circle r="20" fill="none" stroke="rgba(199,181,255,0.55)" strokeWidth="1">
            <animate attributeName="r" values="14;24;14" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.65;0;0.65" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle r="20" fill="none" stroke="rgba(255,80,214,0.45)" strokeWidth="1">
            <animate attributeName="r" values="14;24;14" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.55;0;0.55" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
          </circle>
        </g>
        <text x="154" y="128" fill="rgba(255,255,255,0.92)" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace" letterSpacing="0.20em">[02]</text>
      </g>

      <g>
        <rect x="260" y="30" width="110" height="110" rx="8" fill="url(#blank-side)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" strokeDasharray="3 5" />
        <text x="274" y="128" fill="rgba(255,255,255,0.55)" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace" letterSpacing="0.20em">[03]</text>
      </g>

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
