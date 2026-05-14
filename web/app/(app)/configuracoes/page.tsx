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
  BarChart3,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchYoutubeAccount,
  disconnectYoutubeAccount,
  getYoutubeAuthUrl,
  precisaReautorizarAnalytics,
  fetchAnalyticsOverview,
  type YoutubeAccount,
  type AnalyticsOverview,
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

  // DEBUG TEMPORÁRIO — testar endpoint /analytics/overview (T7.3)
  // TODO: remover assim que confirmar que funciona em produção
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugResult, setDebugResult] = useState<AnalyticsOverview | null>(null)
  const [debugError, setDebugError] = useState<string | null>(null)

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

  async function handleTestarAnalytics() {
    setDebugLoading(true)
    setDebugError(null)
    setDebugResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const data = await fetchAnalyticsOverview(session.access_token, '7d')
      setDebugResult(data)
    } catch (e) {
      setDebugError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setDebugLoading(false)
    }
  }

  const inputClass = "w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:ring-1"
  const inputStyle = {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border)',
    color: 'var(--text-primary)',
  }

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Configurações</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Seu perfil e a conexão com o YouTube em um só lugar.
          </p>
        </div>

        {/* Seção Perfil */}
        <section
          className="rounded-xl border p-6 space-y-5"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="pb-1" style={{ borderBottom: '1px solid var(--border-muted)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-subtle)' }}>
              Perfil do produtor
            </p>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Aparece automaticamente na descrição dos seus vídeos.
            </p>
          </div>

          {loadingPerfil ? (
            <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando perfil...</span>
            </div>
          ) : (
            <form onSubmit={handleSavePerfil} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  Nome artístico / tag de produtor
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: prod. Zestro"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  Email de contato
                </label>
                <input
                  type="email"
                  value={emailContato}
                  onChange={(e) => setEmailContato(e.target.value)}
                  placeholder="Ex: contato@seusite.com"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  Instagram
                </label>
                <div
                  className="flex items-center overflow-hidden rounded-lg border transition focus-within:ring-1"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
                >
                  <span className="pl-4 text-sm" style={{ color: 'var(--text-subtle)' }}>@</span>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(sanitizeInstagramHandle(e.target.value))}
                    placeholder="seuinstagram"
                    className="flex-1 bg-transparent py-3 pr-4 text-sm outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {perfilError && (
                <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#f87171' }}>
                  {perfilError}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: savedOk ? '#16a34a' : 'var(--accent)' }}
              >
                {savedOk ? (
                  <><CheckCircle2 className="h-4 w-4" />Salvo!</>
                ) : saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                ) : (
                  <><Save className="h-4 w-4" />Salvar</>
                )}
              </button>
            </form>
          )}
        </section>

        {/* Seção Canal YouTube */}
        <section
          className="rounded-xl border p-6 space-y-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="pb-1" style={{ borderBottom: '1px solid var(--border-muted)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-subtle)' }}>
              Canal do YouTube
            </p>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Conecte seu canal pra publicarmos os beats automaticamente no horário agendado.
            </p>
          </div>

          {oauthSuccess && (
            <div className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.05)', color: '#4ade80' }}>
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{oauthSuccess}</span>
            </div>
          )}

          {oauthError && (
            <div className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#f87171' }}>
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{oauthError}</span>
            </div>
          )}

          {loadingCanal ? (
            <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando canal...</span>
            </div>
          ) : account ? (
            <div className="rounded-xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--bg-surface)' }}>
                  <Tv2 className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="flex-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                    </span>
                    Conectado
                  </div>
                  <h3 className="mt-2 font-semibold" style={{ color: 'var(--text-primary)' }}>{account.channel_title}</h3>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-subtle)' }}>ID: {account.channel_id}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Calendar className="h-3 w-3" />
                    <span>Conectado em {formataData(account.connected_at)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setConfirmandoDisconnect(true)}
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-surface)' }}
                >
                  <Unplug className="h-4 w-4" />
                  Desconectar canal
                </button>
                <button
                  type="button"
                  onClick={handleConectar}
                  disabled={connecting}
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition disabled:opacity-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-surface)' }}
                >
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                  Reconectar
                </button>
              </div>
            </div>
          ) : null}

          {/* Banner: reautorizar pra liberar Analytics */}
          {account && precisaReautorizarAnalytics(account) && (
            <div
              className="relative overflow-hidden rounded-xl p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(255,90,31,0.08), rgba(255,90,31,0.02))',
                border: '1px solid rgba(255,90,31,0.25)',
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full"
                style={{ background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)', opacity: 0.4 }}
              />
              <div className="relative flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'var(--accent-muted)', border: '1px solid rgba(255,90,31,0.3)' }}
                >
                  <BarChart3 className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Libere o acesso ao Analytics
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Pra mostrar suas métricas reais do YouTube (views, inscritos ganhos, retenção)
                    precisamos de uma permissão adicional. Você vai pro Google e confirma — leva 10 segundos.
                  </p>
                  <button
                    type="button"
                    onClick={handleConectar}
                    disabled={connecting}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold text-white transition disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}
                  >
                    {connecting ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" />Redirecionando...</>
                    ) : (
                      <><LinkIcon className="h-3.5 w-3.5" />Autorizar acesso ao Analytics</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!account && !loadingCanal && (
            <div className="rounded-xl border p-8" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <Tv2 className="h-7 w-7 text-red-400" />
                </div>
                <h3 className="mt-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Conecte seu canal do YouTube</h3>
                <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
                  Você será redirecionado pro Google pra autorizar o BeatPost a publicar vídeos no seu canal
                  e ler suas métricas (Analytics). A gente nunca altera nem apaga nada — só publica os beats
                  que você agendou.
                </p>
                <button
                  type="button"
                  onClick={handleConectar}
                  disabled={connecting}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}
                >
                  {connecting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Redirecionando...</>
                  ) : (
                    <><LinkIcon className="h-4 w-4" />Conectar canal</>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-lg border px-4 py-3 text-xs" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-subtle)' }}>
            <p className="font-medium" style={{ color: 'var(--text-muted)' }}>Sobre as permissões solicitadas</p>
            <ul className="mt-1.5 space-y-1">
              <li>
                <code className="rounded px-1" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>youtube.upload</code>
                {' '}— publicar os beats agendados no seu canal.
              </li>
              <li>
                <code className="rounded px-1" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>youtube.readonly</code>
                {' '}— ler informações do canal pra mostrar na UI.
              </li>
              <li>
                <code className="rounded px-1" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>yt-analytics.readonly</code>
                {' '}— ler suas métricas (views, retenção) pra mostrar em Analytics.
              </li>
            </ul>
            <p className="mt-2">
              A gente nunca apaga nem edita vídeos. Você pode revogar a qualquer momento aqui ou em{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}
                className="underline-offset-2 hover:underline"
              >
                myaccount.google.com/permissions
              </a>.
            </p>
          </div>
        </section>

        {/* DEBUG TEMPORÁRIO — testar endpoint /analytics/overview (T7.3) */}
        <section
          className="rounded-xl border p-6 space-y-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,90,31,0.3)' }}
        >
          <div className="pb-1" style={{ borderBottom: '1px solid var(--border-muted)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
              Debug temporário · Analytics
            </p>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Botão pra testar o endpoint <code className="rounded px-1" style={{ background: 'var(--bg-base)' }}>/analytics/overview</code> com seu canal real. Esta seção será removida quando Analytics estiver completa.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestarAnalytics}
            disabled={debugLoading}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {debugLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Buscando…</>
            ) : (
              <><BarChart3 className="h-4 w-4" />Testar /analytics/overview (7 dias)</>
            )}
          </button>

          {debugError && (
            <div className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#f87171' }}>
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="break-all">{debugError}</span>
            </div>
          )}

          {debugResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-subtle)' }}>Views</p>
                  <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{debugResult.views.value.toLocaleString('pt-BR')}</p>
                  <p className="text-[11px]" style={{ color: debugResult.views.delta_pct >= 0 ? '#4ade80' : '#f87171' }}>
                    {debugResult.views.delta_pct >= 0 ? '↑' : '↓'} {Math.abs(debugResult.views.delta_pct)}% vs anterior ({debugResult.views.previous})
                  </p>
                </div>
                <div className="rounded-lg border p-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-subtle)' }}>Inscritos</p>
                  <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{debugResult.subscribers_gained.value > 0 ? '+' : ''}{debugResult.subscribers_gained.value}</p>
                  <p className="text-[11px]" style={{ color: debugResult.subscribers_gained.delta_pct >= 0 ? '#4ade80' : '#f87171' }}>
                    {debugResult.subscribers_gained.delta_pct >= 0 ? '↑' : '↓'} {Math.abs(debugResult.subscribers_gained.delta_pct)}% vs anterior ({debugResult.subscribers_gained.previous})
                  </p>
                </div>
                <div className="rounded-lg border p-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-subtle)' }}>Retenção</p>
                  <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{debugResult.retention.value}%</p>
                  <p className="text-[11px]" style={{ color: debugResult.retention.delta_pct >= 0 ? '#4ade80' : '#f87171' }}>
                    {debugResult.retention.delta_pct >= 0 ? '↑' : '↓'} {Math.abs(debugResult.retention.delta_pct)}% vs anterior ({debugResult.retention.previous}%)
                  </p>
                </div>
              </div>
              <details className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                <summary className="cursor-pointer">Ver JSON cru da resposta</summary>
                <pre className="mt-2 overflow-auto rounded p-3 font-mono" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
                  {JSON.stringify(debugResult, null, 2)}
                </pre>
              </details>
            </div>
          )}
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
    <Suspense fallback={<div className="text-sm" style={{ color: 'var(--text-muted)' }}>Carregando...</div>}>
      <ConfiguracoesContent />
    </Suspense>
  )
}
