import { useState } from 'react'
import { addMinutes, weekday } from '../lib/date'
import { makeRule, readRule, type RepeatKind } from '../lib/recur'
import { addEvent, deleteEvent, getData, setException, updateEvent } from '../lib/store'
import type { ColorKey } from '../lib/types'
import { closeSheet, haptic, toast } from '../lib/ui'

const WD = ['월', '화', '수', '목', '금', '토', '일']
const WD_IDX = [1, 2, 3, 4, 5, 6, 0]
const COLORS: { k: ColorKey; name: string }[] = [
  { k: 'sage', name: '세이지' },
  { k: 'coral', name: '코랄' },
  { k: 'sand', name: '샌드' },
]

export function EventEditor({ eventId, date, start: s0 }: { eventId: string | null; date: string; start?: string }) {
  const ev = eventId ? getData().events.find((e) => e.id === eventId) : undefined
  const ex = ev ? getData().event_exceptions.find((x) => x.event_id === ev.id && x.original_start_at === date) : undefined
  const rule = readRule(ev?.rrule ?? null)
  const recurring = rule.kind !== 'none'

  const [title, setTitle] = useState(ex?.override_title ?? ev?.title ?? '')
  const [day, setDay] = useState(ev && !recurring ? ev.start_at.slice(0, 10) : date)
  const [start, setStart] = useState((ex?.override_start_at ?? ev?.start_at)?.slice(11, 16) ?? s0 ?? '09:00')
  const [end, setEnd] = useState((ex?.override_end_at ?? ev?.end_at)?.slice(11, 16) ?? addMinutes(s0 ?? '09:00', 60))
  const [allDay, setAllDay] = useState(ev?.all_day ?? false)
  const [kind, setKind] = useState<RepeatKind>(rule.kind)
  const [days, setDays] = useState<number[]>(rule.days.length ? rule.days : [weekday(date)])
  const [color, setColor] = useState<ColorKey>(ev?.color_key ?? 'sage')
  const [note, setNote] = useState(ev?.note ?? '')
  const [askScope, setAskScope] = useState<null | 'save' | 'delete'>(null)

  const valid = title.trim() && (allDay || end >= start) && (kind !== 'weekly' || days.length > 0)
  const fixedEnd = allDay ? '23:59' : end
  const fixedStart = allDay ? '00:00' : start

  const saveAll = () => {
    const firstDate = recurring && ev ? ev.start_at.slice(0, 10) : day
    const patch = {
      title: title.trim(),
      note,
      start_at: `${firstDate}T${fixedStart}`,
      end_at: `${firstDate}T${fixedEnd}`,
      all_day: allDay,
      rrule: makeRule(kind, days),
      color_key: color,
    }
    if (ev) updateEvent(ev.id, patch)
    else addEvent({ ...patch, tz: 'Asia/Seoul', remind_minutes: [] })
    haptic()
    toast(ev ? '일정을 고쳤어요' : '일정을 추가했어요')
    closeSheet()
  }
  const saveOne = () => {
    if (!ev) return
    setException(ev.id, date, 'modified', { title: title.trim(), start: fixedStart, end: fixedEnd })
    toast('이 날 일정만 고쳤어요')
    closeSheet()
  }
  const delAll = () => {
    if (!ev) return
    deleteEvent(ev.id)
    toast(recurring ? '반복 일정을 모두 지웠어요' : '일정을 지웠어요', true)
    closeSheet()
  }
  const delOne = () => {
    if (!ev) return
    setException(ev.id, date, 'cancelled')
    toast('이 날 일정만 지웠어요', true)
    closeSheet()
  }

  if (askScope) {
    return (
      <div className="scope">
        <p className="scope-q">반복 일정이에요. 어디까지 {askScope === 'save' ? '고칠까요' : '지울까요'}?</p>
        <button className="secondary wide" onClick={askScope === 'save' ? saveOne : delOne}>
          이 날만
        </button>
        <button className={`${askScope === 'delete' ? 'danger' : 'primary'} wide`} onClick={askScope === 'save' ? saveAll : delAll}>
          반복 전체
        </button>
        <button className="text-btn" onClick={() => setAskScope(null)}>
          돌아가기
        </button>
      </div>
    )
  }

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        if (ev && recurring) setAskScope('save')
        else saveAll()
      }}
    >
      <input className="title-input" placeholder="일정 제목" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!ev} />

      <div className="row">
        <label className="field">
          <span>날짜</span>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} disabled={!!ev && recurring} />
        </label>
        <label className="switch">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          <span>종일</span>
        </label>
      </div>
      {!allDay && (
        <div className="row">
          <label className="field">
            <span>시작</span>
            <input
              type="time"
              value={start}
              onChange={(e) => {
                const v = e.target.value
                if (end <= v) setEnd(addMinutes(v, 60))
                setStart(v)
              }}
            />
          </label>
          <label className="field">
            <span>끝</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
      )}

      <div className="field">
        <span>반복</span>
        <div className="seg">
          {(['none', 'daily', 'weekly', 'monthly'] as RepeatKind[]).map((k) => (
            <button type="button" key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
              {{ none: '없음', daily: '매일', weekly: '매주', monthly: '매월' }[k]}
            </button>
          ))}
        </div>
        {kind === 'weekly' && (
          <div className="days">
            {WD.map((w, i) => {
              const d = WD_IDX[i]
              const on = days.includes(d)
              return (
                <button
                  type="button"
                  key={w}
                  aria-pressed={on}
                  className={on ? 'on' : ''}
                  onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}
                >
                  {w}
                </button>
              )
            })}
          </div>
        )}
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

      <label className="field">
        <span>메모</span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="짧은 메모 (선택)" />
      </label>

      <button className="primary wide" type="submit" disabled={!valid}>
        {ev ? '저장' : '추가'}
      </button>
      {ev && (
        <button type="button" className="text-btn danger-text" onClick={() => (recurring ? setAskScope('delete') : delAll())}>
          일정 삭제
        </button>
      )}
    </form>
  )
}
