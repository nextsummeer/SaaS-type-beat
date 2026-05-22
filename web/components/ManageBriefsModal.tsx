'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Pencil, Trash2, X, Check, AlertCircle, Plus, Sparkles } from 'lucide-react'
import type { BriefPreset } from '@/lib/api'

type Props = {
  open: boolean
  presets: BriefPreset[]
  limit: number  // -1 = ilimitado
  onClose: () => void
  onRename: (id: string, newName: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onActivate: (id: string) => Promise<void>
  onEditFull: (id: string) => void  // abre wizard pra editar conteúdo completo
  onCreate: () => void
}

/**
 * Modal "Gerenciar briefs". Lista todos os presets com:
 *   - Renomear inline (click no nome)
 *   - Ativar (radio)
 *   - Editar (lapis — abre wizard)
 *   - Deletar (lixeira — confirmação inline)
 * + Botão "+ Novo brief" no rodapé (respeita limite).
 */
export function ManageBriefsModal({
  open,
  presets,
  limit,
  onClose,
  onRename,
  onDelete,
  onActivate,
  onEditFull,
  onCreate,
}: Props) {
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [savingNameId, setSavingNameId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const mouseDownOnBackdropRef = useRef(false)

  useEffect(() => {
    if (!open) {
      setEditingNameId(null)
      setConfirmDeleteId(null)
      setErrorMsg(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const limitLabel = limit === -1 ? '∞' : limit
  const reachedLimit = limit !== -1 && presets.length >= limit

  async function startRename(p: BriefPreset) {
    setEditingNameId(p.id)
    setDraftName(p.name)
    setErrorMsg(null)
  }

  async function confirmRename() {
    if (!editingNameId) return
    const next = draftName.trim()
    if (!next) {
      setErrorMsg('Nome não pode ser vazio')
      return
    }
    setSavingNameId(editingNameId)
    try {
      await onRename(editingNameId, next)
      setEditingNameId(null)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao renomear')
    } finally {
      setSavingNameId(null)
    }
  }

  async function handleActivate(id: string) {
    if (id === activatingId) return
    setActivatingId(id)
    setErrorMsg(null)
    try {
      await onActivate(id)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao ativar')
    } finally {
      setActivatingId(null)
    }
  }

  async function handleConfirmDelete(id: string) {
    setDeletingId(id)
    setErrorMsg(null)
    try {
      await onDelete(id)
      setConfirmDeleteId(null)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao deletar')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center px-4 py-8"
      style={{
        background: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(8px)',
      }}
      onMouseDown={(e) => {
        mouseDownOnBackdropRef.current = e.target === e.currentTarget
      }}
      onMouseUp={(e) => {
        if (mouseDownOnBackdropRef.current && e.target === e.currentTarget) {
          onClose()
        }
        mouseDownOnBackdropRef.current = false
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Gerenciar briefs"
        className="relative flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10,
                letterSpacing: '0.22em',
                color: 'var(--text-subtle)',
              }}
            >
              Gerenciar briefs
            </span>
            <span
              className="font-mono tabular"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
              }}
            >
              {presets.length}/{limitLabel}
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

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {presets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Sparkles size={20} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
              <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                Nenhum brief salvo
              </p>
              <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                Crie seu primeiro brief pra começar.
              </p>
            </div>
          ) : (
            presets.map((p) => {
              const isEditingName = editingNameId === p.id
              const isConfirmingDelete = confirmDeleteId === p.id
              const isDeleting = deletingId === p.id
              const isActivating = activatingId === p.id
              const isSavingName = savingNameId === p.id
              // Resumo aceita brief v2 (preferido) com fallback pra v1 legacy
              const briefSummary = [
                p.brief.artista_primario ?? p.brief.artista_nome,
                p.brief.genero_primario,
                p.brief.mood ?? p.brief.energia,
                p.brief.cenario ?? p.brief.ambiente,
                p.brief.atmosfera_luz ?? p.brief.iluminacao,
              ].filter(Boolean).join(' · ')

              return (
                <div
                  key={p.id}
                  className="rounded-lg px-3 py-2.5 transition-colors"
                  style={{
                    background: p.is_active ? 'rgba(199,181,255,0.05)' : 'transparent',
                    border: '1px solid',
                    borderColor: p.is_active ? 'var(--border-purple)' : 'transparent',
                    marginBottom: 4,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {/* Radio de ativo */}
                    <button
                      type="button"
                      onClick={() => !p.is_active && handleActivate(p.id)}
                      disabled={isActivating || p.is_active}
                      aria-label={p.is_active ? 'Brief ativo' : 'Ativar este brief'}
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full disabled:cursor-default"
                      style={{
                        border: p.is_active
                          ? '1.5px solid var(--purple-light)'
                          : '1.5px solid var(--border-medium)',
                      }}
                    >
                      {p.is_active && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: 'var(--purple-light)' }}
                        />
                      )}
                      {isActivating && (
                        <Loader2 size={10} className="animate-spin" />
                      )}
                    </button>

                    {/* Nome (editável inline) */}
                    {isEditingName ? (
                      <input
                        type="text"
                        value={draftName}
                        autoFocus
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename()
                          if (e.key === 'Escape') {
                            setEditingNameId(null)
                            setErrorMsg(null)
                          }
                        }}
                        maxLength={60}
                        className="field-input"
                        style={{ fontSize: 13, padding: '6px 10px', flex: 1 }}
                      />
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-[14px] font-medium"
                          style={{
                            color: p.is_active ? 'var(--text-primary)' : 'var(--text-secondary)',
                            letterSpacing: '-0.005em',
                          }}
                        >
                          {p.name}
                          {p.is_active && (
                            <span
                              className="ml-2 font-mono uppercase"
                              style={{
                                fontSize: 9.5,
                                letterSpacing: '0.16em',
                                color: 'var(--purple-soft)',
                              }}
                            >
                              · ativo
                            </span>
                          )}
                        </p>
                        <p
                          className="mt-0.5 truncate text-[11.5px]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {briefSummary || '(brief vazio)'}
                        </p>
                      </div>
                    )}

                    {/* Ações */}
                    {isEditingName ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={confirmRename}
                          disabled={isSavingName}
                          aria-label="Salvar nome"
                          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-40"
                          style={{ color: 'var(--purple-light)' }}
                          onMouseEnter={(e) => {
                            if (!isSavingName) e.currentTarget.style.background = 'rgba(199,181,255,0.10)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          {isSavingName ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={14} strokeWidth={2.4} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNameId(null)
                            setErrorMsg(null)
                          }}
                          aria-label="Cancelar"
                          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <X size={13} strokeWidth={2} />
                        </button>
                      </div>
                    ) : isConfirmingDelete ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(p.id)}
                          disabled={isDeleting}
                          className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-40"
                          style={{
                            background: 'rgba(248,113,113,0.10)',
                            color: 'var(--led-error)',
                            border: '1px solid rgba(248,113,113,0.30)',
                          }}
                        >
                          {isDeleting ? <Loader2 size={11} className="animate-spin inline" /> : 'Sim, deletar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={isDeleting}
                          className="rounded-md px-2 py-1 text-[11px] transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => startRename(p)}
                          aria-label="Renomear"
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
                          title="Renomear"
                        >
                          <Pencil size={12} strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditFull(p.id)}
                          aria-label="Editar conteúdo do brief"
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
                          title="Editar conteúdo"
                        >
                          <Sparkles size={12} strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(p.id)}
                          aria-label="Deletar"
                          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(248,113,113,0.10)'
                            e.currentTarget.style.color = 'var(--led-error)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = 'var(--text-muted)'
                          }}
                          title="Deletar"
                        >
                          <Trash2 size={12} strokeWidth={1.8} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Erro */}
        {errorMsg && (
          <div
            className="mx-4 mb-2 flex items-center gap-2 rounded-lg px-3 py-2"
            style={{
              background: 'rgba(248,113,113,0.06)',
              border: '1px solid rgba(248,113,113,0.20)',
              color: '#FCA5A5',
              fontSize: 12,
            }}
          >
            <AlertCircle size={12} />
            {errorMsg}
          </div>
        )}

        {/* Footer */}
        <footer
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {reachedLimit ? (
            <span
              className="text-[11.5px]"
              style={{ color: 'var(--text-muted)' }}
            >
              Limite atingido ({presets.length}/{limitLabel}) — delete um pra criar novo
            </span>
          ) : (
            <span aria-hidden />
          )}
          <button
            type="button"
            onClick={() => {
              if (!reachedLimit) onCreate()
            }}
            disabled={reachedLimit}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={13} strokeWidth={2.2} />
            Novo brief
          </button>
        </footer>
      </div>
    </div>
  )
}
