import { useState, useEffect } from 'react'
import { Button, DatePicker, Checkbox, Tag, Empty, Grid } from 'antd'
import { ReloadOutlined, CalendarOutlined, UpOutlined, DownOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { getTasks, toggleTask, getTripTemplates } from '../services/api'

const DEFAULT_TRIP_FILTERS = ['香港差旅', '欧洲差旅', '日本差旅', '国内差旅']

export default function TodayPage() {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [tripFilter, setTripFilter] = useState('全部')
  const [tasks, setTasks] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [tripFilters, setTripFilters] = useState<string[]>(DEFAULT_TRIP_FILTERS)

  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const toggleCategoryCollapse = (catKey: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catKey)) next.delete(catKey)
      else next.add(catKey)
      return next
    })
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadTasks()
    } finally {
      setRefreshing(false)
    }
  }

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
    } catch { /* silently fail for readonly mode */ }
  }

  const completedCount = tasks.filter((t) => t.is_completed).length
  const totalCount = tasks.length
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Group all tasks by category
  const catGroups: Record<string, any[]> = {}
  const catOrder: string[] = []
  tasks.forEach((task: any) => {
    const cat = (task.category && task.category.trim()) || '其他'
    if (!catGroups[cat]) {
      catGroups[cat] = []
      catOrder.push(cat)
    }
    catGroups[cat].push(task)
  })

  const filterCapsuleStyle: React.CSSProperties = {
    padding: '4px 14px',
    fontSize: 12,
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    background: '#fafafa',
    color: '#333',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    lineHeight: '20px',
  }

  const filterCapsuleActive: React.CSSProperties = {
    ...filterCapsuleStyle,
    background: '#1890ff',
    color: '#fff',
    borderColor: '#1890ff',
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', background: '#f2f2f7', minHeight: '100vh', padding: 16 }}>
      <style>{`
        .task-row { cursor: pointer; transition: background 0.15s; }
        .task-row:hover { background: #f5f9ff !important; }
        .task-row.task-overdue:hover { background: #fff2e0 !important; }
        .filter-btn:hover { background: #e6f7ff !important; border-color: #91caff !important; }
      `}</style>

      {/* Header Section — white card */}
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
              width: `${percent}%`,
              height: 6,
              background: '#1890ff',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Filter buttons — capsule style */}
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap',
          overflowX: isMobile ? 'auto' : 'visible',
        }}>
          {['全部', ...tripFilters].map((f) => (
            <button
              key={f}
              className="filter-btn"
              onClick={() => setTripFilter(f)}
              style={tripFilter === f ? filterCapsuleActive : filterCapsuleStyle}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Task List — flat groups with blue left-border */}
      {tasks.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 8, padding: 40 }}>
          <Empty description="当天暂无任务" />
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          {catOrder.map((catKey, idx) => {
            const catTasks = catGroups[catKey]
            const catDone = catTasks.filter((t: any) => t.is_completed).length
            const catTotal = catTasks.length
            const isCollapsed = collapsedCategories.has(catKey)

            return (
              <div key={catKey}>
                {/* Group header — blue left border */}
                <div
                  onClick={() => toggleCategoryCollapse(catKey)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    borderLeft: '4px solid #1890ff',
                    background: idx === 0 ? 'transparent' : 'transparent',
                    borderBottom: isCollapsed ? 'none' : '1px solid #f0f0f0',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#262626' }}>
                    {catKey}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#999' }}>
                      {catDone}/{catTotal}
                    </span>
                    {isCollapsed
                      ? <DownOutlined style={{ fontSize: 10, color: '#bfbfbf' }} />
                      : <UpOutlined style={{ fontSize: 10, color: '#bfbfbf' }} />}
                  </span>
                </div>

                {/* Tasks within this group */}
                {!isCollapsed && catTasks.map((task: any) => {
                  const isCompleted = task.is_completed
                  const isOverdue = task.is_overdue
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleToggle(task.id)}
                      className={`task-row${isOverdue && !isCompleted ? ' task-overdue' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '10px 16px 10px 20px',
                        borderBottom: '1px solid #f5f5f5',
                        borderLeft: '2px solid #91caff',
                        opacity: isCompleted ? 0.55 : 1,
                        ...(isOverdue && !isCompleted ? { background: '#fff2f0' } : {}),
                      }}
                    >
                      <Checkbox
                        checked={isCompleted}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => handleToggle(task.id)}
                        style={{ marginTop: 4 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 600,
                          fontSize: 14,
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          color: isOverdue && !isCompleted ? '#ff4d4f' : '#262626',
                        }}>
                          {task.title}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                          {task.task_time && (
                            <Tag>{task.task_time}{task.end_time ? ` - ${task.end_time}` : ''}</Tag>
                          )}
                          {task.end_date && (
                            <Tag style={{
                              background: '#f0e6ff', color: '#722ed1', border: 'none',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                              <CalendarOutlined style={{ fontSize: 11 }} />
                              至 {dayjs(task.end_date).format('MM/DD')}
                            </Tag>
                          )}
                          {task.location && <Tag color="orange">{task.location}</Tag>}
                          {isOverdue && !isCompleted && <Tag color="red">已过期</Tag>}
                        </div>
                        {task.description && (
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                            {task.description}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
