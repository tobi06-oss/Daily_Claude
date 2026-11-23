import { useEffect, useMemo, useRef, useState } from 'react'
import { addMinutes, fmtShort, fmtTime, relLabel } from '../lib/date'
import { parseCapture, type CaptureType } from '../lib/parse'
import { ruleLabel } from '../lib/recur'
import { addEvent, addTask, entryOf, saveEntry } from '../lib/store'
import { closeSheet, haptic, toast } from '../lib/ui'

const TYPES: { k: CaptureType; label: string }[] = [
  { k: 'event', label: '일정' },
  { k: 'task', label: '할 일' },
  { k: 'journal', label: '일기' },
]

const EXAMPLES = ['내일 오후 3시 치과', '우유 사기', '매주 월화목금 14-19 근무', '오늘 하늘이 유난히 맑았다.']

export function Capture({ baseDate, today, initial }: { baseDate: string; today: string; initial?: CaptureType }) {
  const [text, setText] = useState('')
  const [forced, setForced] = useState<CaptureType | null>(initial ?? null)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])

  const p = useMemo(() => parseCapture(text, today), [text, today])
  const type = forced ?? p.type
  const date = p.date ?? baseDate
  const start = p.start ?? (type === 'event' ? '09:00' : null)
  const end = p.end ?? (start ? addMinutes(start, 60) : null)
  const rel = relLabel(date, today)

  const save = () => {
    const raw = text.trim()
    if (!raw) return
    haptic()
    if (type === 'event') {
      addEvent({
        title: p.title || raw,
        note: '',
        start_at: `${date}T${start}`,
        end_at: `${date}T${end}`,
        all_day: false,
        tz: 'Asia/Seoul',
        rrule: p.rrule,
        color_key: 'sage',
        remind_minutes: [],
      })
      toast(`일정 추가 · ${fmtShort(date)} ${start}${p.rrule ? ` · ${ruleLabel(p.rrule)}` : ''}`, true)
    } else if (type === 'task') {
      addTask(p.type === 'task' ? p.title : raw, date)
      toast(`할 일 추가 · ${rel || fmtShort(date)}`, true)
    } else {
      const line = entryOf(date, 'line')
      if (!line?.body.trim()) saveEntry(date, 'line', raw)
      else {
        const long = entryOf(date, 'long')
        saveEntry(date, 'long', long?.body.trim() ? `${long.body}\n${raw}` : raw)
      }
      toast(`일기에 남김 · ${rel || fmtShort(date)}`, true)
    }
    closeSheet()
  }

  return (
    <div className="capture">
      <div className="chips" role="radiogroup" aria-label="종류">
        {TYPES.map((t) => (
          <button
            key={t.k}
            role="radio"
            aria-checked={type === t.k}
            className={`chip chip-${t.k} ${type === t.k ? 'on' : ''}`}
            onClick={() => setForced(forced === t.k ? null : t.k)}
          >
            {t.label}
            {type === t.k && !forced && text && <span className="auto">자동</span>}
          </button>
        ))}
      </div>

      <textarea
        ref={ref}
        className="capture-input"
        rows={2}
        placeholder="무엇이든 적어 보세요"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            save()
          }
        }}
        enterKeyHint="done"
      />

      {text.trim() ? (
        <div className={`preview pv-${type}`} aria-live="polite">
          <span className="pv-title">{type === 'journal' ? '한 줄 기록' : p.title || text}</span>
          <span className="pv-meta">
            {rel ? `${rel} · ` : ''}
            {fmtShort(date)}
            {type === 'event' && start && ` · ${fmtTime(start)}${end ? `–${fmtTime(end)}` : ''}`}
            {type === 'event' && p.rrule && ` · ${ruleLabel(p.rrule)}`}
          </span>
        </div>
      ) : (
        <div className="examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} className="ex" onClick={() => setText(ex)}>
              {ex}
            </button>
          ))}
        </div>
      )}

      <button className="primary wide" disabled={!text.trim()} onClick={save}>
        {type === 'event' ? '일정 추가' : type === 'task' ? '할 일 추가' : '일기에 남기기'}
      </button>
      <p className="hint">Enter로 저장 · 종류가 틀리면 위에서 바꿔 주세요</p>
    </div>
  )
}
