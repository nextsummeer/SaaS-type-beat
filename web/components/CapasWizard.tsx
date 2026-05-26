'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Cloud,
  Crown,
  Disc3,
  Flame,
  Heart,
  Home,
  Image as ImageIcon,
  ImageOff,
  Lamp,
  Loader2,
  Moon,
  MountainSnow,
  Music,
  Package,
  PartyPopper,
  Plus,
  Skull,
  Sparkles,
  Square,
  Star,
  Sun,
  Sunset,
  User,
  Users,
  Volume2,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { CoverBrief } from '@/lib/api'
import {
  SpotifyArtistPicker,
  SelectedArtistsDisplay,
  type SelectedArtist,
} from './SpotifyArtistPicker'

type Option = {
  slug: string
  label: string
  icon: LucideIcon
  description?: string
}

// ============================================================================
// VOCABULARIO v2 -- espelha api/app/services/cover_prompt_builder/vocabulary.py
// ============================================================================

const GENERO_OPTIONS: Option[] = [
  { slug: 'trap', label: 'Trap', icon: Crown, description: 'Atlanta, hood-luxury' },
  { slug: 'underground_trap', label: 'Underground', icon: Skull, description: 'Crude, lo-fi' },
  { slug: 'drill', label: 'Drill', icon: Zap, description: 'Cold, menace' },
  { slug: 'plug', label: 'Plug', icon: Cloud, description: 'Dreamy, melodic' },
  { slug: 'rnb', label: 'R&B', icon: Heart, description: 'Intimate, after hours' },
  { slug: 'rage', label: 'Rage', icon: Flame, description: 'Chaos, distorted' },
  { slug: 'boom_bap', label: 'Boom Bap', icon: Disc3, description: '90s NYC' },
  { slug: 'ambient', label: 'Ambient', icon: Sparkles, description: 'Conceptual, vast' },
  { slug: 'jersey_club', label: 'Jersey Club', icon: Music, description: 'Fast, dance' },
  { slug: 'pop', label: 'Pop', icon: Star, description: 'Pristine, candid' },
  { slug: 'afrobeats', label: 'Afrobeats', icon: Sun, description: 'Warm, group' },
]

const QUEM_OPTIONS: Option[] = [
  { slug: 'homem_solo', label: 'Um homem', icon: User },
  { slug: 'mulher_solo', label: 'Uma mulher', icon: Heart },
  { slug: 'casal', label: 'Um casal', icon: Users },
  { slug: 'grupo', label: 'Grupo / crew', icon: Users },
  { slug: 'sem_pessoa', label: 'Sem pessoa', icon: ImageOff },
]

const MOOD_OPTIONS: Option[] = [
  { slug: 'flexin', label: 'Flexin', icon: Crown, description: 'Money on display' },
  { slug: 'dark', label: 'Dark', icon: Skull, description: 'Pesado, ameaca' },
  { slug: 'sad', label: 'Sad', icon: Cloud, description: 'Melancolico, lonely' },
  { slug: 'sexy', label: 'Sexy', icon: Heart, description: 'Intimo, after hours' },
  { slug: 'party', label: 'Party', icon: PartyPopper, description: 'Festa, multidao' },
  { slug: 'chill', label: 'Chill', icon: Sparkles, description: 'Atmosferico, calmo' },
]

const ATMOSFERA_LUZ_OPTIONS: Option[] = [
  { slug: 'sol_duro_dia', label: 'Sol duro', icon: Sun },
  { slug: 'golden_hour', label: 'Golden hour', icon: Sunset },
  { slug: 'noite_natural', label: 'Noite natural', icon: Moon },
  { slug: 'flash_duro', label: 'Flash duro', icon: ImageIcon },
  { slug: 'luz_colorida', label: 'Luz colorida', icon: Flame },
  { slug: 'meia_luz', label: 'Meia luz', icon: Cloud },
]

