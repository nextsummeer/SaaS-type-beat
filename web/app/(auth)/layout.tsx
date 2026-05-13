import { VideoBackground } from '@/components/VideoBackground'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black">
      <VideoBackground src="/auth-bg.mp4" overlayOpacity={0.55} />
      <div
        className="flex min-h-screen items-center justify-center px-4 py-8"
        style={{ position: 'relative', zIndex: 10 }}
      >
        {children}
      </div>
    </div>
  )
}
