'use client'

/**
 * Modal de upload de capa manual (T4.35 bloco 2 + T4.36 bulk upload).
 *
 * Modos:
 *   SINGLE (1 arquivo selecionado):
 *     choose -> crop interativo (react-easy-crop) -> uploading
 *   BULK (2+ arquivos):
 *     choose -> bulk_uploading (crop AUTOMATICO center-square, sequencial)
 *              -> bulk_done (resumo)
 *
 * Crop bulk: center-square (pega o menor lado, centraliza). Funciona bem
 * pra capas ja quadradas. Capas verticais perdem topo/baixo -- aceitavel
 * pro use case "subir banco em massa", produtor apaga depois se ficar ruim.
 *
 * Output: JPG 1024x1024 (qualidade YouTube), gerado client-side via canvas.
 *
 * Quota cheia (402): mostra mensagem amigavel. Em bulk, trunca a lista
 * pros slots disponiveis ANTES de subir e mostra quantas foram ignoradas.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import {
  AlertCircle,
  Check,
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

type Phase = 'choose' | 'crop' | 'uploading' | 'bulk_uploading' | 'bulk_done'

type BulkItemStatus = 'pending' | 'uploading' | 'success' | 'failed'

interface BulkItem {
  file: File
  status: BulkItemStatus
  error?: string
  coverId?: string
}

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

  // T4.36 — bulk upload
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([])
  /** Quantos arquivos foram ignorados por excederem a quota antes do loop */
  const [bulkSkipped, setBulkSkipped] = useState(0)

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
      setBulkItems([])
      setBulkSkipped(0)
    } else {
      // Cleanup object URL na desmontagem
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [open])

  // ESC fecha (exceto durante upload em progresso)
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && phase !== 'uploading' && phase !== 'bulk_uploading') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, phase, onClose])

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  // ─────────────────────────────────────────────────────────────────
  // Entrada de arquivos -- decide single (crop interativo) ou bulk
  // ─────────────────────────────────────────────────────────────────
  function handleFiles(fileList: FileList | null) {
    setErro(null)
    if (!fileList || fileList.length === 0) return

    const valid: File[] = []
    const invalidNames: string[] = []
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList.item(i)
      if (!f) continue
      if (!ACCEPTED_TYPES.includes(f.type)) {
        invalidNames.push(f.name)
        continue
      }
      if (f.size > MAX_BYTES) {
        invalidNames.push(`${f.name} (>5MB)`)
        continue
      }
      valid.push(f)
    }

    if (invalidNames.length > 0 && valid.length === 0) {
      setErro(`Arquivo(s) inválido(s): ${invalidNames.join(', ')}. Use JPG/PNG até 5MB.`)
      return
    }

    if (valid.length === 1) {
      // Single: fluxo crop interativo
      const file = valid[0]
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      setImageSrc(url)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setPhase('crop')
      return
    }

    // Bulk: trunca pra quota disponivel + crop automatico center-square
    const remaining = limit?.remaining ?? valid.length
    const toProcess = valid.slice(0, remaining)
    const skipped = valid.length - toProcess.length + invalidNames.length

    setBulkItems(
      toProcess.map((file) => ({ file, status: 'pending' })),
    )
    setBulkSkipped(skipped)
    setPhase('bulk_uploading')
    void processBulkUpload(toProcess)
  }

  async function processBulkUpload(files: File[]) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      setErro('Sessão expirada')
      setPhase('bulk_done')
      return
    }

    // Loop sequencial -- evita pico de RAM (cada imagem cropada vira blob na memoria)
    // e da feedback visual ordenado no progress.
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      // Marca essa como uploading
      setBulkItems((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: 'uploading' } : item,
        ),
      )

      try {
        const blob = await fileToCenterSquareBlob(file)
        const result = await uploadManualCover(token, blob, file.name)
        setBulkItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? { ...item, status: 'success', coverId: result.id }
              : item,
          ),
        )
      } catch (err) {
        // Quota cheia no meio (outra aba subiu, por ex): para o lote
        if (err instanceof ManualQuotaExceededError) {
          setBulkItems((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? { ...item, status: 'failed', error: 'Limite atingido' }
                : idx > i
                ? { ...item, status: 'failed', error: 'Cancelado por limite' }
                : item,
            ),
          )
          break
        }
        setBulkItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: 'failed',
                  error: err instanceof Error ? err.message : 'Erro',
                }
              : item,
          ),
        )
      }
    }

    setPhase('bulk_done')
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  function handleBulkDoneClose() {
    // Mesmo que algumas tenham falhado, caller recarrega tudo via onUploaded
    const firstSuccess = bulkItems.find((it) => it.status === 'success')
    if (firstSuccess && firstSuccess.coverId) {
      onUploaded({ id: firstSuccess.coverId, image_url: '' })
    } else {
      onClose()
    }
  }

  if (!open) return null

  const bulkTotal = bulkItems.length
  const bulkDone = bulkItems.filter(
    (it) => it.status === 'success' || it.status === 'failed',
  ).length
  const bulkSuccess = bulkItems.filter((it) => it.status === 'success').length
  const bulkFailed = bulkItems.filter((it) => it.status === 'failed').length

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center px-4 py-6 sm:px-6 sm:py-10"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => {
        if (
          e.target === e.currentTarget &&
          phase !== 'uploading' &&
          phase !== 'bulk_uploading'
        ) {
          onClose()
        }
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
              {phase === 'bulk_uploading' || phase === 'bulk_done'
                ? 'Upload em massa'
                : 'Upload manual'}
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
            onClick={() => {
              if (phase === 'uploading' || phase === 'bulk_uploading') return
              if (phase === 'bulk_done') {
                handleBulkDoneClose()
                return
              }
              onClose()
            }}
            disabled={phase === 'uploading' || phase === 'bulk_uploading'}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              if (phase !== 'uploading' && phase !== 'bulk_uploading') {
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
                    {dragOver
                      ? 'Solte aqui'
                      : 'Arraste ou clique para escolher'}
                  </p>
                  <p
                    className="text-[12px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    1 arquivo: você ajusta o corte · 2+ arquivos: corte
                    automático em quadrado
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    JPG ou PNG · até 5 MB cada
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

          {(phase === 'bulk_uploading' || phase === 'bulk_done') && (
            <div className="space-y-4 px-5 py-5">
              {/* Progress header */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span
                    className="font-mono uppercase"
                    style={{
                      fontSize: 10.5,
                      letterSpacing: '0.22em',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {phase === 'bulk_done' ? 'Concluído' : 'Enviando'}
                  </span>
                  <span
                    className="font-mono tabular"
                    style={{
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                    }}
                  >
                    {bulkDone}/{bulkTotal}
                  </span>
                </div>
                {/* Progress bar */}
                <div
                  className="h-1 w-full overflow-hidden rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${bulkTotal > 0 ? (bulkDone / bulkTotal) * 100 : 0}%`,
                      background: 'var(--purple-light)',
                    }}
                  />
                </div>
              </div>

              {bulkSkipped > 0 && phase === 'bulk_done' && (
                <div
                  className="rounded-md px-3 py-2.5 text-[12px]"
                  style={{
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    color: '#FCD34D',
                  }}
                >
                  <strong>{bulkSkipped}</strong> arquivo
                  {bulkSkipped === 1 ? '' : 's'} ignorado
                  {bulkSkipped === 1 ? '' : 's'} (limite do plano ou formato
                  inválido).
                </div>
              )}

              {/* Lista compacta dos itens */}
              <div
                className="space-y-1 overflow-y-auto"
                style={{ maxHeight: 'min(50vh, 360px)' }}
              >
                {bulkItems.map((item, idx) => (
                  <BulkRow key={idx} item={item} />
                ))}
              </div>

              {phase === 'bulk_done' && (
                <div
                  className="flex items-center justify-between gap-3 border-t pt-4"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div
                    className="text-[12px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span style={{ color: 'var(--led-success)', fontWeight: 500 }}>
                      {bulkSuccess}
                    </span>{' '}
                    enviada{bulkSuccess === 1 ? '' : 's'}
                    {bulkFailed > 0 && (
                      <>
                        {' · '}
                        <span style={{ color: 'var(--led-error)', fontWeight: 500 }}>
                          {bulkFailed}
                        </span>{' '}
                        falha{bulkFailed === 1 ? '' : 's'}
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleBulkDoneClose}
                    className="btn-primary"
                  >
                    <Check size={13} strokeWidth={2.4} />
                    Fechar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────

function BulkRow({ item }: { item: BulkItem }) {
  const isSuccess = item.status === 'success'
  const isFailed = item.status === 'failed'
  const isUploading = item.status === 'uploading'

  return (
    <div
      className="flex items-center gap-3 rounded-md px-3 py-2"
      style={{
        background: isSuccess
          ? 'rgba(74,222,128,0.04)'
          : isFailed
          ? 'rgba(248,113,113,0.04)'
          : 'rgba(255,255,255,0.02)',
        border: '1px solid',
        borderColor: isSuccess
          ? 'rgba(74,222,128,0.20)'
          : isFailed
          ? 'rgba(248,113,113,0.20)'
          : 'var(--border-subtle)',
      }}
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
        {isUploading && (
          <Loader2
            size={13}
            className="animate-spin"
            style={{ color: 'var(--purple-light)' }}
          />
        )}
        {isSuccess && (
          <Check size={13} strokeWidth={2.6} style={{ color: 'var(--led-success)' }} />
        )}
        {isFailed && (
          <X size={13} strokeWidth={2.6} style={{ color: 'var(--led-error)' }} />
        )}
        {item.status === 'pending' && (
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--text-subtle)' }}
          />
        )}
      </div>
      <span
        className="flex-1 truncate text-[12px]"
        style={{
          color: isFailed ? 'var(--text-muted)' : 'var(--text-primary)',
        }}
      >
        {item.file.name}
      </span>
      {isFailed && item.error && (
        <span
          className="shrink-0 text-[11px]"
          style={{ color: 'var(--led-error)' }}
        >
          {item.error}
        </span>
      )}
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
// Helpers de canvas (single + bulk reusam getCroppedJpegBlob)
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

/** T4.36 — crop automático center-square pra bulk upload.
 *  Pega o menor lado, centraliza, e o getCroppedJpegBlob redimensiona pra 1024.
 *  Capa quadrada original: zero perda. Capa retangular: corta as bordas. */
async function fileToCenterSquareBlob(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    const size = Math.min(image.naturalWidth, image.naturalHeight)
    const area: Area = {
      x: (image.naturalWidth - size) / 2,
      y: (image.naturalHeight - size) / 2,
      width: size,
      height: size,
    }
    return await getCroppedJpegBlob(url, area)
  } finally {
    URL.revokeObjectURL(url)
  }
}
