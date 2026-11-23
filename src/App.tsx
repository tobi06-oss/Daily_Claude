import { useCallback, useEffect, useState } from 'react'
import { Capture } from './components/Capture'
import { DayPage } from './components/DayPage'
import { EventEditor } from './components/EventEditor'
import { JournalList } from './components/JournalList'
import { MonthGrid } from './components/MonthGrid'
import { Sheet } from './components/Sheet'
import { TaskEditor } from './components/TaskEditor'
import { addDays, logicalToday } from './lib/date'
import { getData, replaceAll, resetSample, undo, useData } from './lib/store'
import type { Data } from './lib/types'
import { closeSheet, hideToast, openSheet, toast, useUI } from './lib/ui'

type View = 'today' | 'calendar' | 'journal'

function useToday() {
  const data = useData()
  const [t, setT] = useState(() => logicalToday(data.settings.day_start_hour))
  useEffect(() => {
    const tick = () => setT(logicalToday(getData().settings.day_start_hour))
    const id = window.setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return t
}

function useWide() {
  const q = '(min-width: 960px)'
  const [w, setW] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setW(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return w
}

export default function App() {
  const today = useToday()
  const wide = useWide()
  const ui = useUI()
  const [view, setView] = useState<View>('today')
  const [sel, setSel] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))

  const pick = useCallback((d: string) => {
    setSel(d)
    setMonth(d.slice(0, 7))
  }, [])

  const goToday = useCallback(() => {
    pick(today)
    setView('today')
  }, [pick, today])

  // 데스크톱 단축키: N 새 입력, T 오늘, ←/→ 날짜 이동
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (ui.sheet || e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return
      if (e.key === 'n' || e.key === 'N' || e.key === 'ㅜ') {
        e.preventDefault()
        openSheet({ kind: 'capture' })
      } else if (e.key === 't' || e.key === 'T' || e.key === 'ㅅ') goToday()
      else if (e.key === 'ArrowLeft') pick(addDays(sel, -1))
      else if (e.key === 'ArrowRight') pick(addDays(sel, 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ui.sheet, sel, pick, goToday])

  const dayView = view === 'today' ? (wide ? sel : sel) : sel
  const showDay = view !== 'journal'

  return (
    <div className={`app ${wide ? 'wide' : ''}`}>
      <header className="top">
        <span className="brand">
          <i aria-hidden className="logo" />
          온기
        </span>
        <button className="icon-btn" aria-label="설정" onClick={() => openSheet({ kind: 'settings' })}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <circle cx="5" cy="12" r="1.8" fill="currentColor" />
            <circle cx="12" cy="12" r="1.8" fill="currentColor" />
            <circle cx="19" cy="12" r="1.8" fill="currentColor" />
          </svg>
        </button>
      </header>

      <div className="layout">
        {(wide || view === 'calendar') && (
          <aside className="side">
            <MonthGrid
              month={month}
              sel={sel}
              today={today}
              onMonth={setMonth}
              onPick={(d) => {
                pick(d)
                if (wide && view === 'journal') setView('today')
              }}
            />
            {wide && (
              <p className="kbd">
                <kbd>N</kbd> 새로 적기 · <kbd>T</kbd> 오늘 · <kbd>←</kbd>
                <kbd>→</kbd> 날짜 이동
              </p>
            )}
          </aside>
        )}

        <main className="main">
          {showDay && (
            <DayPage
              date={view === 'today' && !wide ? dayView : sel}
              today={today}
              onDate={pick}
              compact={!wide && view === 'calendar'}
            />
          )}
          {view === 'journal' && (
            <JournalList
              today={today}
              onOpen={(d) => {
                pick(d)
                setView('today')
              }}
            />
          )}
        </main>
      </div>

      <nav className="tabs" aria-label="화면">
        <Tab on={view === 'today'} label="오늘" onClick={goToday} icon="sun" />
        {!wide && <Tab on={view === 'calendar'} label="달력" onClick={() => setView('calendar')} icon="cal" />}
        <button className="fab" aria-label="새로 적기" onClick={() => openSheet({ kind: 'capture' })}>
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
        <Tab on={view === 'journal'} label="일기" onClick={() => setView('journal')} icon="book" />
        {wide && <span className="tab-spacer" />}
      </nav>

      {ui.sheet?.kind === 'capture' && (
        <Sheet title="새로 적기" onClose={closeSheet}>
          <Capture baseDate={view === 'journal' ? today : sel} today={today} initial={ui.sheet.type} />
        </Sheet>
      )}
      {ui.sheet?.kind === 'event' && (
        <Sheet title={ui.sheet.eventId ? '일정' : '새 일정'} onClose={closeSheet}>
          <EventEditor eventId={ui.sheet.eventId} date={ui.sheet.date} start={ui.sheet.start} />
        </Sheet>
      )}
      {ui.sheet?.kind === 'task' && (
        <Sheet title="할 일" onClose={closeSheet}>
          <TaskEditor taskId={ui.sheet.taskId} />
        </Sheet>
      )}
      {ui.sheet?.kind === 'settings' && (
        <Sheet title="설정" onClose={closeSheet}>
          <Settings />
        </Sheet>
      )}

      {ui.toast && (
        <div className="toast" role="status" key={ui.toast.id}>
          <span>{ui.toast.msg}</span>
          {ui.toast.undo && (
            <button
              onClick={() => {
                undo()
                hideToast()
              }}
            >
              실행 취소
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Tab({ on, label, onClick, icon }: { on: boolean; label: string; onClick: () => void; icon: 'sun' | 'cal' | 'book' }) {
  const paths = {
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
      </>
    ),
    cal: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </>
    ),
    book: (
      <>
        <path d="M5 5.5A2.5 2.5 0 017.5 3H19v15H7.5A2.5 2.5 0 005 20.5z" />
        <path d="M5 20.5A2.5 2.5 0 017.5 18H19v3H7.5" />
      </>
    ),
  }
  return (
    <button className={`tab ${on ? 'on' : ''}`} onClick={onClick} aria-current={on ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {paths[icon]}
      </svg>
      <span>{label}</span>
    </button>
  )
}

function Settings() {
  const data = useData()
  const [json, setJson] = useState('')
  return (
    <div className="form">
      <p className="note">
        Phase 1 시안이라 기록은 <b>이 기기의 브라우저에만</b> 저장돼요. 동기화는 통합 단계에서 붙어요.
      </p>
      <button
        className="secondary wide"
        onClick={async () => {
          const s = JSON.stringify(data, null, 2)
          try {
            await navigator.clipboard.writeText(s)
            toast('백업 데이터를 복사했어요')
          } catch {
            setJson(s)
          }
        }}
      >
        백업 데이터 복사 (JSON)
      </button>
      <label className="field">
        <span>백업 붙여넣기로 복원</span>
        <textarea rows={3} value={json} onChange={(e) => setJson(e.target.value)} placeholder="복사해 둔 JSON을 붙여 넣으세요" />
      </label>
      <button
        className="secondary wide"
        disabled={!json.trim()}
        onClick={() => {
          try {
            const d = JSON.parse(json) as Data
            if (d.version !== 1 || !Array.isArray(d.events)) throw new Error('형식')
            replaceAll(d)
            toast('복원했어요', true)
            closeSheet()
          } catch {
            toast('백업 형식이 맞지 않아요')
          }
        }}
      >
        복원하기
      </button>
      <button
        className="text-btn danger-text"
        onClick={() => {
          resetSample()
          toast('샘플 데이터로 되돌렸어요', true)
          closeSheet()
        }}
      >
        샘플 데이터로 초기화
      </button>
    </div>
  )
}
