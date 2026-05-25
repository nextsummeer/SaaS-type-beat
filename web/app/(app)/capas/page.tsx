'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Sparkles, Upload as UploadIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchCovers,
  fetchCoverCredits,
  fetchManualLimit,
  deleteCover,
  fetchBriefs,
  createBrief,
  updateBrief,
  deleteBrief as apiDeleteBrief,
  activateBrief,
  rateCover,
  type CoverLibraryItem,
  type CoverCreditsState,
  type CoverBrief,
  type BriefPreset,
  type ManualLimitState,
} from '@/lib/api'
import { CapasHeader } from '@/components/CapasHeader'
import { CapasGrid } from '@/components/CapasGrid'
import { CapasWizard } from '@/components/CapasWizard'
import { CapaModal } from '@/components/CapaModal'
import {
  CoverFilterBar,
  EMPTY_COVER_FILTERS,
  applyCoverFilters,
  type CoverFilters,
} from '@/components/CoverFilterBar'
import { ConfirmGenerateModal } from '@/components/ConfirmGenerateModal'
import { ManageBriefsModal } from '@/components/ManageBriefsModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ManualUploadModal } from '@/components/ManualUploadModal'

/** T4.35 — segmented switch principal: dois espacos independentes
 *  dentro de /capas. */
type CoverSpace = 'geradas' | 'enviadas'

/** Filtro simples das capas manuais (substitui CoverFilterBar -- manuais
 *  nao tem artista/rating, so usada e data) */
type ManualUsageFilter = 'all' | 'used' | 'unused'
type ManualDateOrder = 'recent' | 'oldest'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

/** Quantas capas o grid principal mostra antes do botao "Ver mais"
 * abrir a biblioteca fullscreen com filtros. */
