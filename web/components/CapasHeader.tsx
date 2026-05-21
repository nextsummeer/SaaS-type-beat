'use client'

import { Pencil, Plus, Sparkles, AlertCircle } from 'lucide-react'
import type { CoverBrief, CoverCreditsState } from '@/lib/api'

type Props = {
  defaultBrief: CoverBrief | null
  artistaNome: string | null  // resolvido pelo caller — null se brief sem artista_id válido
  credits: CoverCreditsState | null
  loading: boolean
  onEditStyle: () => void
  onGenerate: (lote: 1 | 3) => void
  onGenerateWithDifferentBrief: () => void
}

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  intermediate: 'Intermediário',
  premium: 'Premium',
}

const SUJEITO_DISPLAY: Record<string, string> = {
  jovem: 'jovem',
  mulher: 'mulher',
  grupo: 'grupo',
  sem_pessoa: 'sem pessoa',
  so_objeto: 'objeto',
}

const AMBIENTE_DISPLAY: Record<string, string> = {
  rua_hood: 'rua / hood',
  interior_luxo: 'interior luxo',
  noturno: 'noturno',
  natureza: 'natureza',
  neon: 'neon',
  minimalista: 'minimalista',
}

const ILUMINACAO_DISPLAY: Record<string, string> = {
  sol_duro: 'sol duro',
  golden_hour: 'golden hour',
  vermelho: 'vermelho',
  azul_neon: 'azul neon',
  noturno: 'noturno',
  vintage: 'vintage',
}

const ENERGIA_DISPLAY: Record<string, string> = {
  agressivo: 'agressivo',
  melancolico: 'melancólico',
  sexy: 'sexy',
  hood_famous: 'hood famous',
  atmosferico: 'atmosférico',
  festa: 'festa',
}

function briefSummary(brief: CoverBrief, artistaNome: string | null): string[] {
  const out: string[] = []
  if (artistaNome) out.push(artistaNome)
  if (brief.sujeito && SUJEITO_DISPLAY[brief.sujeito]) out.push(SUJEITO_DISPLAY[brief.sujeito])
  if (brief.ambiente && AMBIENTE_DISPLAY[brief.ambiente]) out.push(AMBIENTE_DISPLAY[brief.ambiente])
  if (brief.iluminacao && ILUMINACAO_DISPLAY[brief.iluminacao]) out.push(ILUMINACAO_DISPLAY[brief.iluminacao])
  if (brief.energia && ENERGIA_DISPLAY[brief.energia]) out.push(ENERGIA_DISPLAY[brief.energia])
  return out
}

function daysUntilReset(resetAt: string | null): number | null {
  if (!resetAt) return null
  const reset = new Date(resetAt).getTime()
  const now = Date.now()
  const diffMs = reset - now
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Header da aba /capas.
 * Lado esquerdo: estilo padrão (brief atual) com botão editar.
 * Lado direito: créditos com barra de progresso fina.
 * Abaixo: botões de geração (1, 3, brief diferente).
 */
export function CapasHeader({
  defaultBrief,
  artistaNome,
  credits,
  loading,
  onEditStyle,
  onGenerate,
  onGenerateWithDifferentBrief,
}: Props) {
  const hasCredits = (credits?.remaining ?? 0) > 0
  const canGenerateOne = (credits?.remaining ?? 0) >= 1
  const canGenerateThree = (credits?.remaining ?? 0) >= 3
  const summary = defaultBrief ? briefSummary(defaultBrief, artistaNome) : []
  const daysLeft = daysUntilReset(credits?.reset_at ?? null)

  return (
    <div className="space-y-7">
      {/* Linha 1: estilo (esquerda) + créditos (direita) */}
      <div className="flex flex-col gap-7 md:flex-row md:items-start md:justify-between">
        {/* Estilo padrão */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2.5">
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.22em',
                color: 'var(--text-subtle)',
              }}
            >
              Estilo padrão
            </span>
            {defaultBrief && !loading && (
              <button
                type="button"
                onClick={onEditStyle}
                className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 transition-colors"
                style={{
                  fontSize: 10.5,
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)',
                  border: '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)'
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)'
                  e.currentTarget.style.borderColor = 'transparent'
                }}
              >
                <Pencil size={10} strokeWidth={2} />
                editar
              </button>
            )}
          </div>

          {loading ? (
            <div
              className="h-9 w-72 max-w-full rounded-md shimmer"
              style={{ background: 'var(--bg-elevated)' }}
            />
          ) : defaultBrief && summary.length > 0 ? (
            <h2
              className="font-display text-[26px] font-semibold leading-tight"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.022em' }}
            >
              {summary.map((token, i) => (
                <span key={i}>
                  {token}
                  {i < summary.length - 1 && (
                    <span style={{ color: 'var(--text-subtle)', margin: '0 0.4em' }}>·</span>
                  )}
                </span>
              ))}
            </h2>
          ) : (
            <h2
              className="font-display text-[26px] font-semibold leading-tight"
              style={{ color: 'var(--text-muted)', letterSpacing: '-0.022em' }}
            >
              Não configurado
            </h2>
          )}
        </div>

        {/* Créditos */}
        <div className="md:w-[280px] md:shrink-0">
          <div className="mb-3 flex items-center gap-2.5">
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.22em',
                color: 'var(--text-subtle)',
              }}
            >
              Créditos
            </span>
            {credits && !loading && (
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 9.5,
                  letterSpacing: '0.18em',
                  color: 'var(--text-subtle)',
                }}
              >
                · plano {TIER_LABELS[credits.tier] ?? credits.tier}
              </span>
            )}
          </div>

          {loading || !credits ? (
            <CreditsSkeleton />
          ) : (
            <CreditsBar credits={credits} daysLeft={daysLeft} />
          )}
        </div>
      </div>

      {/* Linha 2: botões de geração */}
      <div className="flex flex-wrap items-center gap-3">
        <GenerateButton
          label="Gerar 1 capa"
          credits={1}
          enabled={canGenerateOne && !loading}
          tooltip={!canGenerateOne ? 'Sem créditos suficientes' : undefined}
          onClick={() => onGenerate(1)}
        />
        <GenerateButton
          label="Gerar 3 variações"
          credits={3}
          enabled={canGenerateThree && !loading}
          tooltip={!canGenerateThree ? 'Sem créditos suficientes (precisa 3)' : undefined}
          onClick={() => onGenerate(3)}
        />

        <span className="flex-1" aria-hidden />

        <button
          type="button"
          onClick={onGenerateWithDifferentBrief}
          disabled={!hasCredits || loading}
          className="group inline-flex items-center gap-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: 'var(--text-muted)',
            padding: '6px 0',
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.color = 'var(--text-secondary)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
          title="Gerar uma capa com brief diferente do padrão (não salva)"
        >
          <Plus size={13} strokeWidth={2} />
          Gerar com brief diferente
        </button>
      </div>
    </div>
  )
}

