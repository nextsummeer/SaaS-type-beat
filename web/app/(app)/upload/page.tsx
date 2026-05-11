import { UploadForm } from '@/components/UploadForm'

export const metadata = {
  title: 'Upload — BeatPost',
}

export default function UploadPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Novo beat</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Envie seu áudio e o pipeline de IA cuidará do resto.
      </p>

      <div className="mt-8">
        <UploadForm />
      </div>
    </div>
  )
}
