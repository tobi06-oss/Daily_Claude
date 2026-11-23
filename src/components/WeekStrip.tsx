import { addDays, toDate, weekday } from '../lib/date'
import { occurrencesOn } from '../lib/recur'
import { moodOn, sleepMinutes, useData } from '../lib/store'
import { moodOf } from '../lib/types'

/** 고른 날이 들어 있는 한 주(일~토). 요일을 눌러 바로 이동 */
export function WeekStrip({ date, today, onPick }: { date: string; today: string; onPick: (d: string) => void }) {
  const data = useData()
  const sun = addDays(date, -weekday(date))
  const days = Array.from({ length: 7 }, (_, i) => addDays(sun, i))
  return (
    <div className="week" role="tablist" aria-label="이번 주">
      {days.map((d) => {
        const m = moodOf(moodOn(d))
        const n = occurrencesOn(data, d).length
        const dow = toDate(d).getDay()
        const sl = sleepMinutes(d)
        return (
          <button
            key={d}
            role="tab"
            aria-selected={d === date}
            className={`wd ${d === date ? 'sel' : ''} ${d === today ? 'today' : ''} ${dow === 0 ? 'sun' : ''}`}
            onClick={() => onPick(d)}
            style={m ? ({ '--mood': m.color } as React.CSSProperties) : undefined}
          >
            <span className="wd-l">{'일월화수목금토'[dow]}</span>
            <span className="wd-n">{toDate(d).getDate()}</span>
            <span className="wd-dot" aria-hidden>
              {m ? <i className="m" /> : n > 0 ? <i /> : null}
            </span>
            <span className="wd-sl">{sl ? `${(sl / 60).toFixed(1)}h` : ''}</span>
          </button>
        )
      })}
    </div>
  )
}