function CreditsSkeleton() {
  return (
    <div className="space-y-2">
      <div
        className="h-4 w-32 rounded-md shimmer"
        style={{ background: 'var(--bg-elevated)' }}
      />
      <div
        className="h-1 w-full rounded-full shimmer"
        style={{ background: 'var(--bg-elevated)' }}
      />
    </div>
  )
}

function CreditsBar({
  credits,
  daysLeft,
}: {
  credits: CoverCreditsState
  daysLeft: number | null
}) {
  const pct = credits.limit > 0 ? (credits.remaining / credits.limit) * 100 : 0
  const isOut = credits.remaining === 0 && credits.limit > 0
  const isLow = pct > 0 && pct <= 20
  const isMid = pct > 20 && pct <= 50

  const ledColor = isOut
    ? 'var(--led-error)'
    : isLow
    ? 'var(--led-error)'
    : isMid
    ? 'var(--led-warning)'
    : 'var(--led-success)'

  const fillColor = isOut
    ? 'var(--led-error)'
    : isLow
    ? 'var(--led-error)'
    : isMid
    ? 'var(--led-warning)'
    : 'var(--led-success)'

  return (
    <div className="space-y-2.5">
      {/* Linha de números */}
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span
            className="num-hero"
            style={{
              fontSize: 26,
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}
          >
            {credits.remaining}
          </span>
          <span
            className="font-mono tabular"
            style={{
              fontSize: 12,
              color: 'var(--text-subtle)',
              letterSpacing: '0.04em',
            }}
          >
            / {credits.limit}
          </span>
        </div>

        {daysLeft !== null && (
          <span
            className="font-mono tabular"
            style={{
              fontSize: 10.5,
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
            }}
          >
            renova em {daysLeft}{daysLeft === 1 ? ' dia' : ' dias'}
          </span>
        )}
      </div>

      {/* Barra fina */}
      <div
        className="relative h-[3px] w-full overflow-hidden rounded-full"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="absolute inset-y-0 left-0 transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: fillColor,
            boxShadow: `0 0 8px ${fillColor}`,
          }}
        />
      </div>

      {/* Aviso se acabou ou muito baixo */}
      {(isOut || isLow) && (
        <div
          className="flex items-center gap-1.5 pt-1"
          style={{ fontSize: 11, color: 'var(--led-error)' }}
        >
          <AlertCircle size={11} strokeWidth={2} />
          <span>
            {isOut ? 'Créditos esgotados' : 'Saldo baixo'} ·{' '}
            <button
              type="button"
              className="underline transition-colors"
              style={{ color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit' }}
              onClick={() => console.log('TODO: upgrade plano')}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--led-error)'
              }}
            >
              upgrade
            </button>
          </span>
        </div>
      )}
    </div>
  )
}

function GenerateButton({
  label,
  credits,
  enabled,
  tooltip,
  onClick,
}: {
  label: string
  credits: number
  enabled: boolean
  tooltip?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      title={tooltip}
      className="btn-primary group disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:transform-none disabled:hover:shadow-none"
      style={{ paddingLeft: 16, paddingRight: 18 }}
    >
      <Sparkles size={13} strokeWidth={2.2} />
      {label}
      <span
        className="font-mono tabular"
        style={{
          fontSize: 10.5,
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.78)',
          marginLeft: 2,
          paddingLeft: 8,
          borderLeft: '1px solid rgba(255,255,255,0.22)',
        }}
      >
        {credits} {credits === 1 ? 'CRÉDITO' : 'CRÉDITOS'}
      </span>
    </button>
  )
}
