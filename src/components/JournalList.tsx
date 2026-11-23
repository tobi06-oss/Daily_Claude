import { useMemo, useState } from 'react'
import { fmtLong, fmtWeekday, relLabel } from '../lib/date'
import { useData } from '../lib/store'
import { moodOf } from '../lib/types'

export function JournalList({ today, onOpen }: { today: string; onOpen: (d: string) => void }) {
  const data = useData()
  const [q, setQ] = useState('')

  const days = useMemo(() => {
    const map = new Map<string, { line: string; long: string; mood: number | null }>()
    for (const j of data.journal_entries) {
      if (j.deleted_at) continue
      const cur = map.get(j.local_date) ?? { line: '', long: '', mood: null }
      if (j.kind === 'line') cur.line = j.body
      else cur.long = j.body
      cur.mood = cur.mood ?? j.mood
      map.set(j.local_date, cur)
    }
    const term = q.trim()
    return [...map.entries()]
      .filter(([, v]) => v.line.trim() || v.long.trim())
      .filter(([, v]) => !term || v.line.includes(term) || v.long.includes(term))
      .sort((a, b) => b[0].localeCompare(a[0]))
  }, [data, q])

  return (
    <section className="jlist" aria-label="일기 모아보기">
      <header className="day-head">
        <div>
          <p className="day-rel">모아보기</p>
          <h1 className="day-date">일기</h1>
        </div>
      </header>
      <label className="search">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input type="search" placeholder="기록 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      {days.length === 0 ? (
        <p className="empty big">{q ? '찾는 기록이 없어요.' : '첫 한 줄을 기다리고 있어요.'}</p>
      ) : (
        <ul className="entries">
          {days.map(([d, v]) => {
            const m = moodOf(v.mood)
            const rel = relLabel(d, today)
            return (
              <li key={d}>
                <button className="entry" onClick={() => onOpen(d)} style={m ? ({ '--mood': m.color } as React.CSSProperties) : undefined}>
                  <span className="entry-date">
                    <b>{fmtLong(d)}</b> {rel || fmtWeekday(d)}
                    {m && <span className="entry-mood">{m.name}</span>}
                  </span>
                  {v.line && <span className="entry-line">{v.line}</span>}
                  {v.long && <span className="entry-long">{v.long}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
