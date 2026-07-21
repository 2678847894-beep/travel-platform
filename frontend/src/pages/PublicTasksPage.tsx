import { useState, useEffect } from 'react'
import { Card, Segmented, Tag, DatePicker } from 'antd'
import dayjs from 'dayjs'
import { getTasks } from '../services/api'

export default function PublicTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [tripFilter, setTripFilter] = useState('全部')

  const loadTasks = async () => {
    try {
      const res = await getTasks(selectedDate, tripFilter)
      setTasks(res.data)
    } catch { /* silently handle */ }
  }

  useEffect(() => { loadTasks() }, [selectedDate, tripFilter])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>每日任务</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <DatePicker value={dayjs(selectedDate)} onChange={(d) => setSelectedDate(d?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'))} />
            <Segmented options={['全部', '香港', '日本', '欧洲', '国内']} value={tripFilter} onChange={(v) => setTripFilter(v as string)} />
          </div>
        </div>
      </Card>

      <Card title={`${selectedDate} 任务 (${tasks.length}项)`}>
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>当天暂无任务</div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: '#e2e8f0' }} />
            {tasks.map((task) => (
              <div key={task.id} style={{ position: 'relative', marginBottom: 20, paddingLeft: 24 }}>
                <div style={{
                  position: 'absolute', left: -20, top: 4, width: 14, height: 14, borderRadius: '50%',
                  background: task.is_completed ? '#10b981' : '#3b82f6', border: '2px solid #fff',
                  boxShadow: '0 0 0 2px #3b82f6',
                }} />
                <div className="card" style={{ padding: '12px 16px', opacity: task.is_completed ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: 15 }}>{task.task_time || '--:--'}</span>
                      <span style={{ textDecoration: task.is_completed ? 'line-through' : 'none', fontWeight: 600 }}>
                        {task.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {task.location && <Tag>{task.location}</Tag>}
                      {task.trip_filter !== '全部' && <Tag color="blue">{task.trip_filter}</Tag>}
                    </div>
                  </div>
                  {task.description && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, marginLeft: 52 }}>{task.description}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
