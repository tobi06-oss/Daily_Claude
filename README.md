# 온기 — Claude 시안 (Phase 1)

일기·달력·일정·할 일을 "하루 한 장"으로 묶은 개인 라이프 플래너의 **Claude 팀 시안**입니다.
공통 조건은 `Phase1_공통조건_확정본.md`를 따릅니다.

## 실행
```bash
npm install
npm run dev      # 개발 서버
npm run build    # dist/ 생성
```
`main` 브랜치에 올리면 GitHub Actions가 GitHub Pages로 자동 배포합니다.
(저장소 Settings → Pages → Source를 **GitHub Actions**로 한 번 설정)

## 화면
- **오늘**: 그날 일정 타임라인, 할 일(밀린 할 일 포함), 한 줄·긴 일기, 선택형 기분
- **달력**: 월간 달력(일정 점, 기분색) + 아래에 고른 날의 페이지. PC에서는 왼쪽에 항상 표시
- **일기**: 날짜별 모아보기와 검색
- **새로 적기(+)**: 한 줄로 쓰면 일정 / 할 일 / 일기를 자동으로 나눔

## 빠른 입력 예시
| 입력 | 결과 |
|---|---|
| 내일 오후 3시 치과 | 일정 · 내일 15:00–16:00 |
| 우유 사기 | 할 일 · 오늘 |
| 오늘은 바람이 차가웠지만 마음은 따뜻했다. | 일기(한 줄) · 오늘 |
| 금요일 7시 반 저녁 약속 | 일정 · 이번 금요일 19:30 |
| 매주 월화목금 14-19 근무 | 반복 일정 · 매주 월·화·목·금 14:00–19:00 |
| 주 3회 러닝 | 주간 목표 · 일주일에 3번 |

## 조작
- 할 일: 체크박스로 완료, 오른쪽으로 밀면 완료 / 왼쪽으로 밀면 내일로 (PC는 마우스를 올리면 "내일" 버튼)
- 삭제·추가 후 아래 알림의 **실행 취소**
- PC 단축키: `N` 새로 적기, `T` 오늘, `←` `→` 날짜 이동

## 구조
```
src/
  lib/types.ts    설계안 v0.2 필드 이름 그대로의 데이터 타입
  lib/store.ts    localStorage(lifeplanner.v1) 저장, 실행 취소
  lib/parse.ts    한국어 빠른 입력 해석
  lib/recur.ts    반복 일정 (RRULE 일부) 펼치기
  lib/sample.ts   공통 샘플 데이터
  components/     DayPage, MonthGrid, JournalList, Capture, EventEditor, TaskEditor, Sheet
```
