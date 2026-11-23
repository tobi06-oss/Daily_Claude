import { useState } from 'react'
import { addDays, fmtLong, pad, weekday } from '../lib/date'
import { getData, logSleep, removeSleep, sleepMinutes, sleepOf, useData } from '../lib/store'
import { closeSheet, haptic, openSheet, toast } from '../lib/ui'

export const hm = (at: string) => at.slice(11, 16)
export const dur = (m: number) => `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}`
const avgHM = (mins: number[]) => {
  const a = Math.round(mins.reduce((x, y) => x + y, 0) / mins.length)
  return `${pad(Math.floor(a / 60) % 24)}:${pad(a % 60)}`
}

export function Sun() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </svg>
  )
}
export function Moon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden>
      <path d="M19.5 14.5A7.5 7.5 0 019.5 4.5a7.5 7.5 0 1010 10z" />
    </svg>
  )
}

/** 그날의 기상·취침 한 줄 + (오늘이면) 지금 누를 버튼 */
export function SleepRow({ date, today }: { date: string; today: string }) {
  const data = useData()
  const wake = sleepOf(date, 'wake')
  const sleep = sleepOf(date, 'sleep')
  const slept = sleepMinutes(date)
  const isToday = date === today
  const h = new Date().getHours()
  const ds = data.settings.day_start_hour
  const morning = h >= ds && h < 15
  const night = h >= 19 || h < ds

  // 이번 주 평균 (일~토)
  const sun = addDays(date, -weekday(date))
  const week = Array.from({ length: 7 }, (_, i) => addDays(sun, i)).filter((d) => d <= today)
  const mins = week.map(sleepMinutes).filter((m): m is number => m !== null)
  const wakes = week
    .map((d) => sleepOf(d, 'wake'))
    .filter(Boolean)
    .map((l) => Number(l!.at.slice(11, 13)) * 60 + Number(l!.at.slice(14, 16)))

  const press = (kind: 'wake' | 'sleep') => {
    const r = logSleep(kind)
    haptic()
    toast(`${kind === 'wake' ? '기상' : '취침'} ${hm(r.at)} 기록`, true)
  }

  const action = isToday && !wake && morning ? 'wake' : isToday && !sleep && night ? 'sleep' : null

  return (
    <div className="sleep">
      <div className="sleep-row">
        <button className={`sl ${wake ? 'set' : ''}`} onClick={() => openSheet({ kind: 'sleep', date })}>
          <span className="sl-ic wake">
            <Sun />
          </span>
          <span className="sl-t">
            <small>기상</small>
            <b>{wake ? hm(wake.at) : '—'}</b>
          </span>
        </button>
        <button className={`sl ${sleep ? 'set' : ''}`} onClick={() => openSheet({ kind: 'sleep', date })}>
          <span className="sl-ic night">
            <Moon />
          </span>
          <span className="sl-t">
            <small>취침</small>
            <b>{sleep ? hm(sleep.at) : '—'}</b>
          </span>
        </button>
        {action && (
          <button className={`sl-do ${action}`} onClick={() => press(action)}>
            {action === 'wake' ? <Sun /> : <Moon />}
            {action === 'wake' ? '일어났어요' : '잘게요'}
          </button>
        )}
      </div>
      {(slept || mins.length > 0) && (
        <p className="sleep-sum">
          {slept ? `지난밤 ${dur(slept)} 잤어요` : ''}
          {slept && mins.length > 1 ? ' · ' : ''}
          {mins.length > 1 && `이번 주 평균 ${dur(Math.round(mins.reduce((a, b) => a + b, 0) / mins.length))}`}
          {mins.length > 1 && wakes.length > 1 && ` · 평균 기상 ${avgHM(wakes)}`}
        </p>
      )}
    </div>
  )
}

/** 시간 고치기: 그날 아침 기상, 그날 밤 취침 */
export function SleepEditor({ date }: { date: string }) {
  const ds = getData().settings.day_start_hour
  const w = sleepOf(date, 'wake')
  const s = sleepOf(date, 'sleep')
  const [wake, setWake] = useState(w ? hm(w.at) : '07:00')
  const [sleep, setSleep] = useState(s ? hm(s.at) : '23:30')
  // 취침이 자정을 넘기면(하루 시작 시각 전) 다음 날짜의 시각으로 저장
  const sleepAt = (t: string) => `${Number(t.slice(0, 2)) < ds ? addDays(date, 1) : date}T${t}`
  return (
    <div className="form">
      <p className="note">{fmtLong(date)} — 아침에 일어난 시각과 그날 밤 잠든 시각</p>
      <div className="row">
        <label className="field">
          <span>기상</span>
          <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
        </label>
        <label className="field">
          <span>취침</span>
          <input type="time" value={sleep} onChange={(e) => setSleep(e.target.value)} />
        </label>
      </div>
      <div className="row">
        <button
          className="secondary wide"
          onClick={() => {
            logSleep('wake', `${date}T${wake}`)
            toast(`기상 ${wake}로 저장`)
            closeSheet()
          }}
        >
          기상 저장
        </button>
        <button
          className="secondary wide"
          onClick={() => {
            logSleep('sleep', sleepAt(sleep))
            toast(`취침 ${sleep}로 저장`)
            closeSheet()
          }}
        >
          취침 저장
        </button>
      </div>
      {(w || s) && (
        <div className="row">
          {w && (
            <button
              className="text-btn danger-text wide"
              onClick={() => {
                removeSleep(w.id)
                toast('기상 기록을 지웠어요', true)
                closeSheet()
              }}
            >
              기상 기록 삭제
            </button>
          )}
          {s && (
            <button
              className="text-btn danger-text wide"
              onClick={() => {
                removeSleep(s.id)
                toast('취침 기록을 지웠어요', true)
                closeSheet()
              }}
            >
              취침 기록 삭제
            </button>
          )}
        </div>
      )}
    </div>
  )
}
