/**
 * Persistencia do plano de acao no localStorage (T8.4 prototype).
 *
 * Em T8.5 isso migra pra Supabase com RLS + marcar tarefas como concluidas.
 * Por enquanto o plano vive no browser do produtor.
 */

import type { ActionTask, Meta } from './actionPlan'

const STORAGE_KEY = 'beatpost:action-plan:v1'

export type StoredPlan = {
  metas: Meta[]
  tasks: ActionTask[]
  createdAt: string
}

export function savePlan(metas: Meta[], tasks: ActionTask[]): void {
  if (typeof window === 'undefined') return
  const plan: StoredPlan = {
    metas,
    tasks,
    createdAt: new Date().toISOString(),
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan))
  } catch {
    // localStorage cheio ou desabilitado -- nao quebra o onboarding
  }
}

export function loadPlan(): StoredPlan | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredPlan>
    // Backward compat: planos antigos so tinham `tasks`
    return {
      metas: Array.isArray(parsed.metas) ? parsed.metas : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      createdAt: parsed.createdAt ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function clearPlan(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
