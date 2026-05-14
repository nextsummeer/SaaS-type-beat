'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchAchievements,
  type Achievement,
  type AchievementCategory,
  type AchievementsResponse,
} from '@/lib/api'
import { AchievementBadge } from '@/components/AchievementBadge'
import { AchievementRankCard } from '@/components/AchievementRankCard'

const CATEGORIA_LABELS: Record<AchievementCategory, { titulo: string; emoji: string; desc: string }> = {
  streak: {
    titulo: 'Constância',
    emoji: '🔥',
    desc: 'Postar com frequência é o que faz crescer no longo prazo.',
  },
  volume: {
    titulo: 'Catálogo',
    emoji: '🎵',
    desc: 'Quantos beats você já publicou pelo BeatPost.',
  },
  views: {
    titulo: 'Audiência',
    emoji: '👁',
    desc: 'Views acumuladas no seu canal.',
  },
  hit: {
    titulo: 'Hits individuais',
    emoji: '🚀',
    desc: 'Beats que estouraram acima da média.',
  },
  secret: {
    titulo: 'Conquistas secretas',
    emoji: '🤫',
    desc: 'Você descobre fazendo.',
  },
}

const ORDEM_CATEGORIAS: AchievementCategory[] = ['streak', 'volume', 'views', 'hit', 'secret']

function formataData(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function formataNumero(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString('pt-BR')
}

export default function ConquistasPage() {
  const router = useRouter()
  const supabase = createClient()
  const [data, setData] = useState<AchievementsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    async function carrega() {
      setLoading(true)
      setErro(null)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }
        const r = await fetchAchievements(session.access_token)
        if (!cancelado) setData(r)
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'Erro desconhecido')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    carrega()
    return () => {
      cancelado = true
    }
  }, [])

  const porCategoria = data
    ? ORDEM_CATEGORIAS.reduce<Record<AchievementCategory, Achievement[]>>(
        (acc, cat) => {
          acc[cat] = data.achievements.filter((a) => a.category === cat)
          return acc
        },
        { streak: [], volume: [], views: [], hit: [], secret: [] },
      )
    : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1.5 rise rise-1">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{ color: 'var(--text-subtle)' }}
        >
          studio · conquistas
        </span>
        <h1
          className="font-display text-[40px] font-semibold leading-none tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          Sua jornada<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Type beat é maratona, não sprint. Aqui ficam os marcos que você conquistou no caminho.
        </p>
      </div>

      {/* Card de rank do produtor (esfera grande estilo Opal) */}
      {data && (
        <div className="rise rise-2">
          <AchievementRankCard rank={data.rank} />
        </div>
      )}

      {/* Resumo secundário: contagem de conquistas */}
      {data && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-3 rise rise-2"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <Trophy className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Conquistas:{' '}
              <span style={{ color: 'var(--accent)' }}>{data.unlocked_count}</span>
              {' '}/ {data.total}
            </span>
          </div>
          <div className="flex-1 max-w-md">
            <div
              className="relative h-1.5 overflow-hidden rounded-full"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(data.unlocked_count / data.total) * 100}%`,
                  background: 'var(--accent)',
                }}
              />
            </div>
          </div>
          <span
            className="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-subtle)' }}
          >
            {Math.round((data.unlocked_count / data.total) * 100)}%
          </span>
        </div>
      )}

      {erro && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#fca5a5',
          }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">{erro}</span>
        </div>
      )}

      {/* Categorias */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-muted)' }}
            >
              <div className="shimmer h-full w-full rounded-2xl" />
            </div>
          ))}
        </div>
      ) : (
        porCategoria &&
        ORDEM_CATEGORIAS.map((cat) => {
          const lista = porCategoria[cat]
          if (lista.length === 0) return null
          const meta = CATEGORIA_LABELS[cat]
          const desbloqueadasCat = lista.filter((a) => a.unlocked).length
          return (
            <section key={cat} className="rise rise-3 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h2
                    className="font-display text-[22px] font-semibold tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {meta.emoji} {meta.titulo}
                  </h2>
                  <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {meta.desc}
                  </p>
                </div>
                <span
                  className="font-mono text-[11px] uppercase tracking-wider"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  {desbloqueadasCat}/{lista.length}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {lista.map((ach) => (
                  <AchievementCard key={ach.key} ach={ach} />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}

function AchievementCard({ ach }: { ach: Achievement }) {
  return (
    <div
      className="group relative flex flex-col items-center overflow-hidden rounded-2xl p-5 text-center transition"
      style={{
        background: ach.unlocked
          ? 'linear-gradient(160deg, var(--bg-elevated), var(--bg-surface))'
          : 'var(--bg-surface)',
        border: ach.unlocked
          ? '1px solid var(--border-strong)'
          : '1px solid var(--border)',
        boxShadow: ach.unlocked ? 'var(--shadow-card)' : 'none',
        opacity: ach.unlocked ? 1 : 0.85,
      }}
    >
      {/* Esfera */}
      <div className="mt-2 mb-4 flex justify-center">
        <AchievementBadge
          tier={ach.tier}
          unlocked={ach.unlocked}
          size={96}
          pulse={ach.newly_unlocked}
        />
      </div>

      {/* Título */}
      <p
        className="font-display text-[15px] font-semibold leading-tight"
        style={{
          color: ach.unlocked ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
      >
        {ach.title}
      </p>
      <p
        className="mt-1 text-[12px] leading-snug"
        style={{ color: 'var(--text-subtle)' }}
      >
        {ach.description}
      </p>

      {/* Progresso */}
      <div className="mt-4 w-full">
        {ach.unlocked ? (
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="font-mono text-[10px] uppercase tracking-wider"
              style={{
                color:
                  ach.tier === 'gold'
                    ? '#ffd76b'
                    : ach.tier === 'silver'
                      ? '#cbd5e1'
                      : 'var(--accent)',
              }}
            >
              ✓ desbloqueada
            </span>
            {ach.unlocked_at && (
              <span
                className="text-[10px]"
                style={{ color: 'var(--text-subtle)' }}
              >
                em {formataData(ach.unlocked_at)}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div
              className="relative h-1.5 overflow-hidden rounded-full"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${ach.progress_pct}%`,
                  background: 'var(--text-subtle)',
                }}
              />
            </div>
            <span
              className="font-mono text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              {ach.category === 'secret'
                ? '???'
                : `${formataNumero(ach.current)} / ${formataNumero(ach.target)}`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
