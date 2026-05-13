import { UploadForm } from '@/components/UploadForm'
import { ShieldCheck, Zap, Music2, FileAudio2 } from 'lucide-react'

export const metadata = {
  title: 'Upload — BeatPost',
}

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Hero */}
      <div className="rise rise-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="led led-pulse" style={{ color: 'var(--accent)' }} />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
            upload · step 01 / 05
          </span>
        </div>
        <h1
          className="font-display text-[40px] font-semibold leading-[1.05] tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          Novo beat<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Envie seu MP3 e a IA monta título, descrição, tags e capa em menos de 2 minutos.
          Você revisa e publica direto no YouTube.
        </p>
      </div>

      {/* Pipeline preview */}
      <div className="rise rise-2 mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-subtle)' }}>
        <span style={{ color: 'var(--accent)' }}>upload</span>
        <span>→</span>
        <span>convert</span>
        <span>→</span>
        <span>analyze</span>
        <span>→</span>
        <span>generate</span>
        <span>→</span>
        <span>publish</span>
      </div>

      {/* Aviso da tag */}
      <div
        className="rise rise-3 relative mt-6 flex items-start gap-3 overflow-hidden rounded-xl px-5 py-4"
        style={{
          background: 'linear-gradient(135deg, rgba(255,90,31,0.08), rgba(255,90,31,0.02))',
          border: '1px solid rgba(255,90,31,0.22)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full"
          style={{ background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)', opacity: 0.4 }}
        />
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(255,90,31,0.3)' }}>
          <ShieldCheck className="h-4 w-4" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="relative flex-1">
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Grave sua tag de produtor no áudio antes de subir
          </p>
          <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Ex: <span className="chip-tech" style={{ color: 'var(--text-secondary)' }}>&ldquo;prod. SeuNome&rdquo;</span> nos primeiros e últimos segundos.
            Isso impede artistas removerem o crédito depois de baixar o beat do YouTube.
          </p>
        </div>
      </div>

      {/* Form wrapper */}
      <div
        className="rise rise-4 relative mt-6 overflow-hidden rounded-2xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Faixa superior decorativa */}
        <div
          className="flex items-center gap-3 border-b px-6 py-3"
          style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-base)' }}
        >
          <FileAudio2 size={14} style={{ color: 'var(--accent)' }} />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
            input · MP3 stereo · até 50MB
          </span>
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-subtle)' }}>
            <Zap size={10} style={{ color: 'var(--accent)' }} />
            ia ready
          </span>
        </div>

        <div className="p-8">
          <UploadForm />
        </div>
      </div>

      {/* Selo de confiança */}
      <p className="rise rise-5 mt-6 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-subtle)' }}>
        <Music2 size={11} />
        seu áudio nunca é treinado em nenhuma ia · 100% privado
      </p>
    </div>
  )
}
