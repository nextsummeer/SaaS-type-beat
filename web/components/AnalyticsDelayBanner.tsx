import { Info } from 'lucide-react'

export function AnalyticsDelayBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3"
      style={{
        background: 'rgba(59,130,246,0.06)',
        border: '1px solid rgba(59,130,246,0.18)',
      }}
    >
      <Info className="h-4 w-4 shrink-0" style={{ color: '#60a5fa' }} />
      <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        O YouTube Analytics atualiza com <strong>delay de 24-48h</strong>. Views muito recentes
        podem ainda não estar contadas aqui. Você consegue ver tudo em tempo real direto no{' '}
        <a
          href="https://studio.youtube.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          YouTube Studio
        </a>
        .
      </p>
    </div>
  )
}
