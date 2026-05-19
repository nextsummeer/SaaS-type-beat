/**
 * Utilitarios pro calendario de agendamento (T6.19).
 *
 * Calculo de grid 6x7 (mesmo padrao Beatloadr/Google Calendar): a primeira
 * semana comeca no domingo, dias do mes anterior/proximo aparecem com
 * opacity reduzida pra completar 42 celulas.
 */

export const NOMES_DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const

export const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const

/** Matriz 6x7 cobrindo o mes visivel (semana comeca no domingo). */
export function gridDoMes(year: number, month: number): Date[][] {
  const primeiroDoMes = new Date(year, month, 1)
  const diaSemanaInicio = primeiroDoMes.getDay() // 0 = domingo
  const inicio = new Date(year, month, 1 - diaSemanaInicio)

  const matriz: Date[][] = []
  for (let semana = 0; semana < 6; semana++) {
    const linha: Date[] = []
    for (let dia = 0; dia < 7; dia++) {
      const d = new Date(inicio)
      d.setDate(inicio.getDate() + semana * 7 + dia)
      linha.push(d)
    }
    matriz.push(linha)
  }
  return matriz
}

export function mesmaData(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function ehMesmoMes(d: Date, year: number, month: number): boolean {
  return d.getFullYear() === year && d.getMonth() === month
}

export function chaveLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function numeroDaSemanaISO(d: Date): number {
  const target = new Date(d.valueOf())
  const dayNr = (d.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
}

export function nomeDiaSemanaCheio(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(d)
}

/** Default usado pra preencher hora ao clicar numa celula vazia: hoje +diasOffset com 18h. */
export function comHora18(d: Date): Date {
  const r = new Date(d)
  r.setHours(18, 0, 0, 0)
  return r
}

/** Data que o beat ocupa no calendario: prefere scheduled_at (intencao do user),
 *  cai pra published_at (caso o beat tenha sido publicado imediatamente).
 *  Retorna null se nenhuma das duas existe.
 */
export function dataDoBeatNoCalendario(beat: {
  scheduled_at: string | null
  published_at: string | null
}): Date | null {
  const fonte = beat.scheduled_at ?? beat.published_at
  if (!fonte) return null
  const d = new Date(fonte)
  return isNaN(d.getTime()) ? null : d
}

interface BeatStatusInfo {
  post_status: string | null
  scheduled_at: string | null
  youtube_video_id: string | null
  youtube_deleted_at: string | null
  status: string
}

/** Beat foi deletado do YouTube pelo proprio produtor. */
export function ehDeletadoYoutube(b: BeatStatusInfo): boolean {
  return !!b.youtube_deleted_at
}

/** Beat ja virou public no YouTube (e nao pode mais ser reagendado).
 *
 *  Importante: post.status pode ficar 'scheduled' mesmo apos a hora chegar,
 *  porque publish.py seta uma unica vez no upload e nao revisita. Por isso
 *  detectamos publicacao efetiva tambem pelo combo
 *  `youtube_video_id != null AND scheduled_at <= agora`.
 */
export function ehPublicadoEfetivo(b: BeatStatusInfo): boolean {
  if (ehDeletadoYoutube(b)) return false
  if (b.post_status === 'published') return true
  if (b.youtube_video_id && b.scheduled_at) {
    const dt = new Date(b.scheduled_at)
    if (!isNaN(dt.getTime()) && dt <= new Date()) return true
  }
  return false
}

/** Beat agendado pra futuro — pode ser reagendado livremente. */
export function ehAgendadoFuturo(b: BeatStatusInfo): boolean {
  if (b.post_status !== 'scheduled') return false
  if (!b.scheduled_at) return false
  const dt = new Date(b.scheduled_at)
  return !isNaN(dt.getTime()) && dt > new Date()
}
