import { WebGLShader } from '@/components/WebGLShader'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black">
      <WebGLShader />
      <div
        className="flex min-h-screen items-center justify-center px-4 py-8"
        style={{ position: 'relative', zIndex: 10 }}
      >
        {children}
      </div>
    </div>
  )
}
