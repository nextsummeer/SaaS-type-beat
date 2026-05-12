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
