import { useState, useEffect } from 'react'
import { DatePicker, Tag, message } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { getTasks, toggleTask } from '../services/api'

export default function PublicTasksPage() {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [tripFilter, setTripFilter] = useState('全部')
  const [tasks, setTasks] = useState<any[]>([])
  const [tripFilters, setTripFilters] = useState<string[]>([])

  // Collect trip filters from all tasks on first mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await getTasks()
        const data = res.data || []
        const filters = Array.from(
          new Set(data.map((t: any) => t.trip_filter).filter(Boolean))
        ) as string[]
        setTripFilters(filters)
      } catch { /* keep empty */ }
    }
    loadFilters()
  }, [])

  const loadTasks = async () => {
    try {
      const d = selectedDate.format('YYYY-MM-DD')
      const f = tripFilter === '全部' ? 'all' : tripFilter
      const res = await getTasks(d, f)
      setTasks(res.data)
    } catch { setTasks([]) }
  }

  useEffect(() => { loadTasks() }, [selectedDate, tripFilter])

  const handleToggle = async (id: number) => {
    try {
      await toggleTask(id, selectedDate.format('YYYY-MM-DD'))
      message.success('操作成功')
      loadTasks()
    } catch {
      message.error('操作失败')
    }
  }

  const totalCount = tasks.length

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <style>{`.public-task-row:hover { background: #f8fafc !important; }`}</style>

      {/* Title row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, marginBottom: 16,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>每日任务</h2>
        <DatePicker
          value={selectedDate}
          onChange={(d) => setSelectedDate(d || dayjs())}
        />
      </div>

      {/* Filter buttons */}
      {tripFilters.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {['全部', ...tripFilters].map((f) => (
            <button
              key={f}
              onClick={() => setTripFilter(f)}
              style={{
                padding: '4px 16px',
                borderRadius: 16,
                border: f === tripFilter ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: f === tripFilter ? '#2563eb' : '#fff',
                color: f === tripFilter ? '#fff' : '#64748b',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Task count */}
      <div style={{
        fontSize: 14, fontWeight: 600, color: '#94a3b8',
        marginBottom: 16,
      }}>
        {selectedDate.format('YYYY-MM-DD')} 任务 ({totalCount}项)
      </div>

      {/* Task list */}
      {totalCount === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: '#94a3b8',
          fontSize: 14,
        }}>
          当天暂无任务
        </div>
      ) : (
        <div>
          {tasks.map((task: any) => {
            const isCompleted = task.is_completed
            return (
              <div
                key={task.id}
                onClick={() => handleToggle(task.id)}
                className="public-task-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  marginBottom: 8,
                  borderRadius: 8,
                  border: '1px solid #f1f5f9',
                  background: '#fff',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {/* Dot */}
                <span style={{
                  width: 10, height: 10, minWidth: 10,
                  borderRadius: '50%',
                  background: isCompleted ? '#10b981' : '#3b82f6',
                  display: 'inline-block',
                }} />

                {/* Time */}
                <span style={{
                  fontWeight: 700, fontSize: 14, color: '#3b82f6',
                  minWidth: 45,
                }}>
                  {task.task_time || '--:--'}
                </span>

                {/* Title */}
                <span style={{
                  flex: 1, fontSize: 14,
                  textDecoration: isCompleted ? 'line-through' : 'none',
                  color: isCompleted ? '#94a3b8' : '#1e293b',
                }}>
                  {task.title}
                </span>

                {/* Trip filter tag */}
                {task.trip_filter && (
                  <Tag color="blue" style={{ margin: 0 }}>{task.trip_filter}</Tag>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
