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
