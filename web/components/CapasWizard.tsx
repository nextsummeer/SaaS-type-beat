'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Cloud,
  Crown,
  Film,
  Flame,
  Heart,
  Home,
  ImageOff,
  Loader2,
  Moon,
  Mountain,
  Package,
  PartyPopper,
  Sparkles,
  Square,
  Sun,
  Sunset,
  User,
  Users,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { CoverBrief } from '@/lib/api'

type Option = {
  slug: string
  label: string
  icon: LucideIcon
}

const SUJEITO_OPTIONS: Option[] = [
  { slug: 'jovem', label: 'Jovem', icon: User },
  { slug: 'mulher', label: 'Mulher', icon: Heart },
  { slug: 'grupo', label: 'Grupo / crew', icon: Users },
  { slug: 'sem_pessoa', label: 'Sem pessoa', icon: ImageOff },
  { slug: 'so_objeto', label: 'Só objeto', icon: Package },
]

const AMBIENTE_OPTIONS: Option[] = [
  { slug: 'rua_hood', label: 'Rua / hood', icon: Home },
  { slug: 'interior_luxo', label: 'Interior luxo', icon: Building2 },
  { slug: 'noturno', label: 'Noturno urbano', icon: Moon },
  { slug: 'natureza', label: 'Natureza', icon: Mountain },
  { slug: 'neon', label: 'Neon', icon: Zap },
  { slug: 'minimalista', label: 'Minimalista', icon: Square },
]

const ILUMINACAO_OPTIONS: Option[] = [
  { slug: 'sol_duro', label: 'Sol duro', icon: Sun },
  { slug: 'golden_hour', label: 'Golden hour', icon: Sunset },
  { slug: 'vermelho', label: 'Vermelho', icon: Flame },
  { slug: 'azul_neon', label: 'Azul neon', icon: Zap },
  { slug: 'noturno', label: 'Noturno', icon: Moon },
  { slug: 'vintage', label: 'Vintage / VHS', icon: Film },
]

const ENERGIA_OPTIONS: Option[] = [
  { slug: 'agressivo', label: 'Agressivo', icon: Flame },
  { slug: 'melancolico', label: 'Melancólico', icon: Cloud },
  { slug: 'sexy', label: 'Sexy', icon: Heart },
  { slug: 'hood_famous', label: 'Hood famous', icon: Crown },
  { slug: 'atmosferico', label: 'Atmosférico', icon: Sparkles },
  { slug: 'festa', label: 'Festa', icon: PartyPopper },
]

type Step = 1 | 2 | 3
type SaveAction = 'save_and_generate' | 'save_only'

type Props = {
  open: boolean
  initialBrief: CoverBrief | null
  isFirstTime: boolean
  isOnboardingFree: boolean
  onClose: () => void
  onSave: (brief: CoverBrief, action: SaveAction) => Promise<void>
}

/**
 * Wizard de configuração do estilo padrão.
 * 3 steps:
 *   1. Artista de referência (texto livre)
 *   2. Visual: 4 grids de cards (sujeito, ambiente, iluminação, energia)
 *   3. Confirmação: resumo + nota livre + CTAs (salvar / salvar e gerar)
 *
 * isOnboardingFree = true mostra "Gerar 1 capa teste (grátis)" no step 3.
 */
