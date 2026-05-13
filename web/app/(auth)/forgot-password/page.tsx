import { ForgotPasswordForm } from '@/components/ForgotPasswordForm'

export const metadata = {
  title: 'Recuperar senha — BeatPost',
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Recuperar senha</h1>
          <p className="mt-2 text-sm text-zinc-400">Vamos te enviar um link no e-mail</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
