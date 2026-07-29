import { useState, useEffect } from 'react'
import { Card, Button, DatePicker, Modal, Form, Input, TimePicker, Select, Checkbox, Segmented, message, Tag, Empty } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getTasks, createTask, toggleTask, deleteTask } from '../services/api'
import { useAuthStore } from '../store/authStore'

const TRIP_GROUPS = ['香港差旅', '欧洲差旅', '日本差旅', '国内差旅']
const TRIP_FILTERS = ['全部', '香港差旅', '欧洲差旅', '日本差旅', '国内差旅']

export default function TodayPage() {
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [tripFilter, setTripFilter] = useState('全部')
  const [tasks, setTasks] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const loadTasks = async () => {
    try {
      const res = await getTasks(selectedDate.format('YYYY-MM-DD'), tripFilter)
      setTasks(res.data)
    } catch { setTasks([]) }
  }

  useEffect(() => { loadTasks() }, [selectedDate, tripFilter])

  const handleToggle = async (id: number) => {
    try {
      await toggleTask(id)
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, is_completed: !t.is_completed } : t)))
    } catch { message.error('操作失败') }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteTask(id)
      message.success('已删除')
      loadTasks()
    } catch { message.error('删除失败') }
  }

  const handleAdd = async (values: any) => {
    try {
      await createTask({
        title: values.title,
        task_date: values.task_date.format('YYYY-MM-DD') + ' 00:00:00',
        end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') + ' 00:00:00' : null,
        task_time: values.task_time ? values.task_time.format('HH:mm') : '',
        end_time: values.end_time ? values.end_time.format('HH:mm') : '',
        trip_filter: values.trip_filter || '全部',
        description: values.description || '',
        location: values.location || '',
      })
      message.success('任务已添加')
      setModalOpen(false)
      form.resetFields()
      loadTasks()
    } catch { message.error('添加失败') }
  }

  const completedCount = tasks.filter((t) => t.is_completed).length

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>每日任务</h2>
            <DatePicker value={selectedDate} onChange={(d) => setSelectedDate(d || dayjs())} />
            {tasks.length > 0 && (
              <Tag color="blue">{completedCount}/{tasks.length} 已完成</Tag>
            )}
          </div>
          {isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              添加任务
            </Button>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <Segmented
            options={TRIP_FILTERS}
            value={tripFilter}
            onChange={(v) => setTripFilter(v as string)}
          />
        </div>
      </Card>

      {tasks.length === 0 ? (
        <Card>
          <Empty description={isAdmin ? '暂无任务，点击上方按钮添加' : '当天暂无任务'} />
        </Card>
      ) : (
        tasks.map((task) => (
          <Card key={task.id} style={{ marginBottom: 8, opacity: task.is_completed ? 0.6 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Checkbox
                checked={task.is_completed}
                onChange={() => handleToggle(task.id)}
                style={{ marginTop: 4 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, textDecoration: task.is_completed ? 'line-through' : 'none' }}>
                  {task.title}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {task.trip_filter && task.trip_filter !== '全部' && (
                    <Tag color="blue">{task.trip_filter}</Tag>
                  )}
                  {task.task_time && (
                    <Tag>{task.task_time}{task.end_time ? ` - ${task.end_time}` : ''}</Tag>
                  )}
                  {task.end_date && (
                    <Tag color="purple">至 {dayjs(task.end_date).format('MM/DD')}</Tag>
                  )}
                  {task.location && <Tag color="orange">{task.location}</Tag>}
                </div>
                {task.description && (
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>{task.description}</div>
                )}
              </div>
              {isAdmin && (
                <Button type="text" danger size="small" icon={<DeleteOutlined />}
                  onClick={() => handleDelete(task.id)} />
              )}
            </div>
          </Card>
        ))
      )}

      <Modal
        title="添加每日任务"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        footer={null}
        width={520}
      >
        <Form form={form} onFinish={handleAdd} layout="vertical" initialValues={{ task_date: selectedDate, trip_filter: tripFilter !== '全部' ? tripFilter : undefined }}>
          <Form.Item name="title" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input placeholder="例如：出发前往机场" />
          </Form.Item>
          <Form.Item name="trip_filter" label="分组">
            <Select placeholder="选择差旅分组" allowClear options={TRIP_GROUPS.map((v) => ({ label: v, value: v }))} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="task_date" label="开始日期" style={{ flex: 1 }} rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="end_date" label="结束日期" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} placeholder="选填" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="task_time" label="开始时间" style={{ flex: 1 }}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" placeholder="选填" />
            </Form.Item>
            <Form.Item name="end_time" label="结束时间" style={{ flex: 1 }}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" placeholder="选填" />
            </Form.Item>
          </div>
          <Form.Item name="location" label="地点">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="description" label="备注">
            <Input.TextArea rows={3} placeholder="选填" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>添加</Button>
        </Form>
      </Modal>
    </div>
  )
}
