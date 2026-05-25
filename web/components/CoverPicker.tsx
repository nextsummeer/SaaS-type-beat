'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Image as ImageIcon,
  Library,
  Sparkles,
  Upload,
  AlertCircle,
  Check,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchCovers, type CoverLibraryItem } from '@/lib/api'
import { CoverPickerExpanded } from './CoverPickerExpanded'

type Tab = 'library' | 'manual'

/** Quantas capas mostrar na tab Biblioteca antes do botao "Ver mais"
 * abrir o picker expandido com filtros. */
const LIBRARY_PREVIEW_SIZE = 10

type Props = {
  /** Arquivo de capa manual selecionado (modo manual) */
  manualFile: File | null
  /** ID da capa selecionada da biblioteca (modo library) */
  selectedCoverId: string | null
  /** Setter pra arquivo manual. Setar !== null limpa selectedCoverId. */
  onPickFile: (file: File | null) => void
  /** Setter pra capa da biblioteca. Setar !== null limpa manualFile. */
  onPickLibrary: (coverId: string | null) => void
  /** Desabilita interação enquanto upload está rolando */
  disabled?: boolean
}

/**
 * Picker de capa usado no UploadForm.
 * Tabs:
 *   Biblioteca: capas geradas/manuais já na library do produtor
 *   Manual: upload novo (drag-and-drop ou click)
 *
 * Bloqueio com escape: capa já usada em outro beat aparece com warning.
 * Click oferece "usar mesmo assim" (confirmação inline, sem modal).
 *
 * Quando user troca de tab, a seleção da outra é limpa (mutualmente exclusivas).
 */
