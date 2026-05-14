const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function healthCheck(): Promise<{ ok: boolean; version?: string }> {
  try {
    const res = await fetch(`${API_URL}/health`, { next: { revalidate: 30 } })
    if (!res.ok) return { ok: false }
    return res.json()
  } catch {
    return { ok: false }
  }
}

export interface BeatListItem {
  id: string
  status: string
  artista_nome: string | null
  bpm: number | null
  music_key: string | null
  cover_path: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  titulo: string | null
  post_status: string | null
  scheduled_at: string | null
  youtube_url: string | null
}

export async function fetchBeats(token: string): Promise<BeatListItem[]> {
  const res = await fetch(`${API_URL}/beats`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Erro ao buscar beats')
  }
  return res.json()
}

export interface YoutubeAccount {
  channel_id: string
  channel_title: string
  scopes: string[]
  connected_at: string | null
  updated_at: string | null
}

/** Scope necessário pra ler dados do YouTube Analytics API. */
export const YT_ANALYTICS_SCOPE = 'https://www.googleapis.com/auth/yt-analytics.readonly'

/** True se a conta conectada ainda não autorizou leitura de Analytics. */
export function precisaReautorizarAnalytics(account: YoutubeAccount | null): boolean {
  if (!account) return false
  return !account.scopes.includes(YT_ANALYTICS_SCOPE)
}

export interface AnalyticsOverviewMetric {
  value: number
  previous: number
  delta_pct: number
}

export interface AnalyticsOverview {
  period: string
  views: AnalyticsOverviewMetric
  subscribers_gained: AnalyticsOverviewMetric
  retention: AnalyticsOverviewMetric
}

/** Busca KPIs do canal no período. T7.3. */
export async function fetchAnalyticsOverview(
  token: string,
  period: '7d' | '30d' | '90d' = '7d',
): Promise<AnalyticsOverview> {
  const res = await fetch(`${API_URL}/analytics/overview?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Erro ${res.status} ao buscar overview`)
  }
  return res.json()
}

export async function fetchYoutubeAccount(token: string): Promise<YoutubeAccount | null> {
  const res = await fetch(`${API_URL}/youtube/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Erro ao buscar canal')
  }
  const data = await res.json()
  return data.account ?? null
}

export async function disconnectYoutubeAccount(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/youtube/me`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Erro ao desconectar canal')
  }
}

export function getYoutubeAuthUrl(token: string): string {
  return `${API_URL}/youtube/auth?token=${encodeURIComponent(token)}`
}

export async function deleteBeat(beatId: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/beats/${beatId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Erro ao deletar beat')
  }
}

export async function fetchPost(beatId: string, token: string) {
  const res = await fetch(`${API_URL}/posts/${beatId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Erro ao buscar post')
  }
  return res.json()
}

export async function patchPost(
  postId: string,
  token: string,
  data: {
    titulo?: string
    descricao?: string
    tags?: string[]
    purchase_link?: string
    scheduled_at?: string
    status?: string
    privacy_status?: 'public' | 'unlisted'
  },
) {
  const res = await fetch(`${API_URL}/posts/${postId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Erro ao salvar post')
  }
  return res.json()
}
