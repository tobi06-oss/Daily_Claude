export const WEEK = ['일', '월', '화', '수', '목', '금', '토']
export const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

export const pad = (n: number) => String(n).padStart(2, '0')
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const toDate = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (s: string, n: number) => {
  const d = toDate(s)
  d.setDate(d.getDate() + n)
  return ymd(d)
}
export const weekday = (s: string) => toDate(s).getDay()
export const nowIso = () => new Date().toISOString()

/** 하루 시작 시각(기본 새벽 4시)을 반영한 "오늘" */
export function logicalToday(dayStartHour = 4, now = new Date()) {
  const d = new Date(now)
  if (d.getHours() < dayStartHour) d.setDate(d.getDate() - 1)
  return ymd(d)
}

export function fmtLong(s: string) {
  const d = toDate(s)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}
export function fmtWeekday(s: string) {
  return `${WEEK[weekday(s)]}요일`
}
export function fmtShort(s: string) {
  const d = toDate(s)
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEK[d.getDay()]})`
}
export function relLabel(s: string, today: string) {
  const diff = Math.round((toDate(s).getTime() - toDate(today).getTime()) / 86400000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '내일'
  if (diff === 2) return '모레'
  if (diff === -1) return '어제'
  if (diff === -2) return '그제'
  return ''
}
export function addMinutes(hm: string, mins: number) {
  const [h, m] = hm.split(':').map(Number)
  const t = Math.min(h * 60 + m + mins, 23 * 60 + 59)
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`
}
export function fmtTime(hm: string) {
  const [h, m] = hm.split(':').map(Number)
  const ap = h < 12 ? '오전' : '오후'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${ap} ${h12}:${pad(m)}`
}
export const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)
