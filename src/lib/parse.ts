import { addDays, pad, toDate, weekday } from './date'
import { makeRule } from './recur'

export type CaptureType = 'event' | 'task' | 'journal' | 'goal'

export interface Parsed {
  type: CaptureType
  title: string
  date: string | null // 문장에서 찾은 날짜 (없으면 null)
  start: string | null // 'HH:mm'
  end: string | null
  rrule: string | null
  perWeek: number | null
}

const WK = '일월화수목금토'
const MER = '(오전|오후|아침|낮|점심|저녁|밤|새벽)'

function to24(mer: string | undefined, h: number, colon: boolean, text: string) {
  if (mer) {
    if (/오후|저녁|밤/.test(mer) && h < 12) return h + 12
    if (/낮|점심/.test(mer) && h < 5) return h + 12
    if (/오전|아침|새벽/.test(mer) && h === 12) return 0
    return h
  }
  if (colon || h >= 12) return h
  if (h >= 1 && h <= 6) return h + 12 // "3시 치과" → 오후 3시
  if (h >= 7 && h <= 11 && /저녁|밤|퇴근/.test(text)) return h + 12 // "7시 반 저녁 약속"
  return h
}

/**
 * 한국어 한 줄 입력을 일정 / 할 일 / 일기로 나누고 날짜·시간·반복을 뽑는다.
 * today는 "하루 시작 시각"을 반영한 오늘.
 */
export function parseCapture(raw: string, today: string): Parsed {
  const text = raw.trim()
  let t = ` ${text} `
  let date: string | null = null
  let start: string | null = null
  let end: string | null = null
  let rrule: string | null = null
  const cut = (re: RegExp) => {
    const m = t.match(re)
    if (m) t = t.replace(m[0], ' ')
    return m
  }

  // 주 N회 목표: "주 3회 러닝", "일주일에 2번 수영"
  let m: RegExpMatchArray | null
  if ((m = text.match(/(?:주|일주일에|한\s*주에?)\s*(\d)\s*(?:회|번)/))) {
    const n = Math.min(7, Math.max(1, +m[1]))
    const title = text.replace(m[0], ' ').replace(/(목표|하기)\s*$/, '').replace(/\s+/g, ' ').trim() || text
    return { type: 'goal', title, date: null, start: null, end: null, rrule: null, perWeek: n }
  }

  // 반복: 매일 / 매월 / 매주 월화목금
  if ((m = cut(/매주\s*((?:[월화수목금토일][요일]*[,·\s]*)+)/))) {
    const days = [...m[1].replace(/요일/g, '')].map((c) => WK.indexOf(c)).filter((n) => n >= 0)
    if (days.length) rrule = makeRule('weekly', days)
  } else if (cut(/매일/)) rrule = makeRule('daily', [])
  else if (cut(/매월|매달/)) rrule = makeRule('monthly', [])

  // 날짜
  if ((m = cut(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/)) || (m = cut(/(?<=\s)(\d{1,2})\/(\d{1,2})(?=\s)/))) {
    const y = Number(today.slice(0, 4))
    let c = `${y}-${pad(+m[1])}-${pad(+m[2])}`
    if (c < today) c = `${y + 1}-${pad(+m[1])}-${pad(+m[2])}`
    date = c
  } else if ((m = cut(/(오늘|내일|모레|글피)/))) {
    date = addDays(today, { 오늘: 0, 내일: 1, 모레: 2, 글피: 3 }[m[1]]!)
  } else if ((m = cut(/(\d{1,2})\s*일\s*(뒤|후)/))) {
    date = addDays(today, +m[1])
  } else if ((m = cut(/(이번\s*주|다음\s*주|담주)?\s*([월화수목금토일])요일/))) {
    const target = WK.indexOf(m[2])
    const idx = (d: number) => (d + 6) % 7 // 월=0
    const cur = weekday(today)
    if (m[1]) {
      const monday = addDays(today, -idx(cur))
      date = addDays(monday, idx(target) + (/다음|담/.test(m[1]) ? 7 : 0))
    } else {
      date = addDays(today, (target - cur + 7) % 7)
    }
  }

  // 시간: 범위 먼저 (14-19, 14시~19시, 오후 2시부터 7시까지, 14:00-19:00)
  const one = `${MER}?\\s*(\\d{1,2})(?::(\\d{2})|\\s*시(?:\\s*(\\d{1,2})\\s*분|\\s*(반))?)`
  const loose = `${MER}?\\s*(\\d{1,2})(?::(\\d{2}))?\\s*시?(?:\\s*(\\d{1,2})\\s*분|\\s*(반))?`
  const hm = (g: (string | undefined)[], prevMer?: string, prevH?: number) => {
    const mer = g[0] ?? prevMer
    const colon = g[2] !== undefined
    let h = to24(mer, Number(g[1]), colon, text)
    const min = g[2] ? +g[2] : g[3] ? +g[3] : g[4] ? 30 : 0
    if (prevH !== undefined && !g[0] && h < prevH && h + 12 < 24) h += 12
    return { h, s: `${pad(h)}:${pad(min)}`, mer }
  }
  const range = new RegExp(`${loose}\\s*(?:~|-|–|부터)\\s*${loose}\\s*(?:까지)?`)
  if ((m = t.match(range)) && (/[시:~]|부터/.test(m[0]) || (+m[2] <= 23 && +m[7] <= 23))) {
    t = t.replace(m[0], ' ')
    const a = hm([m[1], m[2], m[3], m[4], m[5]])
    const b = hm([m[6], m[7], m[8], m[9], m[10]], m[6] ? undefined : a.mer, a.h)
    start = a.s
    end = b.s
  } else if ((m = cut(new RegExp(one)))) {
    start = hm([m[1], m[2], m[3], m[4], m[5]]).s
  }

  let title = t
    .replace(/\s+(에|에는|까지|부터|에서)(?=\s)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!title) title = text

  const sentence =
    /(다|요|네|지|어|아|음|함|듯)[.!?~…]*$/.test(text) || /[.!?…]$/.test(text) || text.length >= 28
  let type: CaptureType
  if (start || rrule) type = 'event'
  else if (sentence) type = 'journal'
  else type = 'task'

  if (type === 'journal') title = text
  return { type, title, date, start, end, rrule, perWeek: null }
}

export function describeParsed(p: Parsed, fallbackDate: string) {
  const d = toDate(p.date ?? fallbackDate)
  const dateTxt = `${d.getMonth() + 1}/${d.getDate()} (${WK[d.getDay()]})`
  return { dateTxt }
}
