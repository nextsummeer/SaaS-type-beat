'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, Upload } from 'lucide-react'
import { DateTimePicker } from '@/components/DateTimePicker'
import { comHora18 } from '@/lib/agenda'
import type { BeatListItem } from '@/lib/api'
import { estadoVisual } from '@/components/BeatCard'

interface QuickScheduleModalProps {
  aberto: boolean
  dataInicial: Date | null
  draftsDisponiveis: BeatListItem[]
  onConfirmar: (beat: BeatListItem, scheduledAt: Date) => Promise<void>
  onFechar: () => void
}

export function QuickScheduleModal(props: QuickScheduleModalProps) {
  if (!props.aberto) return null
  return <QuickScheduleModalContent key={props.dataInicial?.toISOString() ?? 'closed'} {...props} />
}

function QuickScheduleModalContent({
  dataInicial,
  draftsDisponiveis,
  onConfirmar,
  onFechar,
}: QuickScheduleModalProps) {
  const router = useRouter()
  const [beatIdSelecionado, setBeatIdSelecionado] = useState<string | null>(
    () => draftsDisponiveis[0]?.id ?? null,
  )
  const [data, setData] = useState<Date | null>(() =>
    dataInicial ? comHora18(dataInicial) : null,
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function irParaUpload() {
    const dataAlvo = data ?? (dataInicial ? comHora18(dataInicial) : null)
    if (dataAlvo) {
      router.push(`/upload?agendar_em=${encodeURIComponent(dataAlvo.toISOString())}`)
    } else {
      router.push('/upload')
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !salvando) onFechar()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [salvando, onFechar])

  const beat = draftsDisponiveis.find((b) => b.id === beatIdSelecionado) ?? null
  const podeSalvar = beat && data && data > new Date() && !salvando

  async function handleConfirmar() {
    if (!beat || !data) return
    setSalvando(true)
    setErro(null)
    try {
      await onConfirmar(beat, data)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao agendar')
      setSalvando(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !salvando) onFechar()
      }}
    >
      <div
        className="relative w-full max-w-[520px] overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="flex flex-col">
            <span
              className="font-mono uppercase"
              style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--text-subtle)' }}
            >
              Agendar publicação
            </span>
            <h2
              className="font-display"
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                marginTop: 2,
              }}
            >
              {dataInicial
                ? new Intl.DateTimeFormat('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                  }).format(dataInicial)
                : 'Selecionar data'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            className="flex h-8 w-8 items-center justify-center rounded-md transition"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated)'
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.borderColor = 'transparent'
            }}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5" style={{ padding: '20px' }}>
          {draftsDisponiveis.length === 0 ? (
            <div className="flex flex-col items-center gap-4 text-center" style={{ padding: '12px 8px' }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Nenhum rascunho pronto pra agendar nessa data.
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-subtle)', maxWidth: 320 }}>
                Sobe um beat agora — a data {dataInicial
                  ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(dataInicial)
                  : ''}{' '}
                já fica pré-marcada pra publicação.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <label
                  className="font-mono uppercase"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: 'var(--text-muted)',
                  }}
                >
                  Qual beat publicar
                </label>
                <select
                  value={beatIdSelecionado ?? ''}
                  onChange={(e) => setBeatIdSelecionado(e.target.value)}
                  disabled={salvando}
                  className="w-full"
                  style={{
                    appearance: 'none',
                    padding: '10px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  {draftsDisponiveis.map((b) => {
                    const est = estadoVisual(b)
                    return (
                      <option key={b.id} value={b.id}>
                        {b.titulo ?? 'Aguardando IA'}
                        {b.artista_nome ? ` · ${b.artista_nome}` : ''}
                        {' · '}
                        {est.label.toLowerCase()}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  className="font-mono uppercase"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: 'var(--text-muted)',
                  }}
                >
                  Quando publicar
                </label>
                <DateTimePicker
                  value={data}
                  onChange={setData}
                  minDate={new Date()}
                  placeholder="Escolher data e hora"
                />
              </div>

              {/* Nota explicando que programar != publicar */}
              <p
                style={{
                  fontSize: 11.5,
                  color: 'var(--text-subtle)',
                  lineHeight: 1.5,
                  marginTop: -4,
                }}
              >
                Programar só salva a data na agenda. Pra publicar de verdade no
                YouTube, vá em <strong style={{ color: 'var(--text-muted)' }}>revisão</strong>{' '}
                do beat e clique em &ldquo;Confirmar agendamento&rdquo;.
              </p>

              {/* Atalho secundario: subir beat com a data ja pre-marcada */}
              <button
                type="button"
                onClick={irParaUpload}
                disabled={salvando}
                className="flex items-center justify-center gap-2 self-start font-mono uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 2px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                  textDecorationColor: 'var(--border-strong)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <Upload size={11} strokeWidth={2} />
                Subir um beat novo nessa data
              </button>
            </>
          )}

          {erro && (
            <p
              style={{
                padding: '10px 12px',
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.35)',
                borderRadius: 'var(--radius-md)',
                color: '#fca5a5',
                fontSize: 13,
              }}
            >
              {erro}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-2"
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-base)',
          }}
        >
          {draftsDisponiveis.length === 0 ? (
            <>
              <button
                type="button"
                onClick={onFechar}
                disabled={salvando}
                className="btn-ghost"
                style={{ opacity: salvando ? 0.5 : 1 }}
              >
                Fechar
              </button>
              <button type="button" onClick={irParaUpload} className="btn-primary">
                <Upload size={14} strokeWidth={2} />
                Subir um beat
              </button>
            </>
          ) : (
            <>
              <span />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onFechar}
                  disabled={salvando}
                  className="btn-ghost"
                  style={{ opacity: salvando ? 0.5 : 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmar}
                  disabled={!podeSalvar}
                  className="btn-primary"
                  style={{
                    opacity: podeSalvar ? 1 : 0.5,
                    cursor: podeSalvar ? 'pointer' : 'not-allowed',
                  }}
                >
                  {salvando ? <Loader2 size={14} className="animate-spin" /> : null}
                  {salvando ? 'Programando…' : 'Programar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
