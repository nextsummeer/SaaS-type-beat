'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  X,
  Music,
  Trash2,
  Star,
  Download,
  Sparkles,
  ImageIcon as ImageLucide,
  Loader2,
} from 'lucide-react'
import type { CoverLibraryItem } from '@/lib/api'

interface Props {
  open: boolean
  cover: CoverLibraryItem | null
  /** Nome do brief preset que originou a capa (T4.41). Resolvido no caller:
   *  ao vivo enquanto o preset existir, snapshot salvo se foi deletado. */
  briefName?: string | null
  /** Numero da capa no grid (1-based pra display "#01"). */
  index: number | null
  onClose: () => void
  onDownload: (cover: CoverLibraryItem) => void
  onUseInBeat: (cover: CoverLibraryItem) => void
  onDiscard: (cover: CoverLibraryItem) => void
  /** Persiste rating (1-5 ou null pra remover). Optimistic update no caller. */
  onRate: (cover: CoverLibraryItem, rating: number | null) => Promise<void>
}

/**
 * Modal expandido de uma capa. Estilo Editorial Mono BeatPost.
 * Imagem grande a esquerda + painel de info+rating+acoes a direita.
 *
 * UX:
 * - Esc fecha
 * - Click no backdrop fecha (mouseDown+mouseUp trick pra nao fechar com drag)
 * - Click no card a partir de /capas/page abre este modal (em modo normal,
 *   nao selectionMode)
 */
