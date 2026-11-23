import { BYDAY, toDate, weekday } from './date'
import type { Data, EventItem, Occurrence } from './types'

export type RepeatKind = 'none' | 'daily' | 'weekly' | 'monthly'

export function readRule(rrule: string | null): { kind: RepeatKind; days: number[] } {
  if (!rrule) return { kind: 'none', days: [] }
  if (rrule.includes('FREQ=DAILY')) return { kind: 'daily', days: [] }
  if (rrule.includes('FREQ=MONTHLY')) return { kind: 'monthly', days: [] }
  const m = rrule.match(/BYDAY=([A-Z,]+)/)
  const days = m ? m[1].split(',').map((c) => BYDAY.indexOf(c)).filter((n) => n >= 0) : []
  return { kind: 'weekly', days }
}

export function makeRule(kind: RepeatKind, days: number[]): string | null {
  if (kind === 'daily') return 'FREQ=DAILY'
  if (kind === 'monthly') return 'FREQ=MONTHLY'
  if (kind === 'weekly') {
    const ds = [...new Set(days)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    return `FREQ=WEEKLY;BYDAY=${ds.map((d) => BYDAY[d]).join(',')}`
  }
  return null
}

export function ruleLabel(rrule: string | null) {
  const { kind, days } = readRule(rrule)
  if (kind === 'daily') return '매일'
  if (kind === 'monthly') return '매월'
  if (kind === 'weekly') return `매주 ${days.map((d) => '일월화수목금토'[d]).join('·')}`
  return ''
}

function occursOn(ev: EventItem, date: string) {
  const start = ev.start_at.slice(0, 10)
  if (date < start) return false
  const { kind, days } = readRule(ev.rrule)
  if (kind === 'none') return date === start
  if (kind === 'daily') return true
  if (kind === 'weekly') return days.includes(weekday(date))
  return toDate(date).getDate() === toDate(start).getDate()
}

export function occurrencesOn(data: Data, date: string): Occurrence[] {
  const out: Occurrence[] = []
  for (const ev of data.events) {
    if (ev.deleted_at || !occursOn(ev, date)) continue
    const ex = data.event_exceptions.find(
      (x) => !x.deleted_at && x.event_id === ev.id && x.original_start_at === date
    )
    if (ex?.kind === 'cancelled') continue
    out.push({
      event: ev,
      date,
      start: (ex?.override_start_at ?? ev.start_at).slice(11, 16),
      end: (ex?.override_end_at ?? ev.end_at).slice(11, 16),
      title: ex?.override_title ?? ev.title,
      exception: ex,
    })
  }
  return out.sort((a, b) =>
    a.event.all_day === b.event.all_day ? a.start.localeCompare(b.start) : a.event.all_day ? -1 : 1
  )
}
