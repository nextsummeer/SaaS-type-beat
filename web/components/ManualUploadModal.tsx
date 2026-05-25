'use client'

/**
 * Modal de upload de capa manual (T4.35 bloco 2).
 *
 * 3 fases:
 *   1. choose:    drag-and-drop OU click pra escolher arquivo
 *   2. crop:      mostra react-easy-crop pra ajustar area quadrada + zoom
 *   3. uploading: spinner enquanto faz POST /covers/manual_upload
 *
 * Output: JPG 1024x1024 (qualidade YouTube), gerado client-side via canvas.
 * Quota cheia (402): mostra mensagem especifica de upgrade em vez de erro generico.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import {
  AlertCircle,
  ImageIcon,
  Loader2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  ManualQuotaExceededError,
  uploadManualCover,
  type ManualLimitState,
} from '@/lib/api'

const MAX_BYTES = 5 * 1024 * 1024
const OUTPUT_SIZE = 1024 // 1024x1024 final
const OUTPUT_QUALITY = 0.92 // JPEG quality
const ACCEPTED_TYPES = ['image/jpeg', 'image/png']

type Phase = 'choose' | 'crop' | 'uploading'

interface Props {
  open: boolean
  /** Estado atual da quota (usado pra mostrar contador no header) */
  limit: ManualLimitState | null
  onClose: () => void
  /** Chamado apos upload OK -- caller faz loadData() e fecha modal */
  onUploaded: (result: { id: string; image_url: string }) => void
}

