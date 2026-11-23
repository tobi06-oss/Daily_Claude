import { addDays, nowIso, uid, weekday } from './date'
import type { Data, EventItem, JournalEntry, Task } from './types'

// 공통 조건 확정본 4절의 샘플 데이터. D = 처음 연 날(하루 시작 시각 반영).
const meta = () => {
  const n = nowIso()
  return { id: uid(), created_at: n, updated_at: n, deleted_at: null, rev: 1 }
}

export function sampleData(D: string): Data {
  const ev = (
    date: string,
    s: string,
    e: string,
    title: string,
    rrule: string | null = null,
    color_key: EventItem['color_key'] = 'sage'
  ): EventItem => ({
    ...meta(),
    title,
    note: '',
    start_at: `${date}T${s}`,
    end_at: `${date}T${e}`,
    all_day: false,
    tz: 'Asia/Seoul',
    rrule,
    color_key,
    remind_minutes: [],
  })
  const task = (due: string, title: string, done: boolean, i: number): Task => ({
    ...meta(),
    title,
    due_date: due,
    due_at: null,
    done_at: done ? nowIso() : null,
    sort_order: i,
    event_id: null,
  })
  const je = (date: string, kind: 'line' | 'long', body: string, mood: number | null): JournalEntry => ({
    ...meta(),
    local_date: date,
    kind,
    body,
    mood,
    written_at: `${date}T21:30`,
  })
  // 주간 정리: D 기준 가장 가까운 지난(또는 오늘) 일요일부터 매주 일요일
  const lastSunday = addDays(D, -weekday(D))

  return {
    version: 1,
    events: [
      ev(D, '19:30', '20:30', '저녁 러닝'),
      ev(addDays(D, 1), '11:00', '12:00', '은행 업무', null, 'sand'),
      ev(addDays(D, 3), '18:30', '21:00', '친구 저녁 약속', null, 'coral'),
      ev(addDays(D, -2), '10:00', '11:00', '치과 정기검진', null, 'sand'),
      ev(lastSunday, '08:00', '09:00', '주간 정리', 'FREQ=WEEKLY;BYDAY=SU'),
    ],
    event_exceptions: [],
    tasks: [
      task(D, '택배 보내기', true, 0),
      task(D, '우유랑 계란 사기', false, 1),
      task(D, '영양제 주문하기', false, 2),
      task(addDays(D, -1), '도서관 책 반납', false, 3),
      task(addDays(D, 2), '이불 빨래', false, 4),
    ],
    journal_entries: [
      je(addDays(D, -1), 'line', '퇴근길 붕어빵이 따뜻했다.', 2),
      je(
        addDays(D, -1),
        'long',
        '봉투를 손에 쥐고 걸으니 손끝부터 녹는 기분이었다. 별일 없는 하루였는데, 이런 날이 쌓여서 좋은 한 해가 되는 거겠지.',
        2
      ),
      je(addDays(D, -3), 'line', '비 오는 날, 조용히 책 읽기.', 3),
      je(addDays(D, -6), 'line', '일이 많아서 조금 지쳤다.', 5),
      je(addDays(D, -10), 'line', '오랜만에 친구와 긴 통화.', null),
    ],
    settings: { day_start_hour: 4 },
  }
}
