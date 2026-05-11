import { healthCheck } from '@/lib/api'

export default async function DashboardPage() {
  const api = await healthCheck()

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <p className="mt-2 text-zinc-400">Seus beats vão aparecer aqui.</p>

      <div className="mt-8 inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm">
        <span className={`h-2 w-2 rounded-full ${api.ok ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-zinc-400">
          API: {api.ok ? `OK${api.version ? ` v${api.version}` : ''}` : 'offline'}
        </span>
      </div>
    </div>
  )
}