export function CapaModal({
  open,
  cover,
  briefName,
  index,
  onClose,
  onDownload,
  onUseInBeat,
  onDiscard,
  onRate,
}: Props) {
  const mouseDownOnBackdropRef = useRef(false)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [savingRating, setSavingRating] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Reset hover quando trocar de capa ou fechar
  useEffect(() => {
    setHoverRating(null)
  }, [cover?.id, open])

  if (!open || !cover) return null

  const isAI = cover.source === 'ai_generated'
  const wasUsed = cover.used_in_beats_count > 0
  const numLabel = index !== null ? String(index + 1).padStart(2, '0') : '--'
  const brief = cover.brief_used
  const currentRating = cover.rating ?? 0
  const displayedRating = hoverRating ?? currentRating

  async function handleRateClick(value: number) {
    if (!cover || savingRating) return
    // Click na estrela ATUAL remove o rating (toggle off)
    const nextValue: number | null = currentRating === value ? null : value
    setSavingRating(true)
    try {
      await onRate(cover, nextValue)
    } finally {
      setSavingRating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6 sm:px-6 sm:py-10"
      style={{
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(10px)',
      }}
      onMouseDown={(e) => {
        mouseDownOnBackdropRef.current = e.target === e.currentTarget
      }}
      onMouseUp={(e) => {
        if (
          mouseDownOnBackdropRef.current &&
          e.target === e.currentTarget
        ) {
          onClose()
        }
        mouseDownOnBackdropRef.current = false
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Capa ${numLabel}`}
        className="relative grid w-full max-w-5xl overflow-hidden rounded-2xl md:grid-cols-[1fr_minmax(320px,420px)]"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium, var(--border-subtle))',
          boxShadow: 'var(--shadow-lg, 0 24px 64px rgba(0,0,0,0.5))',
          maxHeight: 'calc(100vh - 4rem)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* IMAGEM (left, square) */}
        <div
          className="relative overflow-hidden"
          style={{
            background: 'var(--bg-elevated)',
            aspectRatio: '1 / 1',
            borderRight: '1px solid var(--border-subtle)',
          }}
        >
          {cover.image_url && (
            <Image
              src={cover.image_url}
              alt={`Capa ${numLabel}`}
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-cover"
              unoptimized
            />
          )}

          {/* Numero da capa overlay top-left */}
          <span
            className="pointer-events-none absolute bottom-3 left-3.5 font-mono tabular"
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.20em',
              color: 'rgba(255,255,255,0.85)',
              textShadow: '0 1px 4px rgba(0,0,0,0.7)',
            }}
          >
            [{numLabel}]
          </span>
        </div>

        {/* PAINEL DIREITO -- info + rating + acoes */}
        <div
          className="relative flex flex-col"
          style={{ maxHeight: 'calc(100vh - 4rem)' }}
        >
          {/* Header: badge + close */}
          <header
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              {isAI ? (
                <span
                  className="inline-flex items-center gap-1 rounded-sm px-1.5 py-1 font-mono uppercase"
                  style={{
                    fontSize: 9.5,
                    fontWeight: 500,
                    letterSpacing: '0.16em',
                    background: 'rgba(199,181,255,0.08)',
                    color: 'var(--purple-light)',
                    border: '1px solid var(--border-purple)',
                  }}
                >
                  <Sparkles size={10} strokeWidth={2.2} />
                  AI
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 rounded-sm px-1.5 py-1 font-mono uppercase"
                  style={{
                    fontSize: 9.5,
                    fontWeight: 500,
                    letterSpacing: '0.16em',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <ImageLucide size={10} strokeWidth={2.2} />
                  Manual
                </span>
              )}

              {/* Status badge */}
              <span
                className="inline-flex items-center gap-1 rounded-sm px-1.5 py-1 font-mono uppercase"
                style={{
                  fontSize: 9.5,
                  fontWeight: 500,
                  letterSpacing: '0.16em',
                  background: wasUsed ? 'rgba(74,222,128,0.08)' : 'transparent',
                  color: wasUsed ? 'var(--led-success)' : 'var(--text-muted)',
                  border: wasUsed
                    ? '1px solid rgba(74,222,128,0.30)'
                    : '1px solid var(--border-subtle)',
                }}
              >
                {wasUsed
                  ? `${cover.used_in_beats_count}× usada`
                  : 'Disponível'}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </header>

          {/* SCROLLABLE BODY */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {/* Brief usado */}
            {(brief || briefName) && (
              <section className="mb-6">
                <SectionLabel num="01" label="Brief usado" />
                {briefName && (
                  <p
                    className="mb-3 truncate"
                    style={{
                      color: 'var(--text-primary)',
                      fontSize: 15,
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                    }}
                    title={briefName}
                  >
                    {briefName}
                  </p>
                )}
                {brief && <BriefDetails brief={brief} />}
              </section>
            )}

            {/* Rating */}
            <section className="mb-6">
              <SectionLabel num="02" label="Sua avaliação" />
              <div
                className="flex items-center gap-1.5"
                onMouseLeave={() => setHoverRating(null)}
              >
                {[1, 2, 3, 4, 5].map((value) => {
                  const filled = value <= displayedRating
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={savingRating}
                      onClick={() => handleRateClick(value)}
                      onMouseEnter={() => setHoverRating(value)}
                      aria-label={`${value} ${value === 1 ? 'estrela' : 'estrelas'}`}
                      className="flex h-9 w-9 items-center justify-center rounded-md transition-all disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: filled
                          ? 'rgba(199,181,255,0.06)'
                          : 'transparent',
                      }}
                    >
                      <Star
                        size={18}
                        strokeWidth={1.8}
                        style={{
                          color: filled
                            ? 'var(--purple-light)'
                            : 'var(--text-muted)',
                          fill: filled ? 'var(--purple-light)' : 'transparent',
                          transition: 'all 0.15s',
                        }}
                      />
                    </button>
                  )
                })}
                {savingRating && (
                  <Loader2
                    size={12}
                    className="ml-2 animate-spin"
                    style={{ color: 'var(--text-muted)' }}
                  />
                )}
                {!savingRating && currentRating > 0 && (
                  <span
                    className="ml-2 font-mono uppercase"
                    style={{
                      fontSize: 9.5,
                      letterSpacing: '0.16em',
                      color: 'var(--text-subtle)',
                    }}
                  >
                    · clique de novo pra remover
                  </span>
                )}
              </div>
            </section>

            {/* Meta (data) */}
            <section>
              <SectionLabel num="03" label="Detalhes" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12px]">
                <MetaRow
                  label="Criada em"
                  value={formatDate(cover.created_at)}
                />
                <MetaRow
                  label="Origem"
                  value={isAI ? 'Gerada por IA' : 'Upload manual'}
                />
              </div>
            </section>
          </div>

          {/* FOOTER -- acoes */}
          <footer
            className="flex items-center gap-3 px-5 py-4"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <button
              type="button"
              onClick={() => {
                onClose()
                onUseInBeat(cover)
              }}
              className="btn-primary flex-1"
            >
              <Music size={13} strokeWidth={2.2} />
              Usar em beat
            </button>

            <button
              type="button"
              onClick={() => onDownload(cover)}
              aria-label="Download"
              title="Baixar"
              className="flex h-10 w-10 items-center justify-center rounded-md transition-colors"
              style={{
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <Download size={14} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose()
                onDiscard(cover)
              }}
              aria-label="Descartar"
              title="Descartar"
              className="flex h-10 w-10 items-center justify-center rounded-md transition-colors"
              style={{
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(248,113,113,0.10)'
                e.currentTarget.style.borderColor = 'rgba(248,113,113,0.30)'
                e.currentTarget.style.color = 'var(--led-error)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'var(--border-subtle)'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────

function SectionLabel({ num, label }: { num: string; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span
        className="font-mono"
        style={{
          fontSize: 9.5,
          color: 'var(--text-subtle)',
          letterSpacing: '0.22em',
        }}
      >
        {num}
      </span>
      <span
        className="font-mono uppercase"
        style={{
          fontSize: 10,
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

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <>
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
      <span
        className="truncate"
        style={{
          color: 'var(--text-secondary)',
          fontSize: 12.5,
        }}
      >
        {value}
      </span>
    </>
  )
}

// PT labels enxutos pros slugs do brief v3 (espelha DISPLAY_PT do wizard)
const DISPLAY_PT: Record<string, string> = {
  // Genero
  trap: 'Trap',
  underground_trap: 'Underground',
  drill: 'Drill',
  plug: 'Plug',
  rnb: 'R&B',
  rage: 'Rage',
  boom_bap: 'Boom Bap',
  ambient: 'Ambient',
  jersey_club: 'Jersey Club',
  pop: 'Pop',
  afrobeats: 'Afrobeats',
  // Quem
  homem_solo: 'Homem',
  mulher_solo: 'Mulher',
  casal: 'Casal',
  grupo: 'Grupo',
  sem_pessoa: 'Sem pessoa',
  // Mood
  flexin: 'Flexin',
  dark: 'Dark',
  sad: 'Sad',
  sexy: 'Sexy',
  party: 'Party',
  chill: 'Chill',
  // Luz
  sol_duro_dia: 'Sol duro',
  golden_hour: 'Golden hour',
  noite_natural: 'Noite natural',
  flash_duro: 'Flash duro',
  luz_colorida: 'Luz colorida',
  meia_luz: 'Meia luz',
}

function display(slug: string | null | undefined): string | null {
  if (!slug) return null
  return DISPLAY_PT[slug] ?? slug
}

function BriefDetails({ brief }: { brief: NonNullable<CoverLibraryItem['brief_used']> }) {
  // v3 prefere campos novos; v1 (legacy) usado como fallback
  const generoPri = display(brief.genero_primario)
  const generoSec = display(brief.genero_secundario)
  const artistaPri = brief.artista_primario ?? brief.artista_nome ?? null
  const artistaSec = brief.artista_secundario ?? null
  const mood = display(brief.mood ?? brief.energia)
  const luz = display(brief.atmosfera_luz ?? brief.iluminacao)
  const quem = display(brief.quem_aparece ?? brief.sujeito)
  const nota = brief.nota_livre ?? null

  // Linha 1: identidade (artistas + generos)
  const identidadeTokens: string[] = []
  if (artistaPri) identidadeTokens.push(artistaPri)
  if (artistaSec) identidadeTokens.push(`+ ${artistaSec}`)
  if (generoPri) identidadeTokens.push(generoPri)
  if (generoSec) identidadeTokens.push(`+ ${generoSec}`)

  // Linha 2: visual (quem + mood + luz)
  const visualTokens: string[] = []
  if (quem) visualTokens.push(quem)
  if (mood) visualTokens.push(mood)
  if (luz) visualTokens.push(luz)

  return (
    <div className="space-y-2.5">
      {identidadeTokens.length > 0 && (
        <TokenLine label="Identidade" tokens={identidadeTokens} />
      )}
      {visualTokens.length > 0 && (
        <TokenLine label="Visual" tokens={visualTokens} />
      )}
      {nota && (
        <div className="pt-1">
          <span
            className="block font-mono uppercase"
            style={{
              fontSize: 9.5,
              letterSpacing: '0.18em',
              color: 'var(--text-subtle)',
              marginBottom: 4,
            }}
          >
            Nota livre
          </span>
          <p
            className="text-[12.5px] leading-relaxed"
            style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}
          >
            &ldquo;{nota}&rdquo;
          </p>
        </div>
      )}
      {identidadeTokens.length === 0 && visualTokens.length === 0 && !nota && (
        <p
          className="text-[12px] italic"
          style={{ color: 'var(--text-muted)' }}
        >
          Brief não disponível pra essa capa.
        </p>
      )}
    </div>
  )
}

function TokenLine({ label, tokens }: { label: string; tokens: string[] }) {
  return (
    <div>
      <span
        className="block font-mono uppercase"
        style={{
          fontSize: 9.5,
          letterSpacing: '0.18em',
          color: 'var(--text-subtle)',
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {tokens.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="inline-flex items-center"
            style={{ color: 'var(--text-primary)', fontSize: 13, letterSpacing: '-0.005em' }}
          >
            {t}
            {i < tokens.length - 1 && (
              <span
                aria-hidden
                className="ml-2 mr-0.5"
                style={{ color: 'var(--text-subtle)' }}
              >
                ·
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}
