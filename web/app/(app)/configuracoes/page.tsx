'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Loader2,
  Save,
  CheckCircle2,
  Tv2,
  AlertCircle,
  LinkIcon,
  Unplug,
  Calendar,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchYoutubeAccount,
  disconnectYoutubeAccount,
  getYoutubeAuthUrl,
  type YoutubeAccount,
} from '@/lib/api'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface Profile {
  nome: string | null
  instagram: string | null
  email_contato: string | null
}

function sanitizeInstagramHandle(input: string): string {
  let v = input.trim()
  const urlMatch = v.match(/instagram\.com\/([^\/\?#]+)/i)
  if (urlMatch) v = urlMatch[1]
  return v.replace(/[^a-zA-Z0-9._]/g, '')
}

function formataData(iso: string | null): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

const OAUTH_ERROR_LABELS: Record<string, string> = {
  access_denied: 'Você cancelou a autorização no Google.',
  missing_params: 'O Google não retornou os parâmetros esperados.',
  invalid_state: 'A sessão expirou. Tente conectar de novo.',
  token_exchange_failed: 'O Google rejeitou a autorização. Verifique se o consentimento foi concedido.',
  no_refresh_token: 'O Google não enviou refresh_token. Revogue o acesso em myaccount.google.com e tente de novo.',
  no_channel: 'Não encontramos um canal vinculado a essa conta Google.',
  save_failed: 'Falha ao salvar o canal no banco. Tente de novo em alguns segundos.',
}

function ConfiguracoesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [nome, setNome] = useState('')
  const [instagram, setInstagram] = useState('')
  const [emailContato, setEmailContato] = useState('')
  const [loadingPerfil, setLoadingPerfil] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [perfilError, setPerfilError] = useState<string | null>(null)

  const [account, setAccount] = useState<YoutubeAccount | null>(null)
  const [loadingCanal, setLoadingCanal] = useState(true)
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [oauthSuccess, setOauthSuccess] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [confirmandoDisconnect, setConfirmandoDisconnect] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    const connected = searchParams.get('connected')
    if (connected === '1') {
      setOauthSuccess('Canal conectado com sucesso!')
      router.replace('/configuracoes')
    } else if (connected === 'error') {
      const detail = searchParams.get('detail') ?? 'unknown'
      setOauthError(OAUTH_ERROR_LABELS[detail] ?? `Falha ao conectar (${detail}).`)
      router.replace('/configuracoes')
    }
  }, [searchParams, router])

  useEffect(() => {
    let cancelado = false
    async function carrega() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('nome, instagram, email_contato')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (!cancelado && data) {
          setNome(data.nome ?? '')
          setInstagram(sanitizeInstagramHandle(data.instagram ?? ''))
          setEmailContato(data.email_contato ?? '')
        }
      } catch (e) {
        if (!cancelado) setPerfilError(e instanceof Error ? e.message : 'Erro ao carregar perfil')
      } finally {
        if (!cancelado) setLoadingPerfil(false)
      }

      try {
        const data = await fetchYoutubeAccount(session.access_token)
        if (!cancelado) setAccount(data)
      } catch (e) {
        if (!cancelado) setOauthError(e instanceof Error ? e.message : 'Erro ao carregar canal')
      } finally {
        if (!cancelado) setLoadingCanal(false)
      }
    }
    carrega()
    return () => { cancelado = true }
  }, [])

  async function handleSavePerfil(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setPerfilError(null)
    setSavedOk(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada')

      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(
          { user_id: user.id, nome: nome.trim() || null, instagram: sanitizeInstagramHandle(instagram) || null, email_contato: emailContato.trim() || null },
          { onConflict: 'user_id' },
        )

      if (upsertError) throw new Error(upsertError.message)
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
    } catch (e) {
      setPerfilError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleConectar() {
    setConnecting(true)
    setOauthError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      window.location.href = getYoutubeAuthUrl(session.access_token)
    } catch (e) {
      setOauthError(e instanceof Error ? e.message : 'Erro ao iniciar conexão')
      setConnecting(false)
    }
  }

  async function handleDesconectar() {
    setDisconnecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      await disconnectYoutubeAccount(session.access_token)
      setAccount(null)
      setOauthSuccess('Canal desconectado.')
      setConfirmandoDisconnect(false)
    } catch (e) {
      setOauthError(e instanceof Error ? e.message : 'Erro ao desconectar')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <>
      <div className="max-w-2xl space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Seu perfil e a conexão com o YouTube em um só lugar.
          </p>
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Perfil</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Esses dados aparecem automaticamente na descrição dos seus vídeos.
            </p>
          </div>

          {loadingPerfil ? (
            <div className="flex items-center gap-3 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Carregando perfil...</span>
            </div>
          ) : (
            <form onSubmit={handleSavePerfil} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Nome artístico / tag de produtor
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: prod. Zestro"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Email de contato
                </label>
                <input
                  type="email"
                  value={emailContato}
                  onChange={(e) => setEmailContato(e.target.value)}
                  placeholder="Ex: contato@seusite.com"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Instagram
                </label>
                <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500">
                  <span className="pl-4 text-sm text-zinc-500">@</span>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(sanitizeInstagramHandle(e.target.value))}
                    placeholder="seuinstagram"
                    className="flex-1 bg-transparent py-3 pr-4 text-sm text-white placeholder-zinc-600 outline-none"
                  />
                </div>
              </div>

              {perfilError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                  {perfilError}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                {savedOk ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Salvo!
                  </>
                ) : saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar
                  </>
                )}
              </button>
            </form>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Canal do YouTube</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Conecte seu canal pra publicarmos os beats automaticamente no horário agendado.
            </p>
          </div>

          {oauthSuccess && (
            <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-400">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{oauthSuccess}</span>
            </div>
          )}

          {oauthError && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{oauthError}</span>
            </div>
          )}

          {loadingCanal ? (
            <div className="flex items-center gap-3 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Carregando canal...</span>
            </div>
          ) : account ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                  <Tv2 className="h-6 w-6 text-zinc-400" />
                </div>
                <div className="flex-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                    </span>
                    Conectado
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-white">{account.channel_title}</h3>
                  <p className="mt-1 text-xs text-zinc-500">ID: {account.channel_id}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400">
                    <Calendar className="h-3 w-3" />
                    <span>Conectado em {formataData(account.connected_at)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 border-t border-zinc-800 pt-4">
                <button
                  type="button"
                  onClick={() => setConfirmandoDisconnect(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Unplug className="h-4 w-4" />
                  Desconectar canal
                </button>
                <button
                  type="button"
                  onClick={handleConectar}
                  disabled={connecting}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                  Reconectar
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                  <Tv2 className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">Conecte seu canal do YouTube</h3>
                <p className="mt-2 max-w-md text-sm text-zinc-400">
                  Você será redirecionado pro Google pra autorizar o BeatPost a publicar vídeos no seu canal.
                  A gente só pede a permissão de upload — não lê nem altera nada do seu canal.
                </p>
                <button
                  type="button"
                  onClick={handleConectar}
                  disabled={connecting}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Redirecionando...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4" />
                      Conectar canal
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-500">
            <p className="font-medium text-zinc-400">Sobre a permissão solicitada</p>
            <p className="mt-1">
              Pedimos apenas o escopo <code className="rounded bg-zinc-800 px-1 text-zinc-300">youtube.upload</code>.
              Ele permite enviar vídeos novos no seu canal — não lê comentários, métricas nem listas. Você pode revogar a qualquer momento aqui ou em{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 underline-offset-2 hover:underline"
              >
                myaccount.google.com/permissions
              </a>.
            </p>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmandoDisconnect}
        danger
        loading={disconnecting}
        title="Desconectar o canal do YouTube?"
        description={
          account
            ? `O BeatPost vai parar de publicar no canal "${account.channel_title}". Beats já agendados que ainda não foram publicados não vão ser enviados. Você pode reconectar a qualquer momento.`
            : 'O BeatPost vai parar de publicar no seu canal.'
        }
        confirmLabel="Sim, desconectar"
        cancelLabel="Cancelar"
        onConfirm={handleDesconectar}
        onCancel={() => !disconnecting && setConfirmandoDisconnect(false)}
      />
    </>
  )
}

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400">Carregando...</div>}>
      <ConfiguracoesContent />
    </Suspense>
  )
}
