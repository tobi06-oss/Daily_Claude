import { useSyncExternalStore } from 'react'

// 화면 간 공유하는 가벼운 UI 상태: 토스트, 열린 시트
export type SheetState =
  | { kind: 'capture'; type?: 'event' | 'task' | 'journal' | 'goal' }
  | { kind: 'event'; eventId: string | null; date: string; start?: string }
  | { kind: 'task'; taskId: string }
  | { kind: 'goal'; goalId: string | null }
  | { kind: 'sleep'; date: string }
  | { kind: 'settings' }
  | null

interface UI {
  toast: { id: number; msg: string; undo: boolean } | null
  sheet: SheetState
}

let ui: UI = { toast: null, sheet: null }
const ls = new Set<() => void>()
const emit = (next: Partial<UI>) => {
  ui = { ...ui, ...next }
  ls.forEach((l) => l())
}
export const useUI = () =>
  useSyncExternalStore(
    (l) => {
      ls.add(l)
      return () => ls.delete(l)
    },
    () => ui
  )

let timer: number | undefined
export function toast(msg: string, undo = false) {
  window.clearTimeout(timer)
  const id = Date.now()
  emit({ toast: { id, msg, undo } })
  timer = window.setTimeout(() => emit({ toast: null }), undo ? 5000 : 2400)
}
export const hideToast = () => emit({ toast: null })
export const openSheet = (s: SheetState) => emit({ sheet: s })
export const closeSheet = () => emit({ sheet: null })

export const haptic = () => {
  try {
    navigator.vibrate?.(8)
  } catch {
    /* iOS 미지원 */
  }
}
