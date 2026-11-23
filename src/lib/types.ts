// 설계안 v0.2 데이터 모델의 필드 이름을 그대로 따른다 (통합 단계에서 Supabase로 옮기기 쉽게).
// Phase 1에서는 날짜·시각을 시간대 없는 로컬 문자열로 다룬다: 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm'.

export interface Meta {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  rev: number
}

export type ColorKey = 'sage' | 'coral' | 'sand'

export interface EventItem extends Meta {
  title: string
  note: string
  start_at: string // 'YYYY-MM-DDTHH:mm' (종일이면 'YYYY-MM-DDT00:00')
  end_at: string
  all_day: boolean
  tz: string
  rrule: string | null // 'FREQ=DAILY' | 'FREQ=WEEKLY;BYDAY=MO,TU' | 'FREQ=MONTHLY'
  color_key: ColorKey
  remind_minutes: number[]
}

export interface EventException extends Meta {
  event_id: string
  original_start_at: string // 반복 중 해당 회차의 날짜 'YYYY-MM-DD'
  kind: 'cancelled' | 'modified'
  override_title: string | null
  override_start_at: string | null
  override_end_at: string | null
}

export interface Task extends Meta {
  title: string
  due_date: string | null
  due_at: string | null
  done_at: string | null
  sort_order: number
  event_id: string | null
}

export interface JournalEntry extends Meta {
  local_date: string
  mood: number | null // 1~5
  body: string
  kind: 'line' | 'long'
  written_at: string
}

export interface Settings {
  day_start_hour: number
}

export interface Data {
  version: 1
  events: EventItem[]
  event_exceptions: EventException[]
  tasks: Task[]
  journal_entries: JournalEntry[]
  settings: Settings
}

// 화면에 그리는 "그날의 일정 한 회차"
export interface Occurrence {
  event: EventItem
  date: string
  start: string // 'HH:mm'
  end: string
  title: string
  exception?: EventException
}

export const MOODS = [
  { v: 1, name: '반짝', color: '#E3C27A' },
  { v: 2, name: '포근', color: '#C5836B' },
  { v: 3, name: '잔잔', color: '#869B84' },
  { v: 4, name: '흐림', color: '#9AA3A8' },
  { v: 5, name: '지침', color: '#A6998B' },
] as const

export const moodOf = (v: number | null | undefined) => MOODS.find((m) => m.v === v)
