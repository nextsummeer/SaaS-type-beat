import { ResetPasswordForm } from '@/components/ResetPasswordForm'

export const metadata = {
  title: 'Nova senha — BeatPost',
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Nova senha</h1>
          <p className="mt-2 text-sm text-zinc-400">Defina a senha que você vai usar de agora em diante</p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  )
}
