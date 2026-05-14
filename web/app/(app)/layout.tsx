import { Sidebar } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell flex h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
