import { useState, useEffect } from 'react'
import { Button, DatePicker, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { getTasks, toggleTask } from '../services/api'

export default function PublicTasksPage() {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [tripFilter, setTripFilter] = useState('全部')
  const [tasks, setTasks] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [tripFilters, setTripFilters] = useState<string[]>([])

  // Collect trip filters from all tasks on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await getTasks()
        const data = res.data || []
        const filters = Array.from(
          new Set(data.map((t: any) => t.trip_filter).filter(Boolean))
        ) as string[]
        if (filters.length > 0) setTripFilters(filters)
      } catch { /* keep empty */ }
    }
    loadFilters()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try { await loadTasks() } finally { setRefreshing(false) }
  }

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
      const toggleDate = selectedDate.format('YYYY-MM-DD')
      await toggleTask(id, toggleDate)
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t
          return { ...t, is_completed: !t.is_completed }
        })
      )
    } catch { /* silently fail */ }
  }

  const completedCount = tasks.filter((t) => t.is_completed).length
  const totalCount = tasks.length
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', background: '#f2f2f7', minHeight: '100vh', padding: 16 }}>
      <style>{`
        .pub-task-row { cursor: pointer; transition: background 0.15s; }
        .pub-task-row:hover { background: #f5f9ff !important; }
        .pub-filter-btn:hover { background: #e6f7ff !important; border-color: #91caff !important; }
      `}</style>

      {/* Header Card */}
      <div style={{ background: '#fff', borderRadius: 8, padding: '20px 24px', marginBottom: 16 }}>
        {/* Title row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#262626' }}>每日任务</span>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              loading={refreshing}
              onClick={handleRefresh}
            >
              刷新
            </Button>
            <DatePicker
              value={selectedDate}
              onChange={(d) => setSelectedDate(d || dayjs())}
              size="small"
            />
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginBottom: 6, fontSize: 12, color: '#666',
          }}>
            <span>完成进度</span>
            <span>{completedCount} / {totalCount}（{percent}%）</span>
          </div>
          <div style={{ height: 6, background: '#e8e8e8', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${percent}%`, height: 6, background: '#1890ff',
              borderRadius: 3, transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Filter capsule buttons */}
        {tripFilters.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['全部', ...tripFilters].map((f) => (
              <button
                key={f}
                className="pub-filter-btn"
                onClick={() => setTripFilter(f)}
                style={tripFilter === f ? {
                  padding: '4px 14px', fontSize: 12, borderRadius: 4,
                  background: '#1890ff', color: '#fff', border: '1px solid #1890ff',
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                  lineHeight: '20px',
                } : {
                  padding: '4px 14px', fontSize: 12, borderRadius: 4,
                  background: '#fafafa', color: '#333', border: '1px solid #d9d9d9',
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                  lineHeight: '20px',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Task List — flat rows with left color bar */}
      {totalCount === 0 ? (
        <div style={{
          background: '#fff', borderRadius: 8, padding: 40,
          textAlign: 'center', color: '#999', fontSize: 14,
        }}>
          当天暂无任务
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          {tasks.map((task: any) => {
            const isCompleted = task.is_completed
            return (
              <div
                key={task.id}
                onClick={() => handleToggle(task.id)}
                className="pub-task-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px 12px 20px',
                  borderLeft: `4px solid ${isCompleted ? '#52c41a' : '#1890ff'}`,
                  borderBottom: '1px solid #f5f5f5',
                  opacity: isCompleted ? 0.55 : 1,
                }}
              >
                <span style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: isCompleted ? 'line-through' : 'none',
                  color: isCompleted ? '#999' : '#262626',
                }}>
                  {task.title}
                </span>
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
