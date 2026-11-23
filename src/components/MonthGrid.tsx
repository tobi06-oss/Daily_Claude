import { pad, toDate, ymd } from '../lib/date'
import { occurrencesOn } from '../lib/recur'
import { moodOn, useData } from '../lib/store'
import { moodOf } from '../lib/types'

interface Props {
  month: string // 'YYYY-MM'
  sel: string
  today: string
  onMonth: (m: string) => void
  onPick: (d: string) => void
}

export function MonthGrid({ month, sel, today, onMonth, onPick }: Props) {
  const data = useData()
  const [y, m] = month.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const startPad = first.getDay()
  const daysIn = new Date(y, m, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysIn; d++) cells.push(`${y}-${pad(m)}-${pad(d)}`)
  while (cells.length % 7) cells.push(null)

  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1)
    onMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`)
  }

  return (
    <section className="month" aria-label={`${y}년 ${m}월`}>
      <header className="month-head">
        <h2>
          <span className="m-num">{m}월</span> <span className="m-year">{y}</span>
        </h2>
        <div className="day-nav">
          <button className="icon-btn" aria-label="이전 달" onClick={() => shift(-1)}>
            ‹
          </button>
          {month !== today.slice(0, 7) && (
            <button
              className="pill"
              onClick={() => {
                onMonth(today.slice(0, 7))
                onPick(today)
              }}
            >
              이번 달
            </button>
          )}
          <button className="icon-btn" aria-label="다음 달" onClick={() => shift(1)}>
            ›
          </button>
        </div>
      </header>
      <div className="wk" aria-hidden>
        {'일월화수목금토'.split('').map((w, i) => (
          <span key={w} className={i === 0 ? 'sun' : i === 6 ? 'sat' : ''}>
            {w}
          </span>
        ))}
      </div>
      <div className="grid" role="grid">
        {cells.map((c, i) => {
          if (!c) return <span key={`p${i}`} className="cell pad" />
          const occ = occurrencesOn(data, c)
          const mood = moodOf(moodOn(c))
          const wrote = data.journal_entries.some((j) => !j.deleted_at && j.local_date === c && j.body.trim())
          const dow = toDate(c).getDay()
          return (
            <button
              key={c}
              role="gridcell"
              aria-selected={c === sel}
              aria-label={`${Number(c.slice(8))}일, 일정 ${occ.length}개${mood ? `, 기분 ${mood.name}` : wrote ? ', 일기 있음' : ''}`}
              className={`cell ${c === sel ? 'sel' : ''} ${c === today ? 'today' : ''} ${dow === 0 ? 'sun' : dow === 6 ? 'sat' : ''} ${mood ? 'has-mood' : ''}`}
              style={mood ? ({ '--mood': mood.color } as React.CSSProperties) : undefined}
              onClick={() => onPick(c)}
            >
              <span className="n">{Number(c.slice(8))}</span>
              <span className="dots" aria-hidden>
                {occ.slice(0, 3).map((o) => (
                  <i key={o.event.id} className={`c-${o.event.color_key}`} />
                ))}
                {!mood && wrote && <i className="wrote" />}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export const monthOf = (d: string) => d.slice(0, 7)
export const todayMonth = () => ymd(new Date()).slice(0, 7)
