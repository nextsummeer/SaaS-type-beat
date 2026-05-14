import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="app-shell [--header-height:calc(--spacing(14))]"
      style={{ background: 'var(--bg-base)' }}
    >
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset className="relative z-10" style={{ background: 'var(--bg-base)' }}>
            <div className="mx-auto w-full max-w-6xl px-6 py-8 md:px-8">
              {children}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
