'use client'

import { useEffect, useState } from 'react'
import { ImageOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AudioPlayer } from './AudioPlayer'

type Props = {
  beatId: string
}

/**
 * Preview do audio + capa do beat na review page.
 *
 * Busca os paths em `beats` via Supabase client (RLS valida ownership) e
 * gera signed URLs de 1h pros buckets `audios` e `covers`. Capa da biblioteca
 * vem com `cover_id` + `cover_library.image_url` ja publico; capa manual
 * usa `cover_path` no bucket `covers`.
 */
export function MediaPreview({ beatId }: Props) {
  const supabase = createClient()
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverImgFailed, setCoverImgFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: beat, error: beatErr } = await supabase
          .from('beats')
          .select('audio_path, cover_path, cover_id')
          .eq('id', beatId)
          .maybeSingle()
        if (beatErr) throw beatErr
        if (!beat) throw new Error('Beat nao encontrado')

        console.log('[MediaPreview] Beat carregado:', {
          beatId,
          audio_path: beat.audio_path,
          cover_id: beat.cover_id,
          cover_path: beat.cover_path,
        })

        if (beat.audio_path) {
          const signed = await supabase.storage
            .from('audios')
            .createSignedUrl(beat.audio_path, 3600)
          if (signed.error) throw signed.error
          if (!cancelled) setAudioUrl(signed.data.signedUrl)
        }

        if (beat.cover_id) {
          // Capa da biblioteca: tenta image_url primeiro, fallback pro
          // storage_path se faltar. NB: pode haver capa em status pending
          // ou failed sem image_url ainda -- aceitavel mostrar fallback.
          const { data: cover, error: coverErr } = await supabase
            .from('cover_library')
            .select('image_url, storage_path, status')
            .eq('id', beat.cover_id)
            .maybeSingle()
          console.log('[MediaPreview] cover_library lookup:', {
            cover_id: beat.cover_id,
            cover,
            error: coverErr?.message,
          })
          if (cover?.image_url && !cancelled) {
            setCoverUrl(cover.image_url)
          } else if (cover?.storage_path) {
            const s = await supabase.storage
              .from('covers')
              .createSignedUrl(cover.storage_path, 3600)
            console.log('[MediaPreview] signed URL via cover.storage_path:', {
              storage_path: cover.storage_path,
              ok: !!s.data,
              error: s.error?.message,
            })
            if (!cancelled && s.data) setCoverUrl(s.data.signedUrl)
          } else {
            console.warn(
              '[MediaPreview] cover_id presente mas sem image_url nem storage_path',
            )
          }
        } else if (beat.cover_path) {
          const signedCover = await supabase.storage
            .from('covers')
            .createSignedUrl(beat.cover_path, 3600)
          console.log('[MediaPreview] signed URL via beat.cover_path:', {
            cover_path: beat.cover_path,
            ok: !!signedCover.data,
            error: signedCover.error?.message,
          })
          if (signedCover.error) throw signedCover.error
          if (!cancelled) setCoverUrl(signedCover.data.signedUrl)
        } else {
          console.warn(
            '[MediaPreview] beat sem cover_id e sem cover_path -- nada pra renderizar',
          )
        }
      } catch (e) {
        console.error('[MediaPreview] Falha no load:', e)
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Erro ao carregar midia')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [beatId, supabase])

  if (loading) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-5 text-sm"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Carregando preview...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-xl px-4 py-3 text-xs"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-subtle)',
        }}
      >
        Preview indisponivel: {error}
      </div>
    )
  }

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-stretch gap-0">
        <div
          className="relative shrink-0"
          style={{
            width: 120,
            background: 'var(--bg-base)',
            borderRight: '1px solid var(--border-subtle)',
          }}
        >
          {coverUrl && !coverImgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt="Capa do beat"
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => {
                console.error(
                  '[MediaPreview] <img> falhou ao carregar coverUrl:',
                  coverUrl,
                )
                setCoverImgFailed(true)
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 text-center">
              <ImageOff
                className="h-5 w-5"
                style={{ color: 'var(--text-subtle)' }}
              />
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 8.5,
                  letterSpacing: '0.18em',
                  color: 'var(--text-subtle)',
                }}
              >
                {coverImgFailed ? 'imagem inacessivel' : 'sem capa'}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 p-3.5">
          <p
            className="mb-2.5 font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              color: 'var(--text-subtle)',
            }}
          >
            / Preview do video
          </p>
          {audioUrl ? (
            <AudioPlayer src={audioUrl} flat />
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
              Audio indisponivel.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
