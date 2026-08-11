import { useState, useEffect } from 'react'
import { DatePicker, Tag, message } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { getTasks, toggleTask, getTripTemplates } from '../services/api'

const DEFAULT_TRIP_FILTERS = ['香港差旅', '欧洲差旅', '日本差旅', '国内差旅']

export default function TodayPage() {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [tripFilter, setTripFilter] = useState('香港差旅')
  const [tasks, setTasks] = useState<any[]>([])
  const [tripFilters, setTripFilters] = useState<string[]>(DEFAULT_TRIP_FILTERS)

  // Load trip filters from API
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await getTripTemplates()
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const seen = new Set<string>()
          const unique = res.data
            .map((t: any) => t.name)
            .filter((name: string) => {
              if (seen.has(name)) return false
              seen.add(name)
              return true
            })
          if (unique.length > 0) setTripFilters(unique)
        }
      } catch { /* keep defaults */ }
    }
    loadFilters()
  }, [])

  const loadTasks = async (dateStr?: string, filterStr?: string) => {
    try {
      const d = dateStr || selectedDate.format('YYYY-MM-DD')
      const rawFilter = filterStr ?? tripFilter
      const f = rawFilter === '全部' ? 'all' : rawFilter
      const res = await getTasks(d, f)
      setTasks(res.data)
    } catch { setTasks([]) }
  }

  useEffect(() => { loadTasks() }, [selectedDate, tripFilter])

  const handleToggle = async (id: number) => {
    try {
      const toggleDate = selectedDate.format('YYYY-MM-DD')
      await toggleTask(id, toggleDate)
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t
          const wasCompleted = t.completed_date === toggleDate
          return {
            ...t,
            completed_date: wasCompleted ? null : toggleDate,
            is_completed: !wasCompleted,
            is_overdue: !wasCompleted ? false : (t.task_date < toggleDate && t.completed_date !== toggleDate),
          }
        })
      )
    } catch { message.error('操作失败') }
  }

  const completedCount = tasks.filter((t) => t.is_completed).length
  const totalCount = tasks.length

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', background: '#f5f5f5', minHeight: '100vh', padding: 16 }}>
      {/* Title row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, marginBottom: 16,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>每日任务</h2>
        <DatePicker
          value={selectedDate}
          onChange={(d) => setSelectedDate(d || dayjs())}
        />
      </div>

      {/* Filter buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {['全部', ...tripFilters].map((f) => (
          <button
            key={f}
            onClick={() => setTripFilter(f)}
            style={{
              padding: '4px 15px',
              borderRadius: 6,
              border: f === tripFilter ? '1px solid #1677ff' : '1px solid #d9d9d9',
              background: f === tripFilter ? '#1677ff' : '#fff',
              color: f === tripFilter ? '#fff' : '#333',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Subtitle: date + task count */}
      <div style={{
        fontSize: 14, fontWeight: 600, color: '#595959',
        marginBottom: 16, paddingLeft: 2,
      }}>
        {selectedDate.format('YYYY-MM-DD')} 任务 ({totalCount}项)
      </div>

      {/* Task list */}
      {totalCount === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: '#bfbfbf',
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderBottom: '1px solid #f0f0f0',
                  background: '#fff',
                  cursor: 'pointer',
                  opacity: isCompleted ? 0.55 : 1,
                  transition: 'background 0.15s',
                }}
                className="task-list-row"
              >
                {/* Dot */}
                <span style={{
                  width: 14, height: 14, minWidth: 14,
                  borderRadius: '50%',
                  background: isCompleted ? '#52c41a' : '#1677ff',
                  display: 'inline-block',
                }} />

                {/* Time */}
                <span style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: '#1677ff',
                  minWidth: 50,
                }}>
                  {task.task_time || '--:--'}
                </span>

                {/* Title */}
                <span style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: 500,
                  color: '#262626',
                  textDecoration: isCompleted ? 'line-through' : 'none',
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

      <style>{`
        .task-list-row:hover { background: #f0f5ff !important; }
      `}</style>
    </div>
  )
}
