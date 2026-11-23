import { useRef, useState } from 'react'
import { addDays, fmtLong, fmtTime, fmtWeekday, relLabel, toDate, ymd } from '../lib/date'
import { occurrencesOn, ruleLabel } from '../lib/recur'
import { entryOf, moodOn, saveEntry, setMood, toggleTask, updateTask, useData } from '../lib/store'
import { MOODS, moodOf, type Task } from '../lib/types'
import { haptic, openSheet, toast } from '../lib/ui'
import { GoalsBlock } from './Goals'
import { greeting, NowCard } from './NowCard'
import { WeekStrip } from './WeekStrip'

interface Props {
  date: string
  today: string
  onDate: (d: string) => void
  compact?: boolean // 달력 아래에 붙을 때
}

export function DayPage({ date, today, onDate, compact }: Props) {
  const data = useData()
  const occ = occurrencesOn(data, date)
  const isToday = date === today
  const tasks = data.tasks.filter((t) => !t.deleted_at && t.due_date === date).sort((a, b) => a.sort_order - b.sort_order)
  const overdue = isToday
    ? data.tasks.filter((t) => !t.deleted_at && !t.done_at && t.due_date && t.due_date < today)
    : []
  const open = tasks.filter((t) => !t.done_at)
  const done = tasks.filter((t) => t.done_at)
  const rel = relLabel(date, today)
  const nowHM = new Date().toTimeString().slice(0, 5)

  return (
    <section className={`day ${compact ? 'compact' : ''}`} aria-label={`${fmtLong(date)} 하루`}>
      <header className="day-head">
        <div>
          {!compact && <p className="day-rel">{isToday ? greeting(new Date().getHours()) : rel || fmtWeekday(date)}</p>}
          <h1 className="day-date">{fmtLong(date)}</h1>
          <p className="day-wd">
            {fmtWeekday(date)}
            {compact && rel ? ` · ${rel}` : ''}
          </p>
        </div>
        <div className="day-nav">
          <button className="icon-btn" aria-label="전날" onClick={() => onDate(addDays(date, -1))}>
            <Chevron dir="left" />
          </button>
          {!isToday && (
            <button className="pill" onClick={() => onDate(today)}>
              오늘
            </button>
          )}
          <button className="icon-btn" aria-label="다음날" onClick={() => onDate(addDays(date, 1))}>
            <Chevron dir="right" />
          </button>
        </div>
      </header>

      {!compact && <WeekStrip date={date} today={today} onPick={onDate} />}
      {isToday && !compact && <NowCard today={today} />}

      {/* 일정 */}
      <div className="block">
        <div className="block-head">
          <h3>일정</h3>
          <button className="add" onClick={() => openSheet({ kind: 'event', eventId: null, date })} aria-label="일정 추가">
            +
          </button>
        </div>
        {occ.length === 0 ? (
          <p className="empty">비어 있는 하루예요. 여유도 계획이에요.</p>
        ) : (
          <ul className="timeline">
            {occ.map((o) => {
              const now = isToday && !o.event.all_day && o.start <= nowHM && nowHM < o.end
              const past = isToday && !o.event.all_day && o.end <= nowHM
              return (
                <li key={o.event.id}>
                  <button
                    className={`ev c-${o.event.color_key} ${now ? 'now' : ''} ${past ? 'past' : ''}`}
                    onClick={() => openSheet({ kind: 'event', eventId: o.event.id, date })}
                  >
                    <span className="ev-time">
                      {o.event.all_day ? '종일' : fmtTime(o.start)}
                      {!o.event.all_day && <small>{fmtTime(o.end)}까지</small>}
                    </span>
                    <span className="ev-bar" aria-hidden />
                    <span className="ev-body">
                      <span className="ev-title">{o.title}</span>
                      {(o.event.rrule || now) && (
                        <span className="ev-sub">
                          {now && <em>지금</em>}
                          {o.event.rrule && ruleLabel(o.event.rrule)}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 할 일 */}
      <div className="block">
        <div className="block-head">
          <h3>
            할 일 {tasks.length > 0 && <span className="count">{done.length}/{tasks.length}</span>}
          </h3>
          <button className="add" onClick={() => openSheet({ kind: 'capture', type: 'task' })} aria-label="할 일 추가">
            +
          </button>
        </div>
        {overdue.length > 0 && (
          <ul className="tasks overdue">
            {overdue.map((t) => (
              <TaskRow key={t.id} t={t} today={today} late />
            ))}
          </ul>
        )}
        {tasks.length === 0 && overdue.length === 0 ? (
          <p className="empty">할 일이 없어요.</p>
        ) : (
          <ul className="tasks">
            {[...open, ...done].map((t) => (
              <TaskRow key={t.id} t={t} today={today} />
            ))}
          </ul>
        )}
        {tasks.length > 0 && <p className="swipe-hint">밀어서 → 완료 · ← 내일로</p>}
      </div>

      <GoalsBlock date={date} today={today} />

      {/* 일기 */}
      <Journal key={date} date={date} today={today} hasEvents={occ.length > 0} onDate={onDate} />
    </section>
  )
}

function TaskRow({ t, today, late }: { t: Task; today: string; late?: boolean }) {
  const [dx, setDx] = useState(0)
  const start = useRef<{ x: number; y: number; on: boolean } | null>(null)
  const done = !!t.done_at
  const TH = 72

  const finish = () => {
    if (dx > TH) {
      toggleTask(t.id)
      haptic()
      toast(done ? '다시 할 일로' : '완료!', false)
    } else if (dx < -TH) {
      const to = addDays(late ? today : (t.due_date ?? today), 1)
      updateTask(t.id, { due_date: to })
      haptic()
      toast('내일로 미뤘어요', false)
    }
    setDx(0)
    start.current = null
  }

  return (
    <li
      className={`task ${done ? 'done' : ''} ${late ? 'late' : ''}`}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return
        start.current = { x: e.clientX, y: e.clientY, on: false }
      }}
      onPointerMove={(e) => {
        const s = start.current
        if (!s) return
        const mx = e.clientX - s.x
        if (!s.on && Math.abs(e.clientY - s.y) > 12) {
          start.current = null
          setDx(0)
          return
        }
        if (Math.abs(mx) > 8) s.on = true
        if (s.on) setDx(Math.max(-120, Math.min(120, mx)))
      }}
      onPointerUp={finish}
      onPointerCancel={() => {
        setDx(0)
        start.current = null
      }}
    >
      <span className={`task-bg ${dx > 0 ? 'r' : dx < 0 ? 'l' : ''}`} aria-hidden>
        <span>{done ? '되돌리기' : '완료'}</span>
        <span>내일로</span>
      </span>
      <div className="task-fg" style={{ transform: `translateX(${dx}px)`, transition: dx ? 'none' : undefined }}>
        <button
          className="check"
          role="checkbox"
          aria-checked={done}
          aria-label={`${t.title} ${done ? '완료됨' : '완료하기'}`}
          onClick={() => {
            toggleTask(t.id)
            haptic()
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M6 12.5l4 4 8-9" />
          </svg>
        </button>
        <button className="task-title" onClick={() => openSheet({ kind: 'task', taskId: t.id })}>
          {t.title}
          {late && <small>{relLabel(t.due_date!, today) || t.due_date!.slice(5).replace('-', '/')}부터 밀림</small>}
        </button>
        <button
          className="later"
          aria-label="내일로 미루기"
          onClick={() => {
            updateTask(t.id, { due_date: addDays(late ? today : (t.due_date ?? today), 1) })
            toast('내일로 미뤘어요')
          }}
        >
          내일
        </button>
      </div>
    </li>
  )
}

function Journal({ date, today, hasEvents, onDate }: { date: string; today: string; hasEvents: boolean; onDate: (d: string) => void }) {
  const data = useData()
  const streak = streakUntil(data, today)
  const question = PROMPTS[hashDay(date) % PROMPTS.length]
  const line = entryOf(date, 'line')
  const long = entryOf(date, 'long')
  const mood = moodOn(date)
  const [lineTxt, setLineTxt] = useState(line?.body ?? '')
  const [longTxt, setLongTxt] = useState(long?.body ?? '')
  const [openLong, setOpenLong] = useState(!!long?.body)
  const [saved, setSaved] = useState<'' | 'saving' | 'saved'>('')
  const timer = useRef<number | undefined>(undefined)
  const lineRef = useRef<HTMLTextAreaElement>(null)

  const queue = (kind: 'line' | 'long', v: string) => {
    setSaved('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      saveEntry(date, kind, v)
      setSaved('saved')
    }, 500)
  }

  const evening = date === today && new Date().getHours() >= 18 && !lineTxt.trim() && !longTxt.trim()
  const hasText = !!(lineTxt.trim() || longTxt.trim())
  const m = moodOf(mood)

  return (
    <div className="block journal" style={m ? ({ '--mood': m.color } as React.CSSProperties) : undefined}>
      <div className="block-head">
        <h3>
          일기
          {date === today && streak >= 2 && <span className="streak">{streak}일째 기록 중</span>}
        </h3>
        <span className="saved" aria-live="polite">
          {saved === 'saving' ? '쓰는 중…' : saved === 'saved' ? '저장됨' : ''}
        </span>
      </div>

      {evening && (
        <div className="evening">
          <p>{hasEvents ? '오늘 하루는 어땠어요? 한 줄이면 충분해요.' : '오늘을 한 줄로 남겨 볼까요?'}</p>
          <button className="pill" onClick={() => lineRef.current?.focus()}>
            한 줄 쓰기
          </button>
        </div>
      )}

      <textarea
        ref={lineRef}
        className="line-input"
        rows={1}
        placeholder={date === today ? question : '이날의 한 줄'}
        value={lineTxt}
        maxLength={120}
        onChange={(e) => {
          setLineTxt(e.target.value)
          queue('line', e.target.value)
        }}
        onBlur={() => {
          window.clearTimeout(timer.current)
          saveEntry(date, 'line', lineTxt)
          if (lineTxt.trim()) setSaved('saved')
        }}
      />

      {openLong ? (
        <textarea
          className="long-input"
          rows={5}
          placeholder="더 쓰고 싶은 이야기"
          value={longTxt}
          onChange={(e) => {
            setLongTxt(e.target.value)
            queue('long', e.target.value)
          }}
          onBlur={() => {
            window.clearTimeout(timer.current)
            saveEntry(date, 'long', longTxt)
          }}
        />
      ) : (
        <button className="text-btn" onClick={() => setOpenLong(true)}>
          + 길게 쓰기
        </button>
      )}

      {(hasText || mood) && (
        <div className="moods" role="radiogroup" aria-label="오늘의 기분 (선택)">
          {MOODS.map((md) => (
            <button
              key={md.v}
              role="radio"
              aria-checked={mood === md.v}
              className={`mood ${mood === md.v ? 'on' : ''}`}
              style={{ '--c': md.color } as React.CSSProperties}
              onClick={() => {
                setMood(date, mood === md.v ? null : md.v)
                haptic()
              }}
            >
              <i aria-hidden />
              {md.name}
            </button>
          ))}
        </div>
      )}

      <Capsule date={date} onDate={onDate} />
    </div>
  )
}

const PROMPTS = [
  '오늘 가장 좋았던 순간은?',
  '오늘 나를 웃게 한 것은?',
  '오늘 고마웠던 사람은?',
  '오늘 새로 알게 된 것은?',
  '오늘 몸과 마음은 어땠나요?',
  '오늘 잘 해낸 작은 일은?',
  '오늘 기억하고 싶은 장면은?',
  '오늘 아쉬웠던 것 하나는?',
  '내일의 나에게 한마디',
  '오늘을 한 단어로 표현하면?',
]
const hashDay = (d: string) => [...d].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

/** 오늘(또는 어제)부터 거꾸로, 일기를 쓴 날이 며칠 이어졌는지 */
function streakUntil(data: ReturnType<typeof useData>, today: string) {
  const wrote = new Set(data.journal_entries.filter((j) => !j.deleted_at && j.body.trim()).map((j) => j.local_date))
  let d = wrote.has(today) ? today : addDays(today, -1)
  let n = 0
  while (wrote.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

/** 지난 오늘: 1주 전 · 1달 전 · 1년 전 같은 날의 기록 */
function Capsule({ date, onDate }: { date: string; onDate: (d: string) => void }) {
  const data = useData()
  const shift = (months: number, years: number) => {
    const d = toDate(date)
    const t = new Date(d.getFullYear() - years, d.getMonth() - months, d.getDate())
    return t.getDate() === d.getDate() ? ymd(t) : null
  }
  const cands = [
    { label: '1주 전', d: addDays(date, -7) },
    { label: '1달 전', d: shift(1, 0) },
    { label: '1년 전', d: shift(0, 1) },
  ]
    .filter((c): c is { label: string; d: string } => !!c.d)
    .map((c) => {
      const es = data.journal_entries.filter((j) => !j.deleted_at && j.local_date === c.d && j.body.trim())
      const line = es.find((j) => j.kind === 'line')?.body || es[0]?.body
      const mood = es.find((j) => j.mood)?.mood ?? null
      return { ...c, line, mood }
    })
    .filter((c) => c.line)
  const [i, setI] = useState(0)
  if (!cands.length) return null
  const c = cands[Math.min(i, cands.length - 1)]
  const m = moodOf(c.mood)
  return (
    <div className="capsule" style={m ? ({ '--mood': m.color } as React.CSSProperties) : undefined}>
      <div className="capsule-tabs">
        <span className="capsule-k">지난 오늘</span>
        {cands.map((x, k) => (
          <button key={x.label} className={k === i ? 'on' : ''} onClick={() => setI(k)}>
            {x.label}
          </button>
        ))}
      </div>
      <button className="capsule-body" onClick={() => onDate(c.d)}>
        <span className="capsule-line">“{c.line}”</span>
        <span className="capsule-meta">
          {fmtLong(c.d)} {fmtWeekday(c.d)}
          {m && ` · ${m.name}`}
        </span>
      </button>
    </div>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
