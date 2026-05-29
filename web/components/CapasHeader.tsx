'use client'

import { Sparkles, AlertCircle } from 'lucide-react'
import type { BriefPreset, CoverCreditsState } from '@/lib/api'
import { BriefSelector } from './BriefSelector'

type Props = {
  presets: BriefPreset[]
  activeBriefId: string | null
  credits: CoverCreditsState | null
  loading: boolean
  onOpenBriefManager: () => void
  onGenerate: (lote: 1 | 3) => void
}

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  intermediate: 'Intermediário',
  premium: 'Premium',
  internal: 'Interno · ∞',
}

/** True quando os limites do tier sao efetivamente ilimitados. */
function isUnlimitedTier(tier: string): boolean {
  return tier === 'internal'
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
 * Esquerda: BriefSelector (dropdown com nomes dos presets + ações).
 * Direita: créditos restantes + barra fina.
 * Abaixo: rótulo "gerar do brief X" + botões "Gerar 1 capa" (primário) e
 * "Gerar 3 capas" (secundário). Hierarquia visual deixa claro que não fazem
 * a mesma coisa — só muda a quantidade. T4.42.
 */
export function CapasHeader({
  presets,
  activeBriefId,
  credits,
  loading,
  onOpenBriefManager,
  onGenerate,
}: Props) {
  const activeBrief = presets.find((p) => p.id === activeBriefId) ?? null
  const hasActive = !!activeBrief
  const canGenerateOne = (credits?.remaining ?? 0) >= 1 && hasActive
  const canGenerateThree = (credits?.remaining ?? 0) >= 3 && hasActive
  const daysLeft = daysUntilReset(credits?.reset_at ?? null)

  return (
    <div className="space-y-7">
      {/* Linha 1: BriefSelector (esquerda) + créditos (direita) */}
      <div className="flex flex-col gap-7 md:flex-row md:items-start md:justify-between">
        {/* BriefSelector — card editorial auto-explicativo, eyebrow interno
            ("/ Brief em uso") substituiu o label externo que ficava apagado. */}
        <div className="min-w-0 flex-1">
          <BriefSelector
            presets={presets}
            activeId={activeBriefId}
            loading={loading}
            onOpenManager={onOpenBriefManager}
          />
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

      {/* Linha 2: rótulo do brief de origem + botões de geração */}
      <div className="space-y-3.5">
        {/* Deixa explícito DE QUAL brief a geração vai sair (resolve a dúvida
            quando o produtor troca de brief sem gerar). */}
        {hasActive && (
          <div className="flex items-baseline gap-2.5">
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.22em',
                color: 'var(--text-subtle)',
              }}
            >
              Gerar do brief
            </span>
            <span
              className="min-w-0 truncate"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
              title={activeBrief?.name}
            >
              {activeBrief?.name}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <GenerateButton
            variant="primary"
            label="Gerar 1 capa"
            credits={1}
            enabled={canGenerateOne && !loading}
            tooltip={
              !hasActive
                ? 'Selecione ou crie um brief primeiro'
                : !canGenerateOne
                ? 'Sem créditos suficientes'
                : undefined
            }
            onClick={() => onGenerate(1)}
          />
          <GenerateButton
            variant="secondary"
            label="Gerar 3 capas"
            credits={3}
            enabled={canGenerateThree && !loading}
            tooltip={
              !hasActive
                ? 'Selecione ou crie um brief primeiro'
                : !canGenerateThree
                ? 'Sem créditos suficientes (precisa 3)'
                : undefined
            }
            onClick={() => onGenerate(3)}
          />
        </div>
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
  const unlimited = isUnlimitedTier(credits.tier)
  const pct = credits.limit > 0 ? (credits.remaining / credits.limit) * 100 : 0
  const isOut = credits.remaining === 0 && credits.limit > 0 && !unlimited
  const isLow = !unlimited && pct > 0 && pct <= 20
  const isMid = !unlimited && pct > 20 && pct <= 50

  // Tier interno usa cor neutra (não importa "porcentagem")
  const fillColor = unlimited
    ? 'var(--purple-light)'
    : isOut
    ? 'var(--led-error)'
    : isLow
    ? 'var(--led-error)'
    : isMid
    ? 'var(--led-warning)'
    : 'var(--led-success)'

  return (
    <div className="space-y-2.5">
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
            {unlimited ? '∞' : credits.remaining}
          </span>
          {!unlimited && (
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
          )}
          {unlimited && (
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10.5,
                color: 'var(--purple-soft)',
                letterSpacing: '0.16em',
                marginLeft: 4,
              }}
            >
              ilimitado
            </span>
          )}
        </div>

        {!unlimited && daysLeft !== null && (
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

      {!unlimited && (
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
      )}

      {(isOut || isLow) && (
        <div
          className="flex items-center gap-1.5 pt-1"
          style={{ fontSize: 11, color: 'var(--led-error)' }}
        >
          <AlertCircle size={11} strokeWidth={2} />
          <span>{isOut ? 'Créditos esgotados' : 'Saldo baixo'}</span>
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
  variant,
}: {
  label: string
  credits: number
  enabled: boolean
  tooltip?: string
  onClick: () => void
  /** 'primary' = ação principal (roxo cheio) | 'secondary' = outline discreto */
  variant: 'primary' | 'secondary'
}) {
  const isPrimary = variant === 'primary'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      title={tooltip}
      className={`${
        isPrimary ? 'btn-primary' : 'btn-ghost'
      } group disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:transform-none disabled:hover:shadow-none`}
      style={{ paddingLeft: 16, paddingRight: 18 }}
    >
      {/* Ícone só no primário — reforça que ele é a ação principal */}
      {isPrimary && <Sparkles size={13} strokeWidth={2.2} />}
      {label}
      <span
        className="font-mono tabular"
        style={{
          fontSize: 10.5,
          letterSpacing: '0.08em',
          color: isPrimary ? 'rgba(255,255,255,0.78)' : 'var(--text-subtle)',
          marginLeft: 2,
          paddingLeft: 8,
          borderLeft: isPrimary
            ? '1px solid rgba(255,255,255,0.22)'
            : '1px solid var(--border-subtle)',
        }}
      >
        {credits} {credits === 1 ? 'CRÉDITO' : 'CRÉDITOS'}
      </span>
    </button>
  )
}