export function CoverPicker({
  manualFile,
  selectedCoverId,
  onPickFile,
  onPickLibrary,
  disabled = false,
}: Props) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Default sempre 'library' -- cliente ja viu as capas que gerou em /capas,
  // a aba de upload deve abrir mostrando essa biblioteca por padrao. Antes
  // defaultava pra 'manual' quando nao havia selectedCoverId, escondendo
  // as capas do cliente.
  const [tab, setTab] = useState<Tab>('library')
  const [library, setLibrary] = useState<CoverLibraryItem[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(true)
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  // Capa "usada" que está em modo "confirmar usar de novo"
  const [confirmReuseId, setConfirmReuseId] = useState<string | null>(null)
  // Modal expansivel pra ver TODA a biblioteca com filtros
  const [showExpanded, setShowExpanded] = useState(false)

  // Carrega a biblioteca ao montar
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) {
          if (!cancelled) {
            setLibraryError('Sessão expirada')
            setLoadingLibrary(false)
          }
          return
        }
        const items = await fetchCovers(token)
        if (cancelled) return

        // Picker so mostra capas que ja tem image_url (ready ou capas legacy
        // anteriores a migration 016 que nao tem campo status preenchido
        // mas tem image_url). NAO filtra estritamente por status='ready'
        // porque capas legacy podem nao ter status setado.
        const readyOnly = items.filter((it) => !!it.image_url && it.status !== 'pending' && it.status !== 'failed')
        if (process.env.NODE_ENV === 'development') {
          console.log('[CoverPicker] biblioteca carregada:', {
            total: items.length,
            ready: readyOnly.length,
            statuses: items.map((it) => it.status),
          })
        }
        setLibrary(readyOnly)
        setLoadingLibrary(false)
      } catch (err) {
        if (!cancelled) {
          console.error('[CoverPicker] erro fetchCovers:', err)
          setLibraryError(err instanceof Error ? err.message : 'Erro ao carregar biblioteca')
          setLoadingLibrary(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // supabase client e estavel — nao incluir nas deps pra evitar re-fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function exibirAviso(msg: string) {
    setAviso(msg)
    setTimeout(() => setAviso(null), 3500)
  }

  function handleTabChange(novaTab: Tab) {
    if (disabled) return
    setTab(novaTab)
    setConfirmReuseId(null)
    // Limpa seleção da outra tab pra evitar confusão
    if (novaTab === 'library') onPickFile(null)
    if (novaTab === 'manual') onPickLibrary(null)
  }

  function handleFile(file: File | null) {
    if (!file) {
      onPickFile(null)
      return
    }
    const ehImg =
      file.type === 'image/jpeg' ||
      file.type === 'image/png' ||
      /\.(jpe?g|png)$/i.test(file.name)
    if (!ehImg) {
      exibirAviso('Capa precisa ser JPG ou PNG.')
      return
    }
    onPickLibrary(null)
    onPickFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handlePickLibraryCover(cover: CoverLibraryItem) {
    if (disabled) return

    // Toggle: se ja selecionada, deseleciona ao clicar de novo
    if (selectedCoverId === cover.id) {
      onPickLibrary(null)
      setConfirmReuseId(null)
      return
    }

    // Bloqueio com escape: capa usada exige confirmação
    if (cover.used_in_beats_count > 0 && confirmReuseId !== cover.id) {
      setConfirmReuseId(cover.id)
      return
    }

    setConfirmReuseId(null)
    onPickFile(null)
    onPickLibrary(cover.id)
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div
        className="inline-flex items-center gap-0.5 rounded-lg p-0.5"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <TabButton
          active={tab === 'library'}
          icon={Library}
          label="Biblioteca"
          disabled={disabled}
          onClick={() => handleTabChange('library')}
        />
        <TabButton
          active={tab === 'manual'}
          icon={Upload}
          label="Manual"
          disabled={disabled}
          onClick={() => handleTabChange('manual')}
        />
      </div>

      {/* Conteudo da tab ativa */}
      {tab === 'library' ? (
        <LibraryTab
          library={library}
          loading={loadingLibrary}
          error={libraryError}
          selectedCoverId={selectedCoverId}
          confirmReuseId={confirmReuseId}
          disabled={disabled}
          onPick={handlePickLibraryCover}
          onCancelConfirm={() => setConfirmReuseId(null)}
          onSeeMore={() => setShowExpanded(true)}
        />
      ) : (
        <ManualTab
          file={manualFile}
          dragOver={dragOver}
          disabled={disabled}
          onPickClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled) setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {/* Aviso transitório (mesmo padrão do UploadForm) */}
      {aviso && (
        <div
          className="rise flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px]"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            color: '#FCD34D',
          }}
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {aviso}
        </div>
      )}

      {/* Modal expansivel com TODAS as capas + filtros (artista/status/
        * rating/data). Aberto via botao "Ver mais" do LibraryTab. */}
      <CoverPickerExpanded
        open={showExpanded}
        covers={library}
        selectedCoverId={selectedCoverId}
        onSelect={(cover) => handlePickLibraryCover(cover)}
        onClose={() => setShowExpanded(false)}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Tab button
// ─────────────────────────────────────────────────────────────────────
function TabButton({
  active,
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  active: boolean
  icon: typeof Library
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        fontSize: 12.5,
        fontWeight: 500,
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) e.currentTarget.style.color = 'var(--text-secondary)'
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) e.currentTarget.style.color = 'var(--text-muted)'
      }}
    >
      <Icon size={13} strokeWidth={active ? 2 : 1.7} />
      {label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Library tab
// ─────────────────────────────────────────────────────────────────────
function LibraryTab({
  library,
  loading,
  error,
  selectedCoverId,
  confirmReuseId,
  disabled,
  onPick,
  onCancelConfirm,
  onSeeMore,
}: {
  library: CoverLibraryItem[]
  loading: boolean
  error: string | null
  selectedCoverId: string | null
  confirmReuseId: string | null
  disabled: boolean
  onPick: (cover: CoverLibraryItem) => void
  onCancelConfirm: () => void
  onSeeMore: () => void
}) {
  if (loading) {
    return (
      <div
        className="flex items-center justify-center rounded-xl px-6 py-10"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-3 text-[13px]"
        style={{
          background: 'rgba(248,113,113,0.06)',
          border: '1px solid rgba(248,113,113,0.20)',
          color: '#FCA5A5',
        }}
      >
        <AlertCircle size={14} />
        {error}
      </div>
    )
  }

  if (library.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl px-6 py-8 text-center"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <Sparkles size={20} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
        <div>
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
            Você ainda não tem capas na biblioteca
          </p>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Gere capas com IA na aba dedicada.
          </p>
        </div>
        <Link
          href="/capas"
          className="btn-ghost"
          style={{ fontSize: 12, padding: '6px 12px' }}
        >
          <Sparkles size={12} strokeWidth={2.2} />
          Ir pra Capas
        </Link>
      </div>
    )
  }

  // Mostra preview limitado pra nao poluir o /upload (era o gargalo --
  // dezenas de capas pequenas viravam parede ilegivel). Quando ha mais
  // que LIBRARY_PREVIEW_SIZE, botao "Ver mais" abre o modal expansivel
  // com filtros (artista/status/rating/data).
  const previewLibrary = library.slice(0, LIBRARY_PREVIEW_SIZE)
  const hasMore = library.length > LIBRARY_PREVIEW_SIZE

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {previewLibrary.map((cover) => {
          const selected = selectedCoverId === cover.id
          const used = cover.used_in_beats_count > 0
          const confirming = confirmReuseId === cover.id
          return (
            <LibraryCoverThumb
              key={cover.id}
              cover={cover}
              selected={selected}
              used={used}
              confirming={confirming}
              disabled={disabled}
              onClick={() => onPick(cover)}
              onCancelConfirm={onCancelConfirm}
            />
          )
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={onSeeMore}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-md px-3.5 py-2 font-mono uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              fontSize: 10.5,
              letterSpacing: '0.20em',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium, var(--border-subtle))',
              background: 'rgba(255,255,255,0.03)',
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.background = 'rgba(199,181,255,0.06)'
                e.currentTarget.style.borderColor = 'var(--border-purple)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              e.currentTarget.style.borderColor =
                'var(--border-medium, var(--border-subtle))'
            }}
          >
            Ver todas
            <span
              className="tabular"
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                letterSpacing: '0.10em',
              }}
            >
              · {library.length}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

