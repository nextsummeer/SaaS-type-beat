import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formata duracao em segundos pra "M:SS" ou "H:MM:SS". */
export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return "0:00"
  const horas = Math.floor(totalSeconds / 3600)
  const minutos = Math.floor((totalSeconds % 3600) / 60)
  const segundos = totalSeconds % 60
  const ss = segundos.toString().padStart(2, "0")
  if (horas > 0) {
    const mm = minutos.toString().padStart(2, "0")
    return `${horas}:${mm}:${ss}`
  }
  return `${minutos}:${ss}`
}

/** Engagement rate = (likes + comments) / views × 100. Retorna 0 se views=0. */
export function engagementRate(views: number, likes: number, comments: number): number {
  if (!views || views <= 0) return 0
  return ((likes + comments) / views) * 100
}

/** "Total Age" relativo a hoje: "5 minutos", "3 horas", "2 dias", "1 mês". */
export function totalAge(isoDate: string | null): string {
  if (!isoDate) return "—"
  try {
    const publicado = new Date(isoDate).getTime()
    const agora = Date.now()
    const segundos = Math.floor((agora - publicado) / 1000)
    if (segundos < 60) return `${segundos}s`
    const minutos = Math.floor(segundos / 60)
    if (minutos < 60) return `${minutos} min`
    const horas = Math.floor(minutos / 60)
    if (horas < 24) return `${horas} ${horas === 1 ? "hora" : "horas"}`
    const dias = Math.floor(horas / 24)
    if (dias < 30) return `${dias} ${dias === 1 ? "dia" : "dias"}`
    const meses = Math.floor(dias / 30)
    if (meses < 12) return `${meses} ${meses === 1 ? "mês" : "meses"}`
    const anos = Math.floor(dias / 365)
    return `${anos} ${anos === 1 ? "ano" : "anos"}`
  } catch {
    return "—"
  }
}
