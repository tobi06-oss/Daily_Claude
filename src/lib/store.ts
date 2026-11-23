import { useSyncExternalStore } from 'react'
import { addDays, logicalToday, nowIso, pad, uid, ymd } from './date'
import { sampleData } from './sample'
import type { ColorKey, Data, EventException, EventItem, Goal, GoalCheck, JournalEntry, SleepLog, Task } from './types'

const KEY = 'lifeplanner.v1'

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw) as Data
      if (d && d.version === 1) return d
    }
  } catch {
    /* 저장소를 못 쓰면 메모리에서만 동작 */
  }
  return sampleData(logicalToday(4))
}

let data: Data = load()
const listeners = new Set<() => void>()
let saveTimer: number | undefined

function persist() {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* 용량 초과 등: 무시 */
    }
  }, 150)
}
window.addEventListener('pagehide', () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* noop */
  }
})

function set(next: Data) {
  data = next
  persist()
  listeners.forEach((l) => l())
}

export function useData() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => data
  )
}
export const getData = () => data

const touch = <T extends { updated_at: string; rev: number }>(x: T): T => ({
  ...x,
  updated_at: nowIso(),
  rev: x.rev + 1,
})
const meta = () => {
  const n = nowIso()
  return { id: uid(), created_at: n, updated_at: n, deleted_at: null, rev: 1 }
}

// ── 실행 취소: 바뀌기 직전 상태를 하나 보관 ──
let undoSnap: Data | null = null
export function snapshot() {
  undoSnap = data
}
export function undo() {
  if (undoSnap) {
    set(undoSnap)
    undoSnap = null
  }
}

// ── 일정 ──
export function addEvent(e: Omit<EventItem, keyof ReturnType<typeof meta>>) {
  const ev: EventItem = { ...meta(), ...e }
  set({ ...data, events: [...data.events, ev] })
  return ev
}
export function updateEvent(id: string, patch: Partial<EventItem>) {
  set({ ...data, events: data.events.map((e) => (e.id === id ? touch({ ...e, ...patch }) : e)) })
}
export function deleteEvent(id: string) {
  snapshot()
  updateEvent(id, { deleted_at: nowIso() })
}
/** 반복 일정의 한 회차만 바꾸거나 지운다 */
export function setException(
  event_id: string,
  date: string,
  kind: EventException['kind'],
  o: { title?: string; start?: string; end?: string } = {}
) {
  if (kind === 'cancelled') snapshot()
  const rest = data.event_exceptions.filter((x) => !(x.event_id === event_id && x.original_start_at === date))
  const ex: EventException = {
    ...meta(),
    event_id,
    original_start_at: date,
    kind,
    override_title: o.title ?? null,
    override_start_at: o.start ? `${date}T${o.start}` : null,
    override_end_at: o.end ? `${date}T${o.end}` : null,
  }
  set({ ...data, event_exceptions: [...rest, ex] })
}

// ── 할 일 ──
export function addTask(title: string, due_date: string) {
  const t: Task = {
    ...meta(),
    title,
    due_date,
    due_at: null,
    done_at: null,
    sort_order: data.tasks.length,
    event_id: null,
  }
  set({ ...data, tasks: [...data.tasks, t] })
  return t
}
export function updateTask(id: string, patch: Partial<Task>) {
  set({ ...data, tasks: data.tasks.map((t) => (t.id === id ? touch({ ...t, ...patch }) : t)) })
}
export function toggleTask(id: string) {
  const t = data.tasks.find((x) => x.id === id)
  if (t) updateTask(id, { done_at: t.done_at ? null : nowIso() })
}
export function deleteTask(id: string) {
  snapshot()
  updateTask(id, { deleted_at: nowIso() })
}

// ── 일기 (날짜마다 한 줄 1개 + 긴 일기 1개) ──
export function entryOf(date: string, kind: JournalEntry['kind']) {
  return data.journal_entries.find((j) => !j.deleted_at && j.local_date === date && j.kind === kind)
}
export function saveEntry(date: string, kind: JournalEntry['kind'], body: string) {
  const cur = entryOf(date, kind)
  if (cur) {
    set({
      ...data,
      journal_entries: data.journal_entries.map((j) =>
        j.id === cur.id ? touch({ ...j, body, written_at: nowIso() }) : j
      ),
    })
  } else if (body.trim()) {
    const other = entryOf(date, kind === 'line' ? 'long' : 'line')
    const j: JournalEntry = {
      ...meta(),
      local_date: date,
      kind,
      body,
      mood: other?.mood ?? null,
      written_at: nowIso(),
    }
    set({ ...data, journal_entries: [...data.journal_entries, j] })
  }
}
/** 기분은 그날의 기록 전체에 붙는다 (한 줄·긴 일기 모두) */
export function setMood(date: string, mood: number | null) {
  const has = data.journal_entries.some((j) => !j.deleted_at && j.local_date === date)
  if (!has) {
    const j: JournalEntry = { ...meta(), local_date: date, kind: 'line', body: '', mood, written_at: nowIso() }
    set({ ...data, journal_entries: [...data.journal_entries, j] })
    return
  }
  set({
    ...data,
    journal_entries: data.journal_entries.map((j) =>
      !j.deleted_at && j.local_date === date ? touch({ ...j, mood }) : j
    ),
  })
}
export function moodOn(date: string) {
  return data.journal_entries.find((j) => !j.deleted_at && j.local_date === date && j.mood)?.mood ?? null
}