function LibraryCoverThumb({
  cover,
  selected,
  used,
  confirming,
  disabled,
  onClick,
  onCancelConfirm,
}: {
  cover: CoverLibraryItem
  selected: boolean
  used: boolean
  confirming: boolean
  disabled: boolean
  onClick: () => void
  onCancelConfirm: () => void
}) {
  const isAI = cover.source === 'ai_generated'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        className="group/thumb relative block w-full overflow-hidden rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          aspectRatio: '1 / 1',
          background: 'var(--bg-surface)',
          border: selected
            ? '1px solid var(--border-purple)'
            : confirming
            ? '1px solid var(--led-warning)'
            : '1px solid var(--border-subtle)',
          boxShadow: selected ? 'var(--shadow-glow-purple)' : 'none',
        }}
      >
        <Image
          src={cover.image_url as string}
          alt="Capa da biblioteca"
          fill
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover"
          style={{ opacity: used && !selected ? 0.55 : 1 }}
          unoptimized
        />

        {/* Badge AI top-left */}
        {isAI && (
          <span
            className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5"
            style={{
              fontSize: 8.5,
              fontWeight: 500,
              letterSpacing: '0.10em',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              color: '#FFFFFF',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={7} strokeWidth={2.4} />
            AI
          </span>
        )}

        {/* Badge "Usada" top-right */}
        {used && (
          <span
            className="absolute right-1.5 top-1.5 rounded-sm px-1 py-0.5"
            style={{
              fontSize: 8.5,
              fontWeight: 500,
              letterSpacing: '0.10em',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              color: 'var(--led-warning)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
            }}
          >
            Usada
          </span>
        )}

        {/* Check de selecionado */}
        {selected && (
          <span
            className="absolute right-1.5 bottom-1.5 flex h-5 w-5 items-center justify-center rounded-full"
            style={{
              background: 'var(--purple-light)',
              border: '1.5px solid #FFFFFF',
            }}
          >
            <Check size={11} strokeWidth={3} color="#FFFFFF" />
          </span>
        )}
      </button>

      {/* Confirmação de reuso — popover absoluto sobre o thumb */}
      {confirming && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg p-2 text-center"
          style={{
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(6px)',
            border: '1px solid var(--led-warning)',
          }}
        >
          <p className="text-[10.5px] leading-snug" style={{ color: '#FCD34D' }}>
            Já usada em<br />outro beat
          </p>
          <div className="flex flex-col gap-1 w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClick()
              }}
              className="w-full rounded px-2 py-1 transition"
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: '#FFFFFF',
                background: 'rgba(252,211,77,0.20)',
                border: '1px solid var(--led-warning)',
              }}
            >
              Usar mesmo assim
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCancelConfirm()
              }}
              className="w-full rounded px-2 py-1 transition"
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Manual tab
// ─────────────────────────────────────────────────────────────────────
function ManualTab({
  file,
  dragOver,
  disabled,
  onPickClick,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  file: File | null
  dragOver: boolean
  disabled: boolean
  onPickClick: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
}) {
  return (
    <button
      type="button"
      onClick={onPickClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      disabled={disabled}
      className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-5 text-center transition-all disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        borderColor: dragOver
          ? '#FFFFFF'
          : file
          ? 'var(--border-strong)'
          : 'var(--border-medium)',
        background: dragOver
          ? 'rgba(255,255,255,0.04)'
          : file
          ? 'var(--bg-surface)'
          : 'var(--bg-base)',
      }}
    >
      {dragOver ? (
        <>
          <span
            className="led led-pulse"
            style={{ color: '#FFFFFF', width: 8, height: 8 }}
          />
          <p
            className="font-mono uppercase"
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.18em',
              color: 'var(--text-primary)',
            }}
          >
            Solte a capa aqui
          </p>
        </>
      ) : file ? (
        <>
          <ImageIcon className="h-6 w-6" style={{ color: 'var(--text-primary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
        </>
      ) : (
        <>
          <ImageIcon className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Arraste ou{' '}
            <span
              style={{
                color: 'var(--text-primary)',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
            >
              clique para adicionar
            </span>{' '}
            (JPG ou PNG)
          </p>
        </>
      )}
    </button>
  )
}
