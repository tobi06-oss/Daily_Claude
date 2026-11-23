import { useEffect, useState } from 'react'
import { addDays } from '../lib/date'
import { occurrencesOn } from '../lib/recur'
import { useData } from '../lib/store'

const toMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}
const span = (mins: number) => {
  if (mins < 60) return `${mins}분`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}시간 ${m}분` : `${h}시간`
}

export function greeting(h: number) {
  if (h < 5) return '늦은 밤이에요'
  if (h < 11) return '좋은 아침이에요'
  if (h < 17) return '좋은 오후예요'
  if (h < 21) return '편안한 저녁이에요'
  return '오늘도 수고했어요'
}

/** 오늘 화면 맨 위: 지금 / 다음 일정과 할 일 진행 링 */
export function NowCard({ today }: { today: string }) {
  const data = useData()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const occ = occurrencesOn(data, today).filter((o) => !o.event.all_day)
  const cur = occ.find((o) => toMin(o.start) <= nowMin && nowMin < toMin(o.end))
  const next = occ.find((o) => toMin(o.start) > nowMin)
  const tomorrowFirst = !cur && !next ? occurrencesOn(data, addDays(today, 1)).find((o) => !o.event.all_day) : undefined

  const tasks = data.tasks.filter((t) => !t.deleted_at && t.due_date === today)
  const done = tasks.filter((t) => t.done_at).length
  const ratio = tasks.length ? done / tasks.length : 0
  const C = 2 * Math.PI * 22

  let label: string, title: string, sub: string, tone: 'now' | 'next' | 'rest'
  if (cur) {
    tone = 'now'
    label = '지금'
    title = cur.title
    sub = `${span(toMin(cur.end) - nowMin)} 남음`
  } else if (next) {
    tone = 'next'
    label = `${span(toMin(next.start) - nowMin)} 뒤`
    title = next.title
    sub = `${next.start} 시작`
  } else {
    tone = 'rest'
    label = '남은 일정 없음'
    title = now.getHours() >= 17 ? '여유로운 저녁' : '여유로운 하루'
    sub = tomorrowFirst ? `내일 ${tomorrowFirst.start} ${tomorrowFirst.title}` : '내일도 비어 있어요'
  }

  return (
    <div className={`now-card ${tone}`}>
      <div className="now-text">
        <span className="now-label">{label}</span>
        <span className="now-title">{title}</span>
        <span className="now-sub">{sub}</span>
      </div>
      <div className="ring" aria-label={`할 일 ${tasks.length}개 중 ${done}개 완료`}>
        <svg viewBox="0 0 52 52" aria-hidden>
          <circle cx="26" cy="26" r="22" className="ring-bg" />
          <circle cx="26" cy="26" r="22" className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - ratio)} />
        </svg>
        <span className="ring-n">
          {done}
          <small>/{tasks.length}</small>
        </span>
      </div>
    </div>
  )
}
