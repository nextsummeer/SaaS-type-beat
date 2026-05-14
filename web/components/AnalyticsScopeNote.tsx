import Link from 'next/link'
import { Info } from 'lucide-react'

type Variant = 'channel' | 'beatpost'

/**
 * Nota explicativa sobre QUAIS dados aparecem na página.
 *
 * - `channel` → na Visão Geral, deixa claro que inclui o canal todo
 * - `beatpost` → na lista de beats, deixa claro que filtra só BeatPost
 *
 * Visual discreto: ícone Info pequeno + texto cinza, sem background pesado.
 */
export function AnalyticsScopeNote({ variant }: { variant: Variant }) {
  if (variant === 'channel') {
    return (
      <div
        className="flex items-start gap-2.5 rounded-lg px-3.5 py-2.5"
        style={{
          background: 'transparent',
          border: '1px dashed var(--border)',
        }}
      >
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-subtle)' }} />
        <p
          className="text-[12px] leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          Os números desta página somam <strong style={{ color: 'var(--text-secondary)' }}>tudo no seu canal do YouTube</strong>,
          incluindo vídeos antigos, beats publicados manualmente, shorts e qualquer outro
          conteúdo. Se você quer ver as métricas <strong style={{ color: 'var(--text-secondary)' }}>apenas dos beats publicados pelo
          BeatPost</strong>, abre{' '}
          <Link
            href="/analytics/beats"
            className="underline-offset-2 hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            Meus beats
          </Link>
          .
        </p>
      </div>
    )
  }

  // beatpost
  return (
    <div
      className="flex items-start gap-2.5 rounded-lg px-3.5 py-2.5"
      style={{
        background: 'transparent',
        border: '1px dashed var(--border)',
      }}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-subtle)' }} />
      <p
        className="text-[12px] leading-relaxed"
        style={{ color: 'var(--text-muted)' }}
      >
        Esta lista mostra <strong style={{ color: 'var(--text-secondary)' }}>apenas beats publicados pelo BeatPost</strong>.
        Vídeos antigos do canal ou publicados manualmente no YouTube não aparecem aqui.
        Pra ver as métricas <strong style={{ color: 'var(--text-secondary)' }}>do canal inteiro</strong>, abre a{' '}
        <Link
          href="/analytics"
          className="underline-offset-2 hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          Visão geral
        </Link>
        .
      </p>
    </div>
  )
}