const GRID_PAGE_SIZE = 12

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
  const [manualLimit, setManualLimit] = useState<ManualLimitState | null>(null)
  const [presets, setPresets] = useState<BriefPreset[]>([])
  const [presetLimit, setPresetLimit] = useState<number>(1)
  const [hasGeneratedFirstCover, setHasGeneratedFirstCover] = useState<boolean>(false)

  /** Espaco ativo: capas IA (geradas) ou capas manuais (enviadas) */
  const [space, setSpace] = useState<CoverSpace>('geradas')
  /** Modal de upload manual aberto */
  const [manualUploadOpen, setManualUploadOpen] = useState(false)
  /** Filtros das capas manuais */
  const [manualUsageFilter, setManualUsageFilter] = useState<ManualUsageFilter>('all')
  const [manualDateOrder, setManualDateOrder] = useState<ManualDateOrder>('recent')

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
  /** Modo de selecao multipla: cards viram checkbox-clicaveis e toolbar
   * footer aparece com acao "Apagar selecionadas". */
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  /** Modal expandido aberto ao clicar numa capa (em modo normal). */
  const [expandedCover, setExpandedCover] = useState<CoverLibraryItem | null>(null)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  /** Filtros aplicados sobre a biblioteca (artista/status/rating/data). */
  const [filters, setFilters] = useState<CoverFilters>(EMPTY_COVER_FILTERS)
  /** Pagincao "Carregar mais" -- quantas capas visiveis no grid. */
  const [visibleCount, setVisibleCount] = useState(GRID_PAGE_SIZE)
  /**
   * Skeletons "fantasma" que aparecem instantaneamente ao clicar Gerar,
   * antes do INSERT pending real chegar via Realtime. Some assim que o
   * primeiro real pending aparece (ou após N segundos como fallback).
   */
  const [optimisticPending, setOptimisticPending] = useState(0)

  const activeBrief = presets.find((p) => p.is_active) ?? null

  // ─────────────────────────────────────────────────────────────────
  // CAPAS — separadas por source (geradas IA vs enviadas manuais)
  // T4.35: dois espacos independentes via segmented switch
  // ─────────────────────────────────────────────────────────────────

  // GERADAS (capas IA): pendentes/failed ficam topo, ready filtradas + paginadas
  const generatedCovers = covers.filter((c) => c.source === 'ai_generated')
  const readyCovers = generatedCovers.filter((c) => c.status === 'ready')
  const pendingFailedCovers = generatedCovers.filter((c) => c.status !== 'ready')
  const filteredReady = applyCoverFilters(readyCovers, filters)
  const visibleReady = filteredReady.slice(0, visibleCount)
  const visibleCovers = [...pendingFailedCovers, ...visibleReady]
  const hasMoreReady = visibleReady.length < filteredReady.length

  // ENVIADAS (manuais): nao tem pending (upload e sincrono). Filtro simples:
  // Usada/Nao usada + ordenacao Data (recentes/antigas).
  const manualCovers = covers.filter((c) => c.source === 'manual_upload')
  const filteredManual = manualCovers
    .filter((c) => {
      if (manualUsageFilter === 'used') return c.used_in_beats_count > 0
      if (manualUsageFilter === 'unused') return c.used_in_beats_count === 0
      return true
    })
    .sort((a, b) => {
      const aTime = new Date(a.created_at).getTime()
      const bTime = new Date(b.created_at).getTime()
      return manualDateOrder === 'recent' ? bTime - aTime : aTime - bTime
    })

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

      // Em paralelo: créditos IA + biblioteca + briefs + limite manual
      const [creditsRes, coversRes, briefsRes, manualLimitRes] = await Promise.all([
        fetchCoverCredits(token),
        fetchCovers(token),
        fetchBriefs(token),
        fetchManualLimit(token),
      ])
      setCredits(creditsRes)
      setCovers(coversRes)
      setPresets(briefsRes.items)
      setPresetLimit(briefsRes.limit)
      setManualLimit(manualLimitRes)
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
  // SELECAO MULTIPLA / BULK DELETE
  // ─────────────────────────────────────────────────────────────────
  const handleEnterSelectionMode = useCallback(() => {
    setSelectionMode(true)
    setSelectedIds(new Set())
  }, [])

  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

  const handleToggleSelect = useCallback((cover: CoverLibraryItem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(cover.id)) next.delete(cover.id)
      else next.add(cover.id)
      return next
    })
  }, [])

  // ─────────────────────────────────────────────────────────────────
  // MODAL EXPANDIDO (#1)
  // ─────────────────────────────────────────────────────────────────
  const handleOpenExpanded = useCallback(
    (cover: CoverLibraryItem) => {
      // Calcula o indice da capa no array atual pra mostrar [01], [02]...
      const idx = covers.findIndex((c) => c.id === cover.id)
      setExpandedCover(cover)
      setExpandedIndex(idx >= 0 ? idx : null)
    },
    [covers],
  )

  const handleCloseExpanded = useCallback(() => {
    setExpandedCover(null)
    setExpandedIndex(null)
  }, [])

  // Mantem o modal sincronizado se covers refresh (ex: rating salvou e
  // loadData rodou). Reusa a referencia atualizada da capa.
  useEffect(() => {
    if (!expandedCover) return
    const updated = covers.find((c) => c.id === expandedCover.id)
    if (updated && updated !== expandedCover) {
      setExpandedCover(updated)
    }
  }, [covers, expandedCover])

  const handleRate = useCallback(
    async (cover: CoverLibraryItem, rating: number | null) => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return
      // Optimistic: atualiza state local antes de aguardar API
      setCovers((prev) =>
        prev.map((c) => (c.id === cover.id ? { ...c, rating } : c)),
      )
      try {
        await rateCover(token, cover.id, rating)
      } catch (err) {
        console.error('Falha ao salvar rating:', err)
        // Reverte se falhou
        await loadData()
      }
    },
    [supabase, loadData],
  )

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (selectedIds.size === 0) return
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      setConfirmBulkDelete(false)
      return
    }
    setBulkDeleteLoading(true)
    try {
      // Deletes em paralelo. Se uma falhar, as outras continuam.
      await Promise.allSettled(
        Array.from(selectedIds).map((id) => deleteCover(token, id)),
      )
      await loadData()
      setSelectionMode(false)
      setSelectedIds(new Set())
      setConfirmBulkDelete(false)
    } catch (err) {
      console.error('Falha em bulk delete:', err)
      setConfirmBulkDelete(false)
    } finally {
      setBulkDeleteLoading(false)
    }
  }, [selectedIds, supabase, loadData])

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  const isLoading = state.kind === 'loading'
  const isOnboardingFree = !hasGeneratedFirstCover

  // Empty "sem brief" so se aplica ao espaco GERADAS (manuais nao tem brief)
  const showGeradasEmpty = state.kind === 'ready' && space === 'geradas' && presets.length === 0

  const editingPreset = wizardEditingId ? presets.find((p) => p.id === wizardEditingId) ?? null : null

  let pageContent: React.ReactNode
  if (state.kind === 'error') {
    pageContent = <PageError message={state.message} onRetry={loadData} />
  } else {
    pageContent = (
      <div className="space-y-10">
        {/* T4.35 — Segmented switch principal: GERADAS / ENVIADAS */}
        <SpaceSwitch
          space={space}
          onChange={(next) => {
            setSpace(next)
            // Sai do modo selecao ao trocar de espaco pra evitar
            // confusao entre ids selecionados em listas diferentes.
            if (selectionMode) handleCancelSelection()
          }}
          generatedCount={generatedCovers.length}
          manualUsed={manualLimit?.used ?? manualCovers.length}
          manualLimit={manualLimit?.limit ?? 0}
        />

        {showGeradasEmpty && (
          <EmptyNoBrief onConfigure={handleOpenWizardNew} />
        )}

        {space === 'geradas' && !showGeradasEmpty && (
          <>
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
          <SectionLabel
            num="02"
            label="Capas geradas"
            action={
              covers.filter((c) => c.status === 'ready').length > 0 ? (
                <button
                  type="button"
                  onClick={
                    selectionMode ? handleCancelSelection : handleEnterSelectionMode
                  }
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono uppercase transition-colors"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: '0.18em',
                    color: selectionMode
                      ? 'var(--text-primary)'
                      : 'var(--text-primary)',
                    border: '1px solid',
                    borderColor: selectionMode
                      ? 'var(--border-purple)'
                      : 'var(--border-medium, var(--border-subtle))',
                    background: selectionMode
                      ? 'rgba(199,181,255,0.08)'
                      : 'rgba(255,255,255,0.03)',
                  }}
                  onMouseEnter={(e) => {
                    if (!selectionMode) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                      e.currentTarget.style.borderColor = 'var(--border-purple)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectionMode) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                      e.currentTarget.style.borderColor = 'var(--border-medium, var(--border-subtle))'
                    }
                  }}
                >
                  {selectionMode ? 'Cancelar' : 'Selecionar'}
                </button>
              ) : null
            }
          />
          {/* Filtros inline (artista/status/rating/data) -- so aparecem
            * quando ha >= 2 capas ready (sem 1 capa nao tem o que filtrar). */}
          {readyCovers.length >= 2 && (
            <div className="mb-5">
              <CoverFilterBar
                covers={readyCovers}
                filters={filters}
                onChange={(next) => {
                  setFilters(next)
                  // Reseta paginacao quando filtro muda
                  setVisibleCount(GRID_PAGE_SIZE)
                }}
              />
            </div>
          )}

          <CapasGrid
            covers={visibleCovers}
            ghostPendingCount={Math.max(
              0,
              optimisticPending - covers.filter((c) => c.status === 'pending').length,
            )}
            loading={isLoading}
            onDownload={handleDownload}
            onUseInBeat={handleUseInBeat}
            onDiscard={handleDiscard}
            onExpand={handleOpenExpanded}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />

          {/* Pagincao "Carregar mais N" -- so aparece se tem mais ready
            * filtradas alem das ja visiveis. */}
          {hasMoreReady && (
            <div className="mt-7 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + GRID_PAGE_SIZE)}
                className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 font-mono uppercase transition-colors"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.20em',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-medium, var(--border-subtle))',
                  background: 'rgba(255,255,255,0.03)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(199,181,255,0.06)'
                  e.currentTarget.style.borderColor = 'var(--border-purple)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.borderColor =
                    'var(--border-medium, var(--border-subtle))'
                }}
              >
                Carregar mais
                <span
                  className="tabular"
                  style={{
                    fontSize: 10.5,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.10em',
                  }}
                >
                  · +{Math.min(GRID_PAGE_SIZE, filteredReady.length - visibleReady.length)}
                </span>
              </button>
            </div>
          )}
        </section>
          </>
        )}

        {space === 'enviadas' && (
          <section className="rise rise-2">
            <SectionLabel
              num="01"
              label="Banco de capas enviadas"
              action={
                <div className="flex items-center gap-2">
                  {manualLimit && (
                    <span
                      className="font-mono tabular hidden sm:inline-flex items-center"
                      style={{
                        fontSize: 10.5,
                        color: 'var(--text-muted)',
                        letterSpacing: '0.16em',
                      }}
                    >
                      {manualLimit.used}/{manualLimit.limit}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setManualUploadOpen(true)}
                    disabled={
                      !!manualLimit && manualLimit.remaining <= 0
                    }
                    className="btn-primary"
                    title={
                      manualLimit && manualLimit.remaining <= 0
                        ? `Limite atingido (${manualLimit.used}/${manualLimit.limit})`
                        : undefined
                    }
                  >
                    <UploadIcon size={13} strokeWidth={2.2} />
                    Upload manual
                  </button>
                </div>
              }
            />

            {manualCovers.length === 0 ? (
              <EmptyManuais
                limit={manualLimit?.limit ?? 0}
                onUpload={() => setManualUploadOpen(true)}
              />
            ) : (
              <>
                {/* Filtros simples: Usada/Nao usada + Data */}
                <ManualFilterBar
                  totalCount={manualCovers.length}
                  filteredCount={filteredManual.length}
                  usageFilter={manualUsageFilter}
                  dateOrder={manualDateOrder}
                  onUsageChange={setManualUsageFilter}
                  onDateOrderChange={setManualDateOrder}
                />

                <CapasGrid
                  covers={filteredManual}
                  ghostPendingCount={0}
                  loading={isLoading}
                  onDownload={handleDownload}
                  onUseInBeat={handleUseInBeat}
                  onDiscard={handleDiscard}
                  onExpand={handleOpenExpanded}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
              </>
            )}
          </section>
        )}
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

      <CapaModal
        open={expandedCover !== null}
        cover={expandedCover}
        index={expandedIndex}
        onClose={handleCloseExpanded}
        onDownload={handleDownload}
        onUseInBeat={handleUseInBeat}
        onDiscard={handleDiscard}
        onRate={handleRate}
      />

      <ManualUploadModal
        open={manualUploadOpen}
        limit={manualLimit}
        onClose={() => setManualUploadOpen(false)}
        onUploaded={() => {
          setManualUploadOpen(false)
          loadData()
        }}
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

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Apagar ${selectedIds.size} ${selectedIds.size === 1 ? 'capa' : 'capas'}?`}
        description="As capas selecionadas serão removidas da biblioteca e os arquivos apagados. Essa ação não pode ser desfeita."
        confirmLabel={`Apagar ${selectedIds.size}`}
        cancelLabel="Cancelar"
        danger
        loading={bulkDeleteLoading}
        onCancel={() => !bulkDeleteLoading && setConfirmBulkDelete(false)}
        onConfirm={handleBulkDeleteConfirm}
      />

      {/* Toolbar floating do modo selecao -- aparece quando ha capas selecionadas.
       * z-[75] acima do CoverPickerExpanded (z-70) e abaixo do CapaModal (z-80) */}
      {selectionMode && selectedIds.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 z-[75] flex -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-3 rise"
          style={{
            background: 'rgba(15,15,17,0.95)',
            backdropFilter: 'blur(14px)',
            border: '1px solid var(--border-purple)',
            boxShadow: '0 12px 40px rgba(65,0,255,0.20), 0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10.5,
              letterSpacing: '0.22em',
              color: 'var(--text-secondary)',
            }}
          >
            {selectedIds.size} {selectedIds.size === 1 ? 'selecionada' : 'selecionadas'}
          </span>
          <span aria-hidden style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
          <button
            type="button"
            onClick={() => setConfirmBulkDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors"
            style={{
              color: 'var(--led-error)',
              background: 'rgba(248,113,113,0.10)',
              border: '1px solid rgba(248,113,113,0.30)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.10)')}
          >
            Apagar {selectedIds.size}
          </button>
          <button
            type="button"
            onClick={handleCancelSelection}
            className="rounded-md px-2 py-1.5 text-[12px] transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Cancelar
          </button>
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Sub-componentes locais
// ─────────────────────────────────────────────────────────────────────

function SectionLabel({
  num,
  label,
  action,
}: {
  num: string
  label: string
  action?: React.ReactNode
}) {
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
      {action}
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

// ─────────────────────────────────────────────────────────────────────
// T4.35 — Sub-componentes do segmented switch e do espaco "Enviadas"
// ─────────────────────────────────────────────────────────────────────

function SpaceSwitch({
  space,
  onChange,
  generatedCount,
  manualUsed,
  manualLimit,
}: {
  space: CoverSpace
  onChange: (next: CoverSpace) => void
  generatedCount: number
  manualUsed: number
  manualLimit: number
}) {
  return (
    <div
      className="rise rise-1 inline-flex w-full items-stretch overflow-hidden rounded-xl sm:w-auto"
      role="tablist"
      aria-label="Tipo de capa"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        padding: 4,
      }}
    >
      <SpaceTab
        active={space === 'geradas'}
        onClick={() => onChange('geradas')}
        label="Geradas"
        sub="capas por IA"
        count={generatedCount}
      />
      <SpaceTab
        active={space === 'enviadas'}
        onClick={() => onChange('enviadas')}
        label="Enviadas"
        sub="banco manual"
        count={manualUsed}
        max={manualLimit}
      />
    </div>
  )
}

function SpaceTab({
  active,
  onClick,
  label,
  sub,
  count,
  max,
}: {
  active: boolean
  onClick: () => void
  label: string
  sub: string
  count: number
  max?: number
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex flex-1 flex-col items-start gap-0.5 rounded-lg px-5 py-3 text-left transition-all"
      style={{
        background: active ? 'rgba(199,181,255,0.08)' : 'transparent',
        border: active
          ? '1px solid var(--border-purple)'
          : '1px solid transparent',
        minWidth: 180,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent'
      }}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <span
          className="font-display"
          style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '-0.012em',
            color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          {label}
        </span>
        <span
          className="font-mono tabular"
          style={{
            fontSize: 10.5,
            color: active ? 'var(--purple-light)' : 'var(--text-subtle)',
            letterSpacing: '0.12em',
          }}
        >
          {max !== undefined && max > 0 ? `${count}/${max}` : count}
        </span>
      </div>
      <span
        className="font-mono uppercase"
        style={{
          fontSize: 9.5,
          letterSpacing: '0.20em',
          color: active ? 'var(--text-muted)' : 'var(--text-subtle)',
        }}
      >
        {sub}
      </span>
    </button>
  )
}

function ManualFilterBar({
  totalCount,
  filteredCount,
  usageFilter,
  dateOrder,
  onUsageChange,
  onDateOrderChange,
}: {
  totalCount: number
  filteredCount: number
  usageFilter: ManualUsageFilter
  dateOrder: ManualDateOrder
  onUsageChange: (next: ManualUsageFilter) => void
  onDateOrderChange: (next: ManualDateOrder) => void
}) {
  const showCount = filteredCount !== totalCount
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <FilterDropdown
        label="Status"
        value={usageFilter}
        options={[
          { value: 'all', label: 'Todas' },
          { value: 'unused', label: 'Não usadas' },
          { value: 'used', label: 'Já usadas' },
        ]}
        onChange={(v) => onUsageChange(v as ManualUsageFilter)}
      />
      <FilterDropdown
        label="Data"
        value={dateOrder}
        options={[
          { value: 'recent', label: 'Mais recentes' },
          { value: 'oldest', label: 'Mais antigas' },
        ]}
        onChange={(v) => onDateOrderChange(v as ManualDateOrder)}
      />
      {showCount && (
        <span
          className="ml-1 font-mono tabular"
          style={{
            fontSize: 10.5,
            color: 'var(--text-muted)',
            letterSpacing: '0.12em',
          }}
        >
          {filteredCount} de {totalCount}
        </span>
      )}
    </div>
  )
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label
      className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <span
        className="font-mono uppercase"
        style={{
          fontSize: 9.5,
          letterSpacing: '0.18em',
          color: 'var(--text-subtle)',
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none"
        style={{
          fontSize: 12,
          color: 'var(--text-primary)',
          fontWeight: 500,
        }}
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function EmptyManuais({
  limit,
  onUpload,
}: {
  limit: number
  onUpload: () => void
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-xl px-6 py-16 text-center"
      style={{
        background: 'var(--bg-surface)',
        border: '1px dashed var(--border-medium)',
      }}
    >
      <UploadIcon size={28} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
      <div>
        <p
          className="font-display"
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.012em',
          }}
        >
          Seu banco de capas está vazio
        </p>
        <p
          className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          Suba suas próprias capas pra reusar em vários beats. O upload corta
          automaticamente em quadrado.
          {limit > 0 && (
            <> Seu plano permite até <strong>{limit}</strong> capas no banco.</>
          )}
        </p>
      </div>
      <button type="button" onClick={onUpload} className="btn-primary">
        <UploadIcon size={13} strokeWidth={2.2} />
        Subir minha primeira capa
      </button>
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
