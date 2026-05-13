import { UploadForm } from '@/components/UploadForm'
import { Info } from 'lucide-react'

export const metadata = {
  title: 'Upload — BeatPost',
}

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Novo beat</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
        Envie seu beat e a IA vai gerar título, descrição e tags prontos para o YouTube.
      </p>

      <div
        className="mt-4 flex items-start gap-3 rounded-lg border px-4 py-3"
        style={{ borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.06)' }}
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#f59e0b' }} />
        <p className="text-sm" style={{ color: 'rgba(253,230,138,0.85)' }}>
          <span className="font-semibold" style={{ color: '#fcd34d' }}>Envie somente MP3</span> com a sua tag de
          produtor já gravada no áudio — ex:{' '}
          <span className="italic">"prod. SeuNome"</span> nos primeiros e últimos segundos. Isso
          protege seu beat no YouTube e impede que artistas removam o crédito.
        </p>
      </div>

      <div
        className="mt-6 rounded-xl border p-8"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <UploadForm />
      </div>
    </div>
  )
}
