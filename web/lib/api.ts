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
  youtube_deleted_at: string | null
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
  _debug?: {
    data_hoje: string
    intervalo_atual: string
    intervalo_anterior: string
    raw_atual: unknown
    raw_anterior: unknown
  }
}

/** Busca KPIs do canal no período. T7.3. */
export async function fetchAnalyticsOverview(
  token: string,
  period: '7d' | '30d' | '90d' = '7d',
  debug = false,
): Promise<AnalyticsOverview> {
  const url = `${API_URL}/analytics/overview?period=${period}${debug ? '&debug=true' : ''}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Erro ${res.status} ao buscar overview`)
  }
  return res.json()
}

export interface AnalyticsTopBeatItem {
  video_id: string
  views: number
  retention_pct: number
  beat: {
    id: string
    titulo: string
    artista_nome: string | null
    cover_path: string | null
  } | null
}

export interface AnalyticsTopBeats {
  period: string
  items: AnalyticsTopBeatItem[]
}

/** Busca top beats por views no período. T7.4. */
export async function fetchAnalyticsTopBeats(
  token: string,
  period: '7d' | '30d' | '90d' = '7d',
  limit = 5,
): Promise<AnalyticsTopBeats> {
  const url = `${API_URL}/analytics/top-beats?period=${period}&limit=${limit}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Erro ${res.status} ao buscar top-beats`)
  }
  return res.json()
}

export type YoutubePrivacyStatus = 'public' | 'private' | 'unlisted'

export interface AnalyticsMyBeatItem {
  beat_id: string
  video_id: string
  titulo: string | null
  artista_nome: string | null
  cover_path: string | null
  youtube_url: string | null
  privacy_status: YoutubePrivacyStatus
  view_count: number
  like_count: number
  comment_count: number
  published_at: string | null
  duration_seconds: number
}

export interface AnalyticsMyBeats {
  period: string
  items: AnalyticsMyBeatItem[]
}

/** Lista beats publicados pelo BeatPost com stats lifetime quase em tempo real (Data API). */
export async function fetchAnalyticsMyBeats(
  token: string,
  options: { period?: '7d' | '30d' | '90d'; forceRefresh?: boolean } = {},
): Promise<AnalyticsMyBeats> {
  const { period = '7d', forceRefresh = false } = options
  const url = `${API_URL}/analytics/my-beats?period=${period}${forceRefresh ? '&force_refresh=true' : ''}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Erro ${res.status} ao buscar my-beats`)
  }
  return res.json()
}

export interface AnalyticsTrafficSource {
  key: string
  label: string
  views: number
  pct: number
}

export interface AnalyticsTrafficSources {
  period: string
  total_views: number
  sources: AnalyticsTrafficSource[]
}

/** Quebra de tráfego por fonte. T7.5. */
export async function fetchAnalyticsTrafficSources(
  token: string,
  period: '7d' | '30d' | '90d' = '7d',
): Promise<AnalyticsTrafficSources> {
  const url = `${API_URL}/analytics/traffic-sources?period=${period}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Erro ${res.status} ao buscar traffic-sources`)
  }
  return res.json()
}

export type AnalyticsTimelineMetric = 'views' | 'subscribersGained'

export interface AnalyticsTimelinePoint {
  date: string
  views: number
}

export interface AnalyticsViewsTimeline {
  period: string
  metric: AnalyticsTimelineMetric
  granularity: 'day' | 'month'
  max_views: number
  points: AnalyticsTimelinePoint[]
}

/** Série temporal de uma métrica (views ou subscribersGained). T7.6. */
export async function fetchAnalyticsViewsTimeline(
  token: string,
  period: '7d' | '30d' | '90d' = '7d',
  metric: AnalyticsTimelineMetric = 'views',
): Promise<AnalyticsViewsTimeline> {
  const url = `${API_URL}/analytics/views-timeline?period=${period}&metric=${metric}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Erro ${res.status} ao buscar views-timeline`)
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

export interface RescheduleResponse {
  ok: true
  post_id: string
  scheduled_at: string
  synced_with_youtube: boolean
}

/** Reagenda um post (drag-and-drop no calendario). T6.19. */
export async function reschedulePost(
  postId: string,
  token: string,
  scheduledAt: Date,
): Promise<RescheduleResponse> {
  const res = await fetch(`${API_URL}/posts/${postId}/reschedule`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ scheduled_at: scheduledAt.toISOString() }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Erro ${res.status} ao reagendar`)
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

// ──────────────────────────────────────────────────────────────────────
// Conquistas (gamificação)
// ──────────────────────────────────────────────────────────────────────

export type AchievementTier = 'bronze' | 'silver' | 'gold'
export type AchievementCategory = 'streak' | 'volume' | 'views' | 'hit' | 'secret'

export interface Achievement {
  key: string
  title: string
  description: string
  category: AchievementCategory
  tier: AchievementTier
  target: number
  current: number
  unlocked: boolean
  newly_unlocked: boolean
  progress_pct: number
  unlocked_at: string | null
}

export type AchievementRankKey = 'aprendiz' | 'bronze' | 'prata' | 'ouro' | 'platina' | 'lenda'

export interface AchievementRank {
  key: AchievementRankKey
  name: string
  description: string
  unlocked_count: number
  current_rank_min: number
  next_rank_key: AchievementRankKey | null
  next_rank_name: string | null
  next_rank_at: number | null
  to_next: number
  progress_pct: number
  is_max_rank: boolean
}

export interface AchievementsResponse {
  achievements: Achievement[]
  newly_unlocked_keys: string[]
  total: number
  unlocked_count: number
  rank: AchievementRank
}

/** Lista todas as conquistas com estado pro usuário. */
export async function fetchAchievements(token: string): Promise<AchievementsResponse> {
  const res = await fetch(`${API_URL}/achievements`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Erro ${res.status} ao buscar conquistas`)
  }
  return res.json()
}