export function CapasWizard({
  open,
  initialBrief,
  isFirstTime,
  isOnboardingFree,
  onClose,
  onSave,
}: Props) {
  const [step, setStep] = useState<Step>(1)
  const [artistaNome, setArtistaNome] = useState('')
  const [sujeito, setSujeito] = useState<string | null>(null)
  const [ambiente, setAmbiente] = useState<string | null>(null)
  const [iluminacao, setIluminacao] = useState<string | null>(null)
  const [energia, setEnergia] = useState<string | null>(null)
  const [notaLivre, setNotaLivre] = useState('')
  const [saving, setSaving] = useState<SaveAction | null>(null)

  const dialogRef = useRef<HTMLDivElement>(null)

  // Reset state quando o modal abre. Pre-fill se for edição.
  useEffect(() => {
    if (!open) return
    setStep(1)
    setArtistaNome(initialBrief?.artista_nome ?? '')
    setSujeito(initialBrief?.sujeito ?? null)
    setAmbiente(initialBrief?.ambiente ?? null)
    setIluminacao(initialBrief?.iluminacao ?? null)
    setEnergia(initialBrief?.energia ?? null)
    setNotaLivre(initialBrief?.nota_livre ?? '')
    setSaving(null)
  }, [open, initialBrief])

  // Esc fecha o modal
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, saving, onClose])

  // Lock body scroll
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const canAdvanceFrom1 = artistaNome.trim().length > 0
  const trimmed = artistaNome.trim()

  async function handleSubmit(action: SaveAction) {
    if (saving) return
    setSaving(action)
    try {
      await onSave(
        {
          artista_nome: trimmed,
          sujeito,
          ambiente,
          iluminacao,
          energia,
          nota_livre: notaLivre.trim() || null,
        },
        action,
      )
    } finally {
      setSaving(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{
        background: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Configuração do estilo padrão"
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* HEADER */}
        <header
          className="flex items-center justify-between px-7 py-5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-4">
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10,
                letterSpacing: '0.22em',
                color: 'var(--text-subtle)',
              }}
            >
              {isFirstTime ? 'Configuração inicial' : 'Editar estilo padrão'}
            </span>
            <span aria-hidden style={{ width: 24, height: 1, background: 'var(--border-subtle)' }} />
            <StepIndicator current={step} />
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={!!saving}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-30"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        {/* CONTEÚDO ROLÁVEL */}
        <div className="flex-1 overflow-y-auto px-7 py-8">
          {step === 1 && (
            <Step1Artista
              value={artistaNome}
              onChange={setArtistaNome}
            />
          )}
          {step === 2 && (
            <Step2Visual
              sujeito={sujeito}
              ambiente={ambiente}
              iluminacao={iluminacao}
              energia={energia}
              onPickSujeito={setSujeito}
              onPickAmbiente={setAmbiente}
              onPickIluminacao={setIluminacao}
              onPickEnergia={setEnergia}
            />
          )}
          {step === 3 && (
            <Step3Confirmacao
              artistaNome={trimmed}
              sujeito={sujeito}
              ambiente={ambiente}
              iluminacao={iluminacao}
              energia={energia}
              notaLivre={notaLivre}
              onChangeNota={setNotaLivre}
            />
          )}
        </div>

        {/* FOOTER */}
        <footer
          className="flex items-center justify-between px-7 py-5"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
              disabled={!!saving}
              className="btn-ghost disabled:opacity-40"
            >
              <ArrowLeft size={13} strokeWidth={2} />
              Voltar
            </button>
          ) : (
            <span aria-hidden />
          )}

          <div className="flex items-center gap-3">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(3, s + 1) as Step)}
                disabled={step === 1 ? !canAdvanceFrom1 : false}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:transform-none disabled:hover:shadow-none"
              >
                Próximo
                <ArrowRight size={13} strokeWidth={2.2} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit('save_only')}
                  disabled={!!saving}
                  className="btn-ghost disabled:opacity-40"
                >
                  {saving === 'save_only' && (
                    <Loader2 size={13} strokeWidth={2} className="animate-spin" />
                  )}
                  Apenas salvar
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit('save_and_generate')}
                  disabled={!!saving}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving === 'save_and_generate' ? (
                    <>
                      <Loader2 size={13} strokeWidth={2.2} className="animate-spin" />
                      Salvando…
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} strokeWidth={2.2} />
                      {isOnboardingFree ? 'Salvar + gerar 1 capa grátis' : 'Salvar + gerar 1 capa'}
                      {!isOnboardingFree && (
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
                          1 CRÉDITO
                        </span>
                      )}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${current} de 3`}>
      {[1, 2, 3].map((n) => {
        const active = n === current
        const completed = n < current
        return (
          <span
            key={n}
            className="block h-[5px] rounded-full transition-all duration-300"
            style={{
              width: active ? 22 : 6,
              background: active
                ? 'var(--purple-light)'
                : completed
                ? 'var(--text-subtle)'
                : 'var(--border-subtle)',
            }}
          />
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Step 1 — Artista
// ─────────────────────────────────────────────────────────────────────
function Step1Artista({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-7">
      <div>
        <p
          className="font-mono uppercase mb-3"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-subtle)',
          }}
        >
          Step 01 · Referência
        </p>
        <h2
          className="font-display text-[28px] font-semibold leading-tight"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.024em' }}
        >
          De qual artista você<br />faz type beat?
        </h2>
        <p
          className="mt-3 max-w-md text-[13.5px] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          A IA usa essa referência pra entender a estética visual desejada.
          O nome real <strong style={{ color: 'var(--text-primary)' }}>nunca aparece</strong> na
          capa gerada — é só andaime pra construir a vibe.
        </p>
      </div>

      <div className="space-y-2">
        <label
          className="font-mono uppercase block"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
          }}
          htmlFor="wizard-artista-input"
        >
          Artista de referência
        </label>
        <input
          id="wizard-artista-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ex: Lil Baby, Drake, Playboi Carti, Fakemink…"
          className="field-input font-display"
          style={{
            fontSize: 17,
            letterSpacing: '-0.012em',
            padding: '14px 16px',
          }}
          autoFocus
          maxLength={120}
        />
        <p
          className="pt-1 text-[12px]"
          style={{ color: 'var(--text-subtle)' }}
        >
          Pode ser qualquer nome — mainstream, underground, novo. A IA entende.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Step 2 — Visual (4 grupos de cards)
// ─────────────────────────────────────────────────────────────────────
function Step2Visual({
  sujeito,
  ambiente,
  iluminacao,
  energia,
  onPickSujeito,
  onPickAmbiente,
  onPickIluminacao,
  onPickEnergia,
}: {
  sujeito: string | null
  ambiente: string | null
  iluminacao: string | null
  energia: string | null
  onPickSujeito: (v: string | null) => void
  onPickAmbiente: (v: string | null) => void
  onPickIluminacao: (v: string | null) => void
  onPickEnergia: (v: string | null) => void
}) {
  return (
    <div className="space-y-8">
      <div>
        <p
          className="font-mono uppercase mb-3"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-subtle)',
          }}
        >
          Step 02 · Elementos visuais
        </p>
        <h2
          className="font-display text-[24px] font-semibold leading-tight"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.022em' }}
        >
          Defina a estética
        </h2>
        <p
          className="mt-2 max-w-md text-[13px] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Escolha 1 opção em cada categoria. Pode pular as que não importam —
          a IA preenche o que faltar.
        </p>
      </div>

      <CardGroup
        label="Sujeito"
        options={SUJEITO_OPTIONS}
        value={sujeito}
        onPick={onPickSujeito}
      />
      <CardGroup
        label="Ambiente"
        options={AMBIENTE_OPTIONS}
        value={ambiente}
        onPick={onPickAmbiente}
      />
      <CardGroup
        label="Iluminação / Paleta"
        options={ILUMINACAO_OPTIONS}
        value={iluminacao}
        onPick={onPickIluminacao}
      />
      <CardGroup
        label="Energia / Mood"
        options={ENERGIA_OPTIONS}
        value={energia}
        onPick={onPickEnergia}
      />
    </div>
  )
}

function CardGroup({
  label,
  options,
  value,
  onPick,
}: {
  label: string
  options: Option[]
  value: string | null
  onPick: (v: string | null) => void
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.20em',
            color: 'var(--text-secondary)',
          }}
        >
          {label}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="font-mono uppercase transition-colors"
            style={{
              fontSize: 9.5,
              letterSpacing: '0.16em',
              color: 'var(--text-subtle)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-subtle)')}
          >
            limpar
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-6">
        {options.map((opt) => {
          const selected = value === opt.slug
          const Icon = opt.icon
          return (
            <button
              key={opt.slug}
              type="button"
              onClick={() => onPick(selected ? null : opt.slug)}
              className="group/card flex aspect-square flex-col items-center justify-center gap-2 rounded-lg p-2 transition-all"
              style={{
                background: selected ? 'rgba(199,181,255,0.10)' : 'rgba(255,255,255,0.02)',
                border: selected
                  ? '1px solid var(--border-purple)'
                  : '1px solid var(--border-subtle)',
                boxShadow: selected ? 'var(--shadow-glow-purple)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.045)'
                  e.currentTarget.style.borderColor = 'var(--border-medium)'
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                }
              }}
              aria-pressed={selected}
            >
              <Icon
                size={18}
                strokeWidth={selected ? 2 : 1.6}
                style={{
                  color: selected ? 'var(--purple-soft)' : 'var(--text-secondary)',
                }}
              />
              <span
                className="text-[11px] font-medium leading-tight"
                style={{
                  color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Step 3 — Confirmação
// ─────────────────────────────────────────────────────────────────────

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

function Step3Confirmacao({
  artistaNome,
  sujeito,
  ambiente,
  iluminacao,
  energia,
  notaLivre,
  onChangeNota,
}: {
  artistaNome: string
  sujeito: string | null
  ambiente: string | null
  iluminacao: string | null
  energia: string | null
  notaLivre: string
  onChangeNota: (v: string) => void
}) {
  const tokens: string[] = [artistaNome]
  if (sujeito && SUJEITO_DISPLAY[sujeito]) tokens.push(SUJEITO_DISPLAY[sujeito])
  if (ambiente && AMBIENTE_DISPLAY[ambiente]) tokens.push(AMBIENTE_DISPLAY[ambiente])
  if (iluminacao && ILUMINACAO_DISPLAY[iluminacao]) tokens.push(ILUMINACAO_DISPLAY[iluminacao])
  if (energia && ENERGIA_DISPLAY[energia]) tokens.push(ENERGIA_DISPLAY[energia])

  return (
    <div className="space-y-7">
      <div>
        <p
          className="font-mono uppercase mb-3"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-subtle)',
          }}
        >
          Step 03 · Confirmação
        </p>
        <h2
          className="font-display text-[24px] font-semibold leading-tight"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.022em' }}
        >
          Seu estilo padrão
        </h2>
      </div>

      {/* Resumo do brief */}
      <div
        className="rounded-xl px-5 py-5"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <p
          className="font-display text-[22px] font-semibold leading-snug"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.018em' }}
        >
          {tokens.map((t, i) => (
            <span key={i}>
              {t}
              {i < tokens.length - 1 && (
                <span style={{ color: 'var(--text-subtle)', margin: '0 0.4em' }}>·</span>
              )}
            </span>
          ))}
        </p>
      </div>

      {/* Nota livre */}
      <div className="space-y-2">
        <label
          className="font-mono uppercase block"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
          }}
          htmlFor="wizard-nota-livre"
        >
          Nota livre (opcional)
        </label>
        <textarea
          id="wizard-nota-livre"
          value={notaLivre}
          onChange={(e) => onChangeNota(e.target.value)}
          placeholder='ex: "OVO vibe", "Toronto winter cold", "ainda mais melancólico"'
          rows={3}
          maxLength={200}
          className="field-input resize-none"
          style={{ fontSize: 14 }}
        />
        <p
          className="text-[11.5px]"
          style={{ color: 'var(--text-subtle)' }}
        >
          Detalhes específicos que não cabem nos cards. {notaLivre.length}/200
        </p>
      </div>
    </div>
  )
}
