import { UploadForm } from '@/components/UploadForm'
import { Info } from 'lucide-react'

export const metadata = {
  title: 'Upload — BeatPost',
}

export default function UploadPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Novo beat</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Envie seu beat e a IA vai gerar títulos, descrição e tags prontos para o YouTube.
      </p>

      <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-sm text-amber-200/80">
          <span className="font-semibold text-amber-300">Envie somente MP3</span> com a sua tag de
          produtor já gravada no áudio — ex:{' '}
          <span className="italic">"prod. SeuNome"</span> nos primeiros e últimos segundos. Isso
          protege seu beat no YouTube e impede que artistas removam o crédito.
        </p>
      </div>

      <div className="mt-8">
        <UploadForm />
      </div>
    </div>
  )
}
