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
 * Chama o endpoint backend GET /beats/{id}/media-urls que retorna ambas
 * signed URLs (1h). Backend usa service-role e bypassa a RLS de
 * cover_library (que bloqueia SELECT direto via supabase-js do client).
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
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) throw new Error('Sessao expirada')

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
        const res = await fetch(`${apiUrl}/beats/${beatId}/media-urls`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.detail ?? `Erro ${res.status} ao buscar midia`)
        }
        const data = (await res.json()) as {
          audio_url: string | null
          cover_url: string | null
        }
        if (cancelled) return
        setAudioUrl(data.audio_url)
        setCoverUrl(data.cover_url)
        console.log('[MediaPreview] URLs:', {
          audio_url: !!data.audio_url,
          cover_url: !!data.cover_url,
        })
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
