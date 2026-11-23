import { useState } from 'react'
import { deleteTask, getData, updateTask } from '../lib/store'
import { closeSheet, toast } from '../lib/ui'

export function TaskEditor({ taskId }: { taskId: string }) {
  const t = getData().tasks.find((x) => x.id === taskId)
  const [title, setTitle] = useState(t?.title ?? '')
  const [due, setDue] = useState(t?.due_date ?? '')
  if (!t) return null
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        updateTask(t.id, { title: title.trim(), due_date: due || null })
        toast('할 일을 고쳤어요')
        closeSheet()
      }}
    >
      <input className="title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="할 일" />
      <label className="field">
        <span>날짜</span>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      </label>
      <button className="primary wide" type="submit" disabled={!title.trim()}>
        저장
      </button>
      <button
        type="button"
        className="text-btn danger-text"
        onClick={() => {
          deleteTask(t.id)
          toast('할 일을 지웠어요', true)
          closeSheet()
        }}
      >
        할 일 삭제
      </button>
    </form>
  )
}