// Display PT pros tokens do resumo no Step 3
const DISPLAY_PT: Record<string, string> = {
  // Generos
  trap: 'trap',
  underground_trap: 'underground trap',
  drill: 'drill',
  plug: 'plug',
  rnb: 'r&b',
  rage: 'rage',
  boom_bap: 'boom bap',
  ambient: 'ambient',
  jersey_club: 'jersey club',
  pop: 'pop',
  afrobeats: 'afrobeats',
  // Quem
  homem_solo: 'homem',
  mulher_solo: 'mulher',
  casal: 'casal',
  grupo: 'grupo',
  sem_pessoa: 'sem pessoa',
  // Mood
  flexin: 'flexin',
  dark: 'dark',
  sad: 'sad',
  sexy: 'sexy',
  party: 'party',
  chill: 'chill',
  // Luz
  sol_duro_dia: 'sol duro',
  golden_hour: 'golden hour',
  noite_natural: 'noite',
  flash_duro: 'flash',
  luz_colorida: 'luz colorida',
  meia_luz: 'meia luz',
}

type Step = 1 | 2 | 3
type SaveAction = 'save_and_generate' | 'save_only'

type Props = {
  open: boolean
  /** Se preenchido, edita esse preset. Se null, cria novo. */
  editingPresetId: string | null
  /** Nome inicial do preset (no modo edicao) */
  initialName?: string
  /** Brief inicial (no modo edicao ou pre-fill) */
  initialBrief: CoverBrief | null
  isOnboardingFree: boolean
  onClose: () => void
  onSave: (data: { name: string; brief: CoverBrief }, action: SaveAction) => Promise<void>
}

/**
 * Wizard de configuracao do brief (v2 -- DNA da capa IA).
 * 3 steps:
 *   1. Identidade: artista primario (+ opcional 2o) + genero primario (+ opcional 2o)
 *   2. Visual: 3 grids (quem aparece, mood, atmosfera de luz). V3 removeu cenario.
 *   3. Confirmacao: nome do brief + resumo + nota livre + CTAs
 *
 * isOnboardingFree=true mostra "Gerar 1 capa teste (gratis)" no step 3.
 *
 * ADR 2026-05-21-prompt-dna-capa-v2.md
 */
