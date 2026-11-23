import { useState } from 'react'
import { addDays, toDate, weekday } from '../lib/date'
import { addGoal, deleteGoal, getData, toggleGoalCheck, updateGoal, useData } from '../lib/store'
import type { ColorKey } from '../lib/types'
import { closeSheet, haptic, openSheet, toast } from '../lib/ui'

/** 고른 날이 속한 주(일~토)의 "주 N회" 목표 */
export function GoalsBlock({ date, today }: { date: string; today: string }) {
  const data = useData()
  const goals = (data.goals ?? []).filter((g) => !g.deleted_at).sort((a, b) => a.sort_order - b.sort_order)
  const sun = addDays(date, -weekday(date))
  const week = Array.from({ length: 7 }, (_, i) => addDays(sun, i))
  const checks = (data.goal_checks ?? []).filter((c) => !c.deleted_at && c.local_date >= week[0] && c.local_date <= week[6])
  const isToday = date === today

  return (
    <div className="block goals">
      <div className="block-head">
        <h3>이번 주 목표</h3>
        <button className="add" onClick={() => openSheet({ kind: 'goal', goalId: null })} aria-label="목표 추가">
          +
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="goal-empty">
          <p className="empty">주 몇 번 하고 싶은 일을 정해 두면, 이번 주에 얼마나 했는지 보여 드려요.</p>
          <button
            className="pill"
            onClick={() => {
              addGoal('러닝', 3)
              toast('주 3회 러닝 목표를 만들었어요', true)
            }}
          >
            + 주 3회 러닝
          </button>
        </div>
      ) : (
        <ul className="goal-list">
          {goals.map((g) => {
            const mine = new Set(checks.filter((c) => c.goal_id === g.id).map((c) => c.local_date))
            const n = mine.size
            const doneWeek = n >= g.per_week
            const doneDay = mine.has(date)
            const left = g.per_week - n
            const daysLeft = week.filter((d) => d > today).length + (mine.has(today) ? 0 : 1)
            const note = doneWeek
              ? n > g.per_week
                ? `목표보다 ${n - g.per_week}번 더!`
                : '이번 주 달성!'
              : today > week[6]
                ? `${n}번 했어요`
                : left > daysLeft
                  ? `${left}번 남음`
                  : `${left}번 남음 · ${daysLeft}일 남음`
            return (
              <li key={g.id} className={`goal c-${g.color_key} ${doneWeek ? 'achieved' : ''}`}>
                <div className="goal-top">
                  <button className="goal-name" onClick={() => openSheet({ kind: 'goal', goalId: g.id })}>
                    <b>{g.title}</b>
                    <span>
                      주 {g.per_week}회 · {note}
                    </span>
                  </button>
                  <button
                    className={`goal-do ${doneDay ? 'on' : ''}`}
                    disabled={date > today}
                    aria-pressed={doneDay}
                    onClick={() => {
                      const on = toggleGoalCheck(g.id, date)
                      haptic()
                      if (on && n + 1 === g.per_week) toast(`${g.title} 이번 주 목표 달성!`)
                    }}
                  >
                    {doneDay ? '✓ 했어요' : isToday ? '오늘 했어요' : '이날 했어요'}
                  </button>
                </div>
                <div className="goal-track" aria-label={`이번 주 ${n}번 / 목표 ${g.per_week}번`}>
                  {week.map((d) => {
                    const on = mine.has(d)
                    const future = d > today
                    return (
                      <button
                        key={d}
                        className={`gd ${on ? 'on' : ''} ${d === date ? 'sel' : ''} ${d === today ? 'today' : ''}`}
                        disabled={future}
                        aria-pressed={on}
                        aria-label={`${toDate(d).getDate()}일 ${on ? '했음' : '안 함'}`}
                        onClick={() => {
                          toggleGoalCheck(g.id, d)
                          haptic()
                        }}
                      >
                        <span>{'일월화수목금토'[toDate(d).getDay()]}</span>
                        <i />
                      </button>
                    )
                  })}
                </div>
                <div className="goal-bar" aria-hidden>
                  <i style={{ width: `${Math.min(100, (n / g.per_week) * 100)}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const COLORS: { k: ColorKey; name: string }[] = [
  { k: 'sage', name: '세이지' },
  { k: 'coral', name: '코랄' },
  { k: 'sand', name: '샌드' },
]

export function GoalEditor({ goalId }: { goalId: string | null }) {
  const g = goalId ? (getData().goals ?? []).find((x) => x.id === goalId) : undefined
  const [title, setTitle] = useState(g?.title ?? '')
  const [per, setPer] = useState(g?.per_week ?? 3)
  const [color, setColor] = useState<ColorKey>(g?.color_key ?? 'sage')
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        if (g) updateGoal(g.id, { title: title.trim(), per_week: per, color_key: color })
        else addGoal(title.trim(), per, color)
        toast(g ? '목표를 고쳤어요' : `주 ${per}회 ${title.trim()} 목표를 만들었어요`)
        closeSheet()
      }}
    >
      <input className="title-input" placeholder="예: 러닝, 스트레칭, 책 읽기" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!g} />
      <div className="field">
        <span>일주일에</span>
        <div className="stepper">
          <button type="button" aria-label="줄이기" onClick={() => setPer(Math.max(1, per - 1))} disabled={per <= 1}>
            −
          </button>
          <b>{per}회</b>
          <button type="button" aria-label="늘리기" onClick={() => setPer(Math.min(7, per + 1))} disabled={per >= 7}>
            +
          </button>
        </div>
      </div>
      <div className="field">
        <span>색</span>
        <div className="colors">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c.k}
              className={`swatch sw-${c.k} ${color === c.k ? 'on' : ''}`}
              aria-label={c.name}
              aria-pressed={color === c.k}
              onClick={() => setColor(c.k)}
            />
          ))}
        </div>
      </div>
      <button className="primary wide" type="submit" disabled={!title.trim()}>
        {g ? '저장' : '목표 만들기'}
      </button>
      {g && (
        <button
          type="button"
          className="text-btn danger-text"
          onClick={() => {
            deleteGoal(g.id)
            toast('목표를 지웠어요', true)
            closeSheet()
          }}
        >
          목표 삭제
        </button>
      )}
    </form>
  )
}