export function ManualUploadModal({ open, limit, onClose, onUploaded }: Props) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  const [phase, setPhase] = useState<Phase>('choose')
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  /** Quando 402 chega -- mostra mensagem de upgrade em vez do erro generico */
  const [quotaExceeded, setQuotaExceeded] = useState<{
    used: number
    limit: number
  } | null>(null)

  // Reset quando abre/fecha
  useEffect(() => {
    if (open) {
      setPhase('choose')
      setImageSrc(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      setErro(null)
      setQuotaExceeded(null)
    } else {
      // Cleanup object URL na desmontagem
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [open])

  // ESC fecha
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && phase !== 'uploading') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, phase, onClose])

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  function handleFile(file: File | null) {
    setErro(null)
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErro('Formato inválido. Use JPG ou PNG.')
      return
    }
    if (file.size > MAX_BYTES) {
      setErro(`Arquivo muito grande (${Math.round(file.size / 1024)} KB). Limite: 5 MB.`)
      return
    }
    // Cleanup URL anterior se houver
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setImageSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setPhase('crop')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0] ?? null
    handleFile(file)
  }

  async function handleConfirmCrop() {
    if (!imageSrc || !croppedAreaPixels) return
    setErro(null)
    setQuotaExceeded(null)
    setPhase('uploading')
    try {
      const blob = await getCroppedJpegBlob(imageSrc, croppedAreaPixels)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Sessão expirada')

      const result = await uploadManualCover(token, blob, 'cover.jpg')
      onUploaded({ id: result.id, image_url: result.image_url })
    } catch (err) {
      if (err instanceof ManualQuotaExceededError) {
        setQuotaExceeded({ used: err.used, limit: err.limit })
        setPhase('crop')
      } else {
        setErro(err instanceof Error ? err.message : 'Erro ao subir capa')
        setPhase('crop')
      }
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center px-4 py-6 sm:px-6 sm:py-10"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== 'uploading') onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Upload de capa manual"
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium, var(--border-subtle))',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          maxHeight: 'calc(100vh - 4rem)',
        }}
      >
        {/* HEADER */}
        <header
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: '0.22em',
                color: 'var(--text-secondary)',
              }}
            >
              Upload manual
            </span>
            {limit && (
              <span
                className="font-mono tabular"
                style={{
                  fontSize: 10.5,
                  color: 'var(--text-subtle)',
                  letterSpacing: '0.12em',
                }}
              >
                {limit.used}/{limit.limit}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => phase !== 'uploading' && onClose()}
            disabled={phase === 'uploading'}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              if (phase !== 'uploading') {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </header>

        {/* BODY */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {phase === 'choose' && (
            <div className="p-6">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className="flex w-full flex-col items-center gap-4 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-all"
                style={{
                  borderColor: dragOver ? '#FFFFFF' : 'var(--border-medium)',
                  background: dragOver
                    ? 'rgba(255,255,255,0.04)'
                    : 'var(--bg-base)',
                }}
              >
                <ImageIcon
                  className="h-8 w-8"
                  style={{
                    color: dragOver ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                />
                <div className="space-y-1">
                  <p
                    className="font-mono uppercase"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: '0.18em',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {dragOver ? 'Solte aqui' : 'Arraste ou clique para escolher'}
                  </p>
                  <p
                    className="text-[12px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    JPG ou PNG · até 5 MB · será cortado em quadrado
                  </p>
                </div>
              </button>

              {erro && <InlineError message={erro} />}
            </div>
          )}

          {phase === 'crop' && imageSrc && (
            <>
              <div
                className="relative w-full"
                style={{
                  background: 'var(--bg-base)',
                  aspectRatio: '1 / 1',
                  maxHeight: '60vh',
                }}
              >
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  showGrid
                  objectFit="contain"
                  style={{
                    containerStyle: {
                      background: 'var(--bg-base)',
                    },
                  }}
                />
              </div>

              {/* Controle de zoom */}
              <div
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <ZoomOut size={14} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-purple-400"
                />
                <ZoomIn size={14} style={{ color: 'var(--text-muted)' }} />
              </div>

              <div className="space-y-3 px-5 pb-5">
                {quotaExceeded && (
                  <QuotaExceeded
                    used={quotaExceeded.used}
                    limit={quotaExceeded.limit}
                  />
                )}
                {erro && <InlineError message={erro} />}

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPhase('choose')
                      setImageSrc(null)
                      if (objectUrlRef.current) {
                        URL.revokeObjectURL(objectUrlRef.current)
                        objectUrlRef.current = null
                      }
                    }}
                    className="rounded-md px-3 py-2 text-[12px] font-mono uppercase transition-colors"
                    style={{
                      letterSpacing: '0.18em',
                      color: 'var(--text-muted)',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = 'var(--text-primary)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = 'var(--text-muted)')
                    }
                  >
                    Outra imagem
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCrop}
                    disabled={!croppedAreaPixels || !!quotaExceeded}
                    className="btn-primary"
                  >
                    <Upload size={13} strokeWidth={2.2} />
                    Enviar capa
                  </button>
                </div>
              </div>
            </>
          )}

          {phase === 'uploading' && (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
              <Loader2
                className="h-8 w-8 animate-spin"
                style={{ color: 'var(--purple-light)' }}
              />
              <p
                className="font-mono uppercase"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.22em',
                  color: 'var(--text-muted)',
                }}
              >
                Enviando capa...
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  )
}

function InlineError({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-[12px]"
      style={{
        background: 'rgba(248,113,113,0.06)',
        border: '1px solid rgba(248,113,113,0.20)',
        color: '#FCA5A5',
      }}
    >
      <AlertCircle size={13} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function QuotaExceeded({ used, limit }: { used: number; limit: number }) {
  return (
    <div
      className="rounded-lg px-3.5 py-3"
      style={{
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.25)',
      }}
    >
      <p
        className="font-mono uppercase mb-1"
        style={{
          fontSize: 10,
          letterSpacing: '0.20em',
          color: '#FCD34D',
        }}
      >
        Limite atingido
      </p>
      <p
        className="text-[12.5px] leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        Você já tem <strong>{used}/{limit}</strong> capas manuais no seu plano.
        Apague uma capa antiga em "Enviadas" ou faça upgrade pra continuar.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Helper: gera Blob JPEG 1024x1024 a partir da area cropada
// ─────────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = src
  })
}

async function getCroppedJpegBlob(
  imageSrc: string,
  pixelCrop: Area,
): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context indisponível')

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Falha ao gerar blob da capa'))
      },
      'image/jpeg',
      OUTPUT_QUALITY,
    )
  })
}
