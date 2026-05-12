'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Music, Loader2, AlertCircle, Calendar, Clock, Trash2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { BeatListItem } from '@/lib/api'

interface Props {
  beat: BeatListItem
  modoSelecao: boolean
  selecionado: boolean
  onToggleSelecionado: (id: string) => void
  onPedirDelete: (beat: BeatListItem) => void
}

type Estado = {
  label: string
  className: string
  isLoading?: boolean
}

function estadoVisual(beat: BeatListItem): Estado {
  if (beat.status === 'failed') {
    return { label: 'Falhou', className: 'bg-red-500/10 text-red-400 border-red-500/30' }
  }
  if (beat.post_status === 'published') {
    return { label: 'Postado', className: 'bg-green-500/10 text-green-400 border-green-500/30' }
  }
  if (beat.post_status === 'scheduled') {
    return { label: 'Agendado', className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' }
  }
  if (beat.status === 'ready_for_review') {
    return { label: 'Em Rascunho', className: 'bg-violet-500/10 text-violet-300 border-violet-500/30' }
  }
  return {
    label: 'Processando',
    className: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40',
    isLoading: true,
  }
}

function destino(beat: BeatListItem): string {
  if (
    beat.status === 'ready_for_review' ||
    beat.post_status === 'scheduled' ||
    beat.post_status === 'published'
  ) {
    return `/beats/${beat.id}/review`
  }
  return `/beats/${beat.id}`
}

function formataData(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
      + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export function BeatCard({ beat, modoSelecao, selecionado, onToggleSelecionado, onPedirDelete }: Props) {
  const router = useRouter()
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const estado = estadoVisual(beat)
  const href = destino(beat)
  const supabase = createClient()

  useEffect(() => {
    let cancelado = false
    async function carregaCapa() {
      if (!beat.cover_path) return
      const { data } = await supabase.storage
        .from('covers')
        .createSignedUrl(beat.cover_path, 60 * 60)
      if (!cancelado && data?.signedUrl) setCoverUrl(data.signedUrl)
    }
    carregaCapa()
    return () => { cancelado = true }
  }, [beat.cover_path])

  function handleCardClick() {
    if (modoSelecao) {
      onToggleSelecionado(beat.id)
    } else {
      router.push(href)
    }
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    onPedirDelete(beat)
  }

  const titulo = beat.titulo ?? '[Aguardando IA]'
  const inicial = (beat.artista_nome ?? '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-zinc-900/50 transition ${
        selecionado
          ? 'border-violet-500 ring-2 ring-violet-500/30'
          : 'border-zinc-800 hover:border-violet-500/40 hover:bg-zinc-900'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square w-full overflow-hidden bg-zinc-800">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={titulo}
            className={`h-full w-full object-cover transition ${modoSelecao ? '' : 'group-hover:scale-105'}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/40 to-zinc-900">
            <span className="text-4xl font-bold text-zinc-600">{inicial}</span>
          </div>
        )}

        {/* Overlay escuro quando selecionado */}
        {modoSelecao && selecionado && (
          <div className="absolute inset-0 bg-violet-600/20" />
        )}

        {/* Checkbox em modo seleção */}
        {modoSelecao && (
          <div
            className={`absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
              selecionado
                ? 'border-violet-400 bg-violet-600 text-white'
                : 'border-white/60 bg-black/40 backdrop-blur-sm'
            }`}
          >
            {selecionado && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </div>
        )}

        {/* Botão deletar individual (só fora do modo seleção) */}
        {!modoSelecao && (
          <button
            type="button"
            onClick={handleDeleteClick}
            title="Deletar beat"
            aria-label="Deletar beat"
            className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700/50 bg-black/60 text-zinc-300 opacity-0 backdrop-blur-sm transition hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Badge de status */}
        <div
          className={`absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${estado.className}`}
        >
          {estado.isLoading && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
          {beat.status === 'failed' && <AlertCircle className="h-2.5 w-2.5" />}
          {estado.label}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-white" title={titulo}>
          {titulo}
        </h3>

        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
          <Music className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {beat.artista_nome ?? 'sem artista'}
            {beat.bpm ? ` · ${beat.bpm}` : ''}
            {beat.music_key ? ` · ${beat.music_key}` : ''}
          </span>
        </div>

        <div className="mt-auto flex flex-col gap-0.5 border-t border-zinc-800 pt-1.5 text-[10px] text-zinc-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5" />
            <span className="truncate">Criado {formataData(beat.created_at)}</span>
          </div>
          {beat.updated_at && beat.updated_at !== beat.created_at && (
            <div className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              <span className="truncate">Editado {formataData(beat.updated_at)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
