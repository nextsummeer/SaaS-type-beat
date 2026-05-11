import { LoginForm } from '@/components/LoginForm'

export const metadata = {
  title: 'Entrar — BeatPost',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">BeatPost</h1>
          <p className="mt-2 text-sm text-zinc-400">Automatize seus uploads de type beat</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