export function CapasWizard({
  open,
  editingPresetId,
  initialName,
  initialBrief,
  isOnboardingFree,
  onClose,
  onSave,
}: Props) {
  const isEditing = !!editingPresetId
  const [step, setStep] = useState<Step>(1)
  const [presetName, setPresetName] = useState('')

  // Identidade
  const [artistaPrimario, setArtistaPrimario] = useState('')
  const [artistaSecundario, setArtistaSecundario] = useState<string | null>(null)
  const [selectedArtists, setSelectedArtists] = useState<SelectedArtist[]>([])
  const [artistPickerOpen, setArtistPickerOpen] = useState(false)
  const [generoPrimario, setGeneroPrimario] = useState<string | null>(null)
  const [generoSecundario, setGeneroSecundario] = useState<string | null>(null)

  // Visual (v3 -- sem campo `cenario`, inferido do universo do artista)
  const [quemAparece, setQuemAparece] = useState<string | null>(null)
  const [mood, setMood] = useState<string | null>(null)
  const [atmosferaLuz, setAtmosferaLuz] = useState<string | null>(null)

  // Comum
  const [notaLivre, setNotaLivre] = useState('')
  const [saving, setSaving] = useState<SaveAction | null>(null)

  const dialogRef = useRef<HTMLDivElement>(null)
  const wasOpenRef = useRef(false)
  // Track se o mousedown comecou no backdrop. Evita fechar quando user
  // arrasta texto/selecao pra fora do modal (mouseup acaba no backdrop).
  const mouseDownOnBackdropRef = useRef(false)

  // Reset state SOMENTE na transicao fechado -> aberto.
  // Sem esse guard, atualizar `initialBrief` no parent durante o save
  // resetaria o wizard pro Step 1 indevidamente (bug 2026-05-21).
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current
    wasOpenRef.current = open
    if (!justOpened) return

    setStep(1)
    setPresetName(initialName ?? '')
    // Le campos v2 do brief; cai pra v1 (legacy) se preciso pra compat
    const initPrimario =
      initialBrief?.artista_primario ?? initialBrief?.artista_nome ?? ''
    const initSecundario = initialBrief?.artista_secundario ?? null
    setArtistaPrimario(initPrimario)
    setArtistaSecundario(initSecundario)
    // Rehidrata selectedArtists do brief salvo. So tem o nome (sem foto/genres),
    // entao marca como custom -- producer pode reabrir o picker pra re-selecionar
    // a versao Spotify se quiser foto e gravar a referencia.
    const rehydrated: SelectedArtist[] = []
    if (initPrimario.trim()) {
      rehydrated.push({
        id: `custom:${initPrimario.toLowerCase()}`,
        name: initPrimario,
        imageUrl: null,
        followers: 0,
        genres: [],
        custom: true,
      })
    }
    if (initSecundario && initSecundario.trim()) {
      rehydrated.push({
        id: `custom:${initSecundario.toLowerCase()}`,
        name: initSecundario,
        imageUrl: null,
        followers: 0,
        genres: [],
        custom: true,
      })
    }
    setSelectedArtists(rehydrated)
    setGeneroPrimario(initialBrief?.genero_primario ?? null)
    setGeneroSecundario(initialBrief?.genero_secundario ?? null)
    setQuemAparece(initialBrief?.quem_aparece ?? null)
    setMood(initialBrief?.mood ?? null)
    setAtmosferaLuz(initialBrief?.atmosfera_luz ?? null)
    setNotaLivre(initialBrief?.nota_livre ?? '')
    setSaving(null)
  }, [open, initialName, initialBrief])

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

  function handleArtistsConfirm(picked: SelectedArtist[]) {
    const limited = picked.slice(0, 2)
    setSelectedArtists(limited)
    setArtistaPrimario(limited[0]?.name ?? '')
    setArtistaSecundario(limited[1]?.name ?? null)
    setArtistPickerOpen(false)
  }

  function handleRemoveArtist(id: string) {
    setSelectedArtists((prev) => {
      const next = prev.filter((a) => a.id !== id)
      setArtistaPrimario(next[0]?.name ?? '')
      setArtistaSecundario(next[1]?.name ?? null)
      return next
    })
  }

  if (!open) return null

  const trimmedArtista = artistaPrimario.trim()
  const trimmedArtistaSec = (artistaSecundario ?? '').trim()
  const trimmedName = presetName.trim()
  const canAdvanceFrom1 = trimmedArtista.length > 0 && !!generoPrimario
  const canSave = trimmedArtista.length > 0 && trimmedName.length > 0 && !!generoPrimario

  async function handleSubmit(action: SaveAction) {
    if (saving || !canSave) return
    setSaving(action)
    try {
      await onSave(
        {
          name: trimmedName,
          brief: {
            genero_primario: generoPrimario,
            genero_secundario: generoSecundario,
            artista_primario: trimmedArtista,
            artista_secundario: trimmedArtistaSec || null,
            quem_aparece: quemAparece,
            mood,
            atmosfera_luz: atmosferaLuz,
            nota_livre: notaLivre.trim() || null,
          },
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
      onMouseDown={(e) => {
        mouseDownOnBackdropRef.current = e.target === e.currentTarget
      }}
      onMouseUp={(e) => {
        if (
          mouseDownOnBackdropRef.current &&
          e.target === e.currentTarget &&
          !saving
        ) {
          onClose()
        }
        mouseDownOnBackdropRef.current = false
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Configuracao do brief"
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
              {isEditing ? 'Editar brief' : 'Novo brief'}
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

        {/* CONTEUDO ROLAVEL */}
        <div className="flex-1 overflow-y-auto px-7 py-8">
          {step === 1 && (
            <Step1Identidade
              selectedArtists={selectedArtists}
              onOpenArtistPicker={() => setArtistPickerOpen(true)}
              onRemoveArtist={handleRemoveArtist}
              generoPrimario={generoPrimario}
              setGeneroPrimario={setGeneroPrimario}
              generoSecundario={generoSecundario}
              setGeneroSecundario={setGeneroSecundario}
            />
          )}
          {step === 2 && (
            <Step2Visual
              quemAparece={quemAparece}
              mood={mood}
              atmosferaLuz={atmosferaLuz}
              onPickQuem={setQuemAparece}
              onPickMood={setMood}
              onPickAtmosfera={setAtmosferaLuz}
            />
          )}
          {step === 3 && (
            <Step3Confirmacao
              presetName={presetName}
              onChangePresetName={setPresetName}
              artistaPrimario={trimmedArtista}
              artistaSecundario={trimmedArtistaSec || null}
              generoPrimario={generoPrimario}
              generoSecundario={generoSecundario}
              quemAparece={quemAparece}
              mood={mood}
              atmosferaLuz={atmosferaLuz}
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
                title={step === 1 && !canAdvanceFrom1 ? 'Preencha artista e gênero' : undefined}
              >
                Próximo
                <ArrowRight size={13} strokeWidth={2.2} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit('save_only')}
                  disabled={!!saving || !canSave}
                  className="btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
                  title={!canSave ? 'Preencha nome, artista e gênero' : undefined}
                >
                  {saving === 'save_only' && (
                    <Loader2 size={13} strokeWidth={2} className="animate-spin" />
                  )}
                  Apenas salvar
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit('save_and_generate')}
                  disabled={!!saving || !canSave}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                  title={!canSave ? 'Preencha nome, artista e gênero' : undefined}
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

      <SpotifyArtistPicker
        open={artistPickerOpen}
        onClose={() => setArtistPickerOpen(false)}
        onConfirm={handleArtistsConfirm}
        initialSelection={selectedArtists}
        maxSelect={2}
      />
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
// Step 1 — Identidade do beat (artista + genero)
// ─────────────────────────────────────────────────────────────────────
function Step1Identidade({
  selectedArtists,
  onOpenArtistPicker,
  onRemoveArtist,
  generoPrimario,
  setGeneroPrimario,
  generoSecundario,
  setGeneroSecundario,
}: {
  selectedArtists: SelectedArtist[]
  onOpenArtistPicker: () => void
  onRemoveArtist: (id: string) => void
  generoPrimario: string | null
  setGeneroPrimario: (v: string | null) => void
  generoSecundario: string | null
  setGeneroSecundario: (v: string | null) => void
}) {
  const generoSecundarioVisivel = generoSecundario !== null

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
          Step 01 · Identidade
        </p>
        <h2
          className="font-display text-[28px] font-semibold leading-tight"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.024em' }}
        >
          Qual a identidade<br />do beat?
        </h2>
        <p
          className="mt-3 max-w-md text-[13.5px] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Gênero ancora a estética visual. Artista de referência define a vibe.
          O nome real <strong style={{ color: 'var(--text-primary)' }}>nunca aparece</strong> na
          capa gerada — é só andaime pra IA.
        </p>
      </div>

      {/* ARTISTAS — picker Spotify (primario + secundario opcional, ordem visivel) */}
      <div className="space-y-2">
        <label
          className="font-mono uppercase block"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
          }}
        >
          Artistas de referência
        </label>
        <SelectedArtistsDisplay
          artists={selectedArtists}
          maxSelect={2}
          onEdit={onOpenArtistPicker}
          onRemove={onRemoveArtist}
          label="Referencias"
        />
        <p
          className="text-[11.5px]"
          style={{ color: 'var(--text-subtle)' }}
        >
          O primeiro é o artista principal; o segundo (opcional) ancora variação.
        </p>
      </div>

      {/* GENERO primario */}
      <CardGroup
        label="Gênero primário"
        options={GENERO_OPTIONS}
        value={generoPrimario}
        onPick={setGeneroPrimario}
        required
      />

      {/* GENERO secundario (opcional, exclui o primario) */}
      {!generoSecundarioVisivel && (
        <button
          type="button"
          onClick={() => setGeneroSecundario('')}
          className="font-mono uppercase inline-flex items-center gap-1.5 transition-colors"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--text-subtle)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-subtle)')}
        >
          <Plus size={11} strokeWidth={2.2} />
          adicionar 2º gênero (modulação atmosférica)
        </button>
      )}

      {generoSecundarioVisivel && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                color: 'var(--text-muted)',
              }}
            >
              Gênero secundário (camada atmosférica)
            </span>
            <button
              type="button"
              onClick={() => setGeneroSecundario(null)}
              className="text-[11.5px] underline"
              style={{ color: 'var(--text-subtle)' }}
            >
              remover
            </button>
          </div>
          <CardGroup
            label=""
            options={GENERO_OPTIONS.filter((o) => o.slug !== generoPrimario)}
            value={generoSecundario || null}
            onPick={(v) => setGeneroSecundario(v ?? '')}
            hideHeader
          />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Step 2 — Visual (3 grids: quem, mood, atmosfera de luz)
// V3 removeu cenário (inferido do universo do artista).
// ─────────────────────────────────────────────────────────────────────
function Step2Visual({
  quemAparece,
  mood,
  atmosferaLuz,
  onPickQuem,
  onPickMood,
  onPickAtmosfera,
}: {
  quemAparece: string | null
  mood: string | null
  atmosferaLuz: string | null
  onPickQuem: (v: string | null) => void
  onPickMood: (v: string | null) => void
  onPickAtmosfera: (v: string | null) => void
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
          a IA preenche o que faltar. O cenário é inferido automaticamente
          a partir do artista.
        </p>
      </div>

      <CardGroup
        label="Quem aparece"
        options={QUEM_OPTIONS}
        value={quemAparece}
        onPick={onPickQuem}
      />
      <CardGroup
        label="Mood"
        options={MOOD_OPTIONS}
        value={mood}
        onPick={onPickMood}
      />
      <CardGroup
        label="Atmosfera de luz"
        options={ATMOSFERA_LUZ_OPTIONS}
        value={atmosferaLuz}
        onPick={onPickAtmosfera}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// CardGroup -- grid responsivo de cards com label opcional
// ─────────────────────────────────────────────────────────────────────
function CardGroup({
  label,
  options,
  value,
  onPick,
  required = false,
  hideHeader = false,
}: {
  label: string
  options: Option[]
  value: string | null
  onPick: (v: string | null) => void
  required?: boolean
  hideHeader?: boolean
}) {
  return (
    <div>
      {!hideHeader && (
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
            {required && (
              <span style={{ color: 'var(--led-error)', marginLeft: 4 }}>*</span>
            )}
          </span>
          {value && !required && (
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
      )}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-6">
        {options.map((opt) => {
          const selected = value === opt.slug
          const Icon = opt.icon
          return (
            <button
              key={opt.slug}
              type="button"
              onClick={() => onPick(selected && !required ? null : opt.slug)}
              className="group/card flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg p-2 transition-all"
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
              title={opt.description}
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
              {opt.description && (
                <span
                  className="text-[9.5px] leading-tight"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  {opt.description}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Step 3 — Confirmacao
// ─────────────────────────────────────────────────────────────────────

function Step3Confirmacao({
  presetName,
  onChangePresetName,
  artistaPrimario,
  artistaSecundario,
  generoPrimario,
  generoSecundario,
  quemAparece,
  mood,
  atmosferaLuz,
  notaLivre,
  onChangeNota,
}: {
  presetName: string
  onChangePresetName: (v: string) => void
  artistaPrimario: string
  artistaSecundario: string | null
  generoPrimario: string | null
  generoSecundario: string | null
  quemAparece: string | null
  mood: string | null
  atmosferaLuz: string | null
  notaLivre: string
  onChangeNota: (v: string) => void
}) {
  // Linha 1: identidade (artista(s) + genero(s))
  const identidadeTokens: string[] = []
  if (artistaPrimario) identidadeTokens.push(artistaPrimario)
  if (artistaSecundario) identidadeTokens.push(`+ ${artistaSecundario}`)
  if (generoPrimario && DISPLAY_PT[generoPrimario]) identidadeTokens.push(DISPLAY_PT[generoPrimario])
  if (generoSecundario && DISPLAY_PT[generoSecundario]) {
    identidadeTokens.push(`+ ${DISPLAY_PT[generoSecundario]}`)
  }

  // Linha 2: visual (quem + mood + luz) -- cenario removido na v3
  const visualTokens: string[] = []
  if (quemAparece && DISPLAY_PT[quemAparece]) visualTokens.push(DISPLAY_PT[quemAparece])
  if (mood && DISPLAY_PT[mood]) visualTokens.push(DISPLAY_PT[mood])
  if (atmosferaLuz && DISPLAY_PT[atmosferaLuz]) visualTokens.push(DISPLAY_PT[atmosferaLuz])

  // Sugestao de nome baseada em artista + mood
  const namePlaceholder = artistaPrimario
    ? `Ex: ${artistaPrimario} ${mood ? DISPLAY_PT[mood] ?? '' : ''}`.trim()
    : 'Ex: Drake noite, Lil Baby hood, Carti rage…'

  return (
    <div className="space-y-6">
      <div>
        <p
          className="font-mono uppercase mb-3"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-subtle)',
          }}
        >
          Step 03 · Nome e confirmação
        </p>
        <h2
          className="font-display text-[24px] font-semibold leading-tight"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.022em' }}
        >
          Como vai chamar esse brief?
        </h2>
        <p
          className="mt-2 max-w-md text-[13px] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Dê um nome curto pra reconhecer depois. Você pode ter vários briefs
          salvos e trocar entre eles pelo header.
        </p>
      </div>

      {/* Campo nome (obrigatorio) */}
      <div className="space-y-2">
        <label
          className="font-mono uppercase block"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
          }}
          htmlFor="wizard-preset-name"
        >
          Nome do brief <span style={{ color: 'var(--led-error)' }}>*</span>
        </label>
        <input
          id="wizard-preset-name"
          type="text"
          value={presetName}
          onChange={(e) => onChangePresetName(e.target.value)}
          placeholder={namePlaceholder}
          className="field-input"
          style={{ fontSize: 15 }}
          maxLength={60}
        />
        <p className="text-[11.5px]" style={{ color: 'var(--text-subtle)' }}>
          {presetName.length}/60 caracteres
        </p>
      </div>

      {/* Resumo: identidade + visual em 2 blocos */}
      <div className="space-y-3">
        <span
          className="font-mono uppercase block"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
          }}
        >
          Resumo do brief
        </span>
        <div
          className="space-y-3 rounded-xl px-5 py-4"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <SummaryLine label="Identidade" tokens={identidadeTokens} />
          {visualTokens.length > 0 && (
            <SummaryLine label="Visual" tokens={visualTokens} muted />
          )}
        </div>
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
          maxLength={280}
          className="field-input resize-none"
          style={{ fontSize: 14 }}
        />
        <p
          className="text-[11.5px]"
          style={{ color: 'var(--text-subtle)' }}
        >
          Detalhes específicos que não cabem nos cards. {notaLivre.length}/280
        </p>
      </div>
    </div>
  )
}

function SummaryLine({
  label,
  tokens,
  muted = false,
}: {
  label: string
  tokens: string[]
  muted?: boolean
}) {
  return (
    <div>
      <span
        className="font-mono uppercase block mb-1"
        style={{
          fontSize: 9.5,
          letterSpacing: '0.18em',
          color: 'var(--text-subtle)',
        }}
      >
        {label}
      </span>
      <p
        className={muted ? 'text-[14px] leading-snug' : 'font-display text-[18px] font-semibold leading-snug'}
        style={{
          color: muted ? 'var(--text-secondary)' : 'var(--text-primary)',
          letterSpacing: muted ? '-0.005em' : '-0.018em',
        }}
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
  )
}
