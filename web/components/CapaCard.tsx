'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Sparkles, MoreHorizontal, Download, Music, Trash2, Image as ImageIcon, AlertCircle, Check } from 'lucide-react'
import type { CoverLibraryItem } from '@/lib/api'

type Props = {
  cover: CoverLibraryItem
  index: number
  onDownload: (cover: CoverLibraryItem) => void
  onUseInBeat: (cover: CoverLibraryItem) => void
  onDiscard: (cover: CoverLibraryItem) => void
  /** Modo selecao multipla: cards viram checkbox-clicaveis. */
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: (cover: CoverLibraryItem) => void
}

/**
 * Card individual da biblioteca. Render diferente por status:
 *  - 'ready':   capa normal com badges + menu
 *  - 'pending': skeleton com pulse roxo (geração rodando — refresh-safe)
 *  - 'failed':  card com indicador de erro + opção descartar
 */
export function CapaCard(props: Props) {
  const { cover } = props

  if (cover.status === 'pending') return <PendingCard index={props.index} />
  if (cover.status === 'failed') return <FailedCard cover={cover} onDiscard={props.onDiscard} index={props.index} />
  return <ReadyCard {...props} />
}

// ─────────────────────────────────────────────────────────────────────
// PENDING — skeleton com pulse roxo
// ─────────────────────────────────────────────────────────────────────
function PendingCard({ index }: { index: number }) {
  const numLabel = String(index + 1).padStart(2, '0')
  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-purple)',
        aspectRatio: '1 / 1',
      }}
    >
      <div className="absolute inset-0 shimmer" style={{ background: 'var(--bg-elevated)' }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(65,0,255,0.18), transparent 60%)',
        }}
      />

      {/* Mini orb central -- versao escalada do orb principal de /beats/[id]
       * pra reforcar identidade visual da plataforma durante a geracao */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[44%] w-[44%] flex items-center justify-center">
          {/* Halo externo roxo */}
          <div
            aria-hidden
            className="absolute inset-0 animate-pulse-slow"
            style={{
              background: 'radial-gradient(circle, rgba(65,0,255,0.55), transparent 62%)',
              filter: 'blur(10px)',
            }}
          />
          {/* Halo magenta deslocado */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 68% 38%, rgba(255,26,190,0.45), transparent 58%)',
              filter: 'blur(14px)',
              animation: 'pulse-slow 3.4s ease-in-out infinite',
              animationDelay: '-1.2s',
            }}
          />
          {/* Anel orbital externo */}
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
          {/* Orb principal pequeno */}
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
            {/* Reflexo branco */}
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
      </div>

      {/* Label "Gerando" destacada (canto superior esquerdo) */}
      <div
        className="absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1"
        style={{
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          border: '1px solid var(--border-purple)',
        }}
      >
        <span className="led led-pulse" style={{ color: 'var(--purple-light)' }} />
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.18em',
            color: '#FFFFFF',
          }}
        >
          Gerando
        </span>
      </div>
      <span
        className="pointer-events-none absolute bottom-2.5 left-3 font-mono tabular"
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.18em',
          color: 'var(--text-subtle)',
        }}
      >
        [{numLabel}]
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// FAILED — card com erro
// ─────────────────────────────────────────────────────────────────────
function FailedCard({
  cover,
  onDiscard,
  index,
}: {
  cover: CoverLibraryItem
  onDiscard: (c: CoverLibraryItem) => void
  index: number
}) {
  const numLabel = String(index + 1).padStart(2, '0')
  return (
    <article
      className="relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-lg p-4 text-center"
      style={{
        background: 'rgba(248,113,113,0.04)',
        border: '1px solid rgba(248,113,113,0.30)',
        aspectRatio: '1 / 1',
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ background: 'rgba(248,113,113,0.10)' }}
      >
        <AlertCircle size={18} strokeWidth={1.8} style={{ color: 'var(--led-error)' }} />
      </div>
      <div>
        <p className="text-[12.5px] font-medium" style={{ color: '#FCA5A5' }}>
          Falha ao gerar
        </p>
        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Sem cobrança
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDiscard(cover)}
        className="rounded-md px-2 py-1 text-[11px] transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        Descartar
      </button>
      <span
        className="pointer-events-none absolute bottom-2.5 left-3 font-mono tabular"
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.18em',
          color: 'var(--text-subtle)',
        }}
      >
        [{numLabel}]
      </span>
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────
// READY — card normal (lógica original)
// ─────────────────────────────────────────────────────────────────────
function ReadyCard({
  cover,
  index,
  onDownload,
  onUseInBeat,
  onDiscard,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleCardClick = () => {
    if (selectionMode && onToggleSelect) onToggleSelect(cover)
  }

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const isAI = cover.source === 'ai_generated'
  const wasUsed = cover.used_in_beats_count > 0
  const numLabel = String(index + 1).padStart(2, '0')

  return (
    <article
      className="group relative overflow-hidden rounded-lg transition-all"
      onClick={selectionMode ? handleCardClick : undefined}
      style={{
        background: 'var(--bg-surface)',
        border: selected
          ? '1.5px solid var(--purple-light)'
          : '1px solid var(--border-subtle)',
        aspectRatio: '1 / 1',
        cursor: selectionMode ? 'pointer' : 'default',
        boxShadow: selected
          ? '0 0 0 3px rgba(199,181,255,0.20), 0 4px 16px rgba(65,0,255,0.15)'
          : 'none',
      }}
    >
      {/* Checkbox de selecao (so visivel em selectionMode) */}
      {selectionMode && (
        <div
          className="absolute right-2.5 top-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-md transition-all"
          style={{
            background: selected
              ? 'var(--purple-light)'
              : 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            border: '1.5px solid',
            borderColor: selected
              ? 'var(--purple-light)'
              : 'rgba(255,255,255,0.35)',
          }}
        >
          {selected && (
            <Check size={14} strokeWidth={3} style={{ color: '#0A0A0C' }} />
          )}
        </div>
      )}

      {/* Overlay sutil quando selecionado (escurece levemente) */}
      {selectionMode && selected && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10"
          style={{ background: 'rgba(65,0,255,0.08)' }}
        />
      )}

      {cover.image_url && (
        <Image
          src={cover.image_url}
          alt={`Capa ${numLabel}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-opacity duration-500"
          style={{ opacity: imageLoaded ? 1 : 0 }}
          onLoadingComplete={() => setImageLoaded(true)}
          unoptimized
        />
      )}

      {!imageLoaded && (
        <div className="absolute inset-0 shimmer" style={{ background: 'var(--bg-elevated)' }} />
      )}

      <span
        className="pointer-events-none absolute bottom-2.5 left-3 font-mono tabular"
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.18em',
          color: 'rgba(255,255,255,0.78)',
          textShadow: '0 1px 4px rgba(0,0,0,0.7)',
        }}
      >
        [{numLabel}]
      </span>

      <div className="absolute left-2.5 top-2.5 z-10">
        {isAI ? (
          <span
            className="inline-flex items-center gap-1 rounded-sm px-1.5 py-1 font-mono uppercase"
            style={{
              fontSize: 9.5,
              fontWeight: 500,
              letterSpacing: '0.12em',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <Sparkles size={9} strokeWidth={2.4} />
            AI
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 rounded-sm px-1.5 py-1 font-mono uppercase"
            style={{
              fontSize: 9.5,
              fontWeight: 500,
              letterSpacing: '0.12em',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
              color: 'var(--text-secondary)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <ImageIcon size={9} strokeWidth={2.4} />
            Upload
          </span>
        )}
      </div>

      {wasUsed && (
        <div className="absolute right-2.5 top-2.5 z-10">
          <span
            className="inline-flex items-center gap-1 rounded-sm px-1.5 py-1 font-mono uppercase"
            style={{
              fontSize: 9.5,
              fontWeight: 500,
              letterSpacing: '0.12em',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
              color: 'var(--led-success)',
              border: '1px solid rgba(52,211,153,0.30)',
            }}
          >
            ✓ Usada
            {cover.used_in_beats_count > 1 && (
              <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                · {cover.used_in_beats_count}
              </span>
            )}
          </span>
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.65) 100%)',
        }}
      />

      {/* Menu "..." escondido em selectionMode pra nao poluir visualmente */}
      <div
        ref={menuRef}
        className={`absolute bottom-2 right-2 z-20 transition-opacity duration-200 ${
          selectionMode
            ? 'pointer-events-none opacity-0'
            : menuOpen
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: 'rgba(255,255,255,0.92)',
          }}
          aria-label="Mais opções"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal size={14} strokeWidth={2.2} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute bottom-full right-0 mb-1.5 min-w-[170px] overflow-hidden rounded-lg"
            style={{
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <MenuItem
              icon={Download}
              label="Baixar capa"
              onClick={() => {
                setMenuOpen(false)
                onDownload(cover)
              }}
            />
            <MenuItem
              icon={Music}
              label="Usar em beat"
              onClick={() => {
                setMenuOpen(false)
                onUseInBeat(cover)
              }}
            />
            <div className="hairline" />
            <MenuItem
              icon={Trash2}
              label="Descartar"
              danger
              onClick={() => {
                setMenuOpen(false)
                onDiscard(cover)
              }}
            />
          </div>
        )}
      </div>

      <div
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          boxShadow: 'var(--glow-hover)',
        }}
      />
    </article>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Download
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
      style={{
        fontSize: 12.5,
        color: danger ? 'var(--led-error)' : 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <Icon size={13} strokeWidth={1.8} />
      <span>{label}</span>
    </button>
  )
}