// ── 주 N회 목표 ──
export function addGoal(title: string, per_week: number, color_key: ColorKey = 'sage') {
  const goals = data.goals ?? []
  const g: Goal = { ...meta(), title, per_week, color_key, sort_order: goals.length }
  set({ ...data, goals: [...goals, g] })
  return g
}
export function updateGoal(id: string, patch: Partial<Goal>) {
  set({ ...data, goals: (data.goals ?? []).map((g) => (g.id === id ? touch({ ...g, ...patch }) : g)) })
}
export function deleteGoal(id: string) {
  snapshot()
  updateGoal(id, { deleted_at: nowIso() })
}
export function isChecked(goalId: string, date: string) {
  return (data.goal_checks ?? []).some((c) => !c.deleted_at && c.goal_id === goalId && c.local_date === date)
}
export function toggleGoalCheck(goal_id: string, local_date: string) {
  const checks = data.goal_checks ?? []
  const cur = checks.find((c) => !c.deleted_at && c.goal_id === goal_id && c.local_date === local_date)
  if (cur) {
    set({ ...data, goal_checks: checks.map((c) => (c.id === cur.id ? touch({ ...c, deleted_at: nowIso() }) : c)) })
    return false
  }
  const c: GoalCheck = { ...meta(), goal_id, local_date }
  set({ ...data, goal_checks: [...checks, c] })
  return true
}

/** 일정 제목에 목표 이름이 들어 있으면 연결 ("저녁 러닝" ↔ "러닝") */
export function goalForTitle(title: string) {
  const t = title.replace(/\s+/g, '').toLowerCase()
  return (data.goals ?? []).find((g) => !g.deleted_at && g.title.trim() && t.includes(g.title.replace(/\s+/g, '').toLowerCase()))
}
export function setDayStart(h: number) {
  set({ ...data, settings: { ...data.settings, day_start_hour: h } })
}

// ── 기상·취침 ──
const localNow = () => {
  const d = new Date()
  return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
/** 실제 시각 → 하루 시작 시각 기준 날짜 */
export function logicalDateOf(at: string) {
  const h = Number(at.slice(11, 13))
  const day = at.slice(0, 10)
  return h < data.settings.day_start_hour ? addDays(day, -1) : day
}
export function sleepOf(local_date: string, kind: SleepLog['kind']) {
  return (data.sleep_logs ?? []).find((l) => !l.deleted_at && l.local_date === local_date && l.kind === kind)
}
/** 기록(같은 날 같은 종류가 있으면 덮어씀) */
export function logSleep(kind: SleepLog['kind'], at = localNow(), source: SleepLog['source'] = 'app') {
  const local_date = logicalDateOf(at)
  const logs = data.sleep_logs ?? []
  const cur = logs.find((l) => !l.deleted_at && l.local_date === local_date && l.kind === kind)
  snapshot()
  if (cur) {
    set({ ...data, sleep_logs: logs.map((l) => (l.id === cur.id ? touch({ ...l, at, source }) : l)) })
  } else {
    const l: SleepLog = { ...meta(), kind, at, local_date, source }
    set({ ...data, sleep_logs: [...logs, l] })
  }
  return { at, local_date }
}
export function removeSleep(id: string) {
  snapshot()
  set({ ...data, sleep_logs: (data.sleep_logs ?? []).map((l) => (l.id === id ? touch({ ...l, deleted_at: nowIso() }) : l)) })
}
/** 그날 아침까지의 수면 시간(분): 전날 취침 → 그날 기상 */
export function sleepMinutes(local_date: string) {
  const w = sleepOf(local_date, 'wake')
  const s = sleepOf(addDays(local_date, -1), 'sleep')
  if (!w || !s) return null
  const mins = (new Date(w.at).getTime() - new Date(s.at).getTime()) / 60000
  return mins > 0 && mins < 18 * 60 ? Math.round(mins) : null
}

// ── 전체 ──
export function resetSample() {
  snapshot()
  set(sampleData(logicalToday(data.settings.day_start_hour)))
}
export function replaceAll(d: Data) {
  snapshot()
  set(d)
}
