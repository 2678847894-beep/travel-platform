import { useState, useEffect } from 'react'
import { Card, Button, Space, Segmented, Modal, Form, Input, DatePicker, TimePicker, Select, Checkbox, message, Tag } from 'antd'
import { PlusOutlined, CalendarOutlined, UnorderedListOutlined, ExportOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getTasks, createTask, toggleTask, deleteTask } from '../services/api'
import { useAuthStore } from '../store/authStore'

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list')
  const [tasks, setTasks] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [tripFilter, setTripFilter] = useState('全部')
  const [modalOpen, setModalOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const loadTasks = async () => {
    const res = await getTasks(selectedDate, tripFilter)
    setTasks(res.data)
  }

  useEffect(() => { loadTasks() }, [selectedDate, tripFilter])

  const handleToggle = async (id: number) => {
    await toggleTask(id)
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, is_completed: !t.is_completed } : t)))
  }

  const handleAdd = async (values: any) => {
    await createTask({
      ...values,
      task_date: values.task_date.format('YYYY-MM-DD'),
      task_time: values.task_time ? values.task_time.format('HH:mm') : '',
    })
    message.success('任务已添加')
    setModalOpen(false)
    loadTasks()
  }

  const handleDelete = async (id: number) => {
    await deleteTask(id)
    message.success('已删除')
    loadTasks()
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>每日任务</h2>
            <Segmented
              options={[
                { label: <><CalendarOutlined /> 日历</>, value: 'calendar' },
                { label: <><UnorderedListOutlined /> 列表</>, value: 'list' },
              ]}
              value={viewMode}
              onChange={(v) => setViewMode(v as 'calendar' | 'list')}
            />
          </div>
          <Space>
            <DatePicker value={dayjs(selectedDate)} onChange={(d) => setSelectedDate(d?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'))} />
            <Segmented options={['全部', '香港', '日本', '欧洲', '国内']} value={tripFilter} onChange={(v) => setTripFilter(v as string)} />
            {isAdmin && <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>新增任务</Button>}
          </Space>
        </div>
      </Card>

      {/* 日历视图 */}
      {viewMode === 'calendar' && (
        <Card>
          <DatePicker
            
            style={{ width: '100%' }}
            value={dayjs(selectedDate)}
            onChange={(d) => setSelectedDate(d?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'))}
            open
            // 使用简单日历展示
          />
        </Card>
      )}

      {/* 时间轴列表 */}
      <Card title={`${selectedDate} 任务 (${tasks.length}项)`}>
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>当天暂无任务</div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            {/* 时间轴线 */}
            <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: '#e2e8f0' }} />
            {tasks.map((task) => (
              <div key={task.id} style={{ position: 'relative', marginBottom: 20, paddingLeft: 24 }}>
                {/* 时间点 */}
                <div style={{
                  position: 'absolute', left: -20, top: 4, width: 14, height: 14, borderRadius: '50%',
                  background: task.is_completed ? '#10b981' : '#3b82f6', border: '2px solid #fff',
                  boxShadow: '0 0 0 2px #3b82f6',
                }} />
                <div className="card" style={{ padding: '12px 16px', opacity: task.is_completed ? 0.6 : 1 }}
                  onClick={() => handleToggle(task.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: 15 }}>{task.task_time || '--:--'}</span>
                      <span style={{ textDecoration: task.is_completed ? 'line-through' : 'none', fontWeight: 600 }}>
                        {task.title}
                      </span>
                    </div>
                    <Space>
                      {task.location && <Tag>{task.location}</Tag>}
                      {task.trip_filter !== '全部' && <Tag color="blue">{task.trip_filter}</Tag>}
                      {isAdmin && (
                        <Button type="text" size="small" danger onClick={(e) => { e.stopPropagation(); handleDelete(task.id) }}>删除</Button>
                      )}
                    </Space>
                  </div>
                  {task.description && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, marginLeft: 52 }}>{task.description}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 新增任务弹窗 */}
      <Modal title="新增任务" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form onFinish={handleAdd} layout="vertical">
          <Form.Item name="title" label="任务名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 出发前往机场" />
          </Form.Item>
          <Form.Item name="task_date" label="日期" rules={[{ required: true }]} initialValue={dayjs(selectedDate)}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="task_time" label="时间">
            <TimePicker style={{ width: '100%' }} format="HH:mm" />
          </Form.Item>
          <Form.Item name="location" label="地点">
            <Input placeholder="例如: 香港四季酒店" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="trip_filter" label="差旅项目" initialValue="全部">
            <Select options={['全部', '香港', '日本', '欧洲', '国内'].map((v) => ({ label: v, value: v }))} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>添加</Button>
        </Form>
      </Modal>
    </div>
  )
}
