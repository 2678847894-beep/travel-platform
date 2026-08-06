import { useState, useEffect } from 'react'
import {
  Card, Button, DatePicker, Modal, Form, Input, TimePicker, Select,
  Checkbox, Segmented, message, Tag, Empty, Progress, Upload, Table, Grid,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, UploadOutlined, RobotOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import {
  getTasks, createTask, toggleTask, deleteTask,
  aiImportTasksPreview, aiImportTasksConfirm,
} from '../services/api'
import { useAuthStore } from '../store/authStore'

const TRIP_GROUPS = ['香港差旅', '欧洲差旅', '日本差旅', '国内差旅']
const TRIP_FILTERS = ['香港差旅', '欧洲差旅', '日本差旅', '国内差旅']

export default function TodayPage() {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [tripFilter, setTripFilter] = useState('香港差旅')
  const [tasks, setTasks] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  // AI import states
  const [importing, setImporting] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const loadTasks = async () => {
    try {
      const res = await getTasks(selectedDate.format('YYYY-MM-DD'), tripFilter)
      setTasks(res.data)
    } catch { setTasks([]) }
  }

  useEffect(() => { loadTasks() }, [selectedDate, tripFilter])

  // Auto-set end_date = task_date + 1 year
  const handleTaskDateChange = (d: Dayjs | null) => {
    if (d) {
      const end = d.add(1, 'year')
      form.setFieldsValue({ end_date: end })
    }
  }

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

  // AI Import handlers
  const handleAiImport = async (file: File) => {
    setImporting(true)
    try {
      const res = await aiImportTasksPreview(file)
      const data = res.data?.preview || []
      if (data.length === 0) {
        message.warning('未能识别到任务')
        return
      }
      setPreviewData(data.map((item: any, idx: number) => ({ ...item, key: idx })))
      setPreviewOpen(true)
    } catch {
      message.error('导入失败，请检查文件格式')
    } finally {
      setImporting(false)
    }
  }

  const handlePreviewConfirm = async () => {
    setConfirming(true)
    try {
      // Use the same task_date as selected date for all imported tasks
      const dateStr = selectedDate.format('YYYY-MM-DD')
      const ts = previewData.map((item: any) => ({
        ...item,
        task_date: dateStr,
        end_date: dayjs(dateStr).add(1, 'year').format('YYYY-MM-DD'),
      }))
      await aiImportTasksConfirm({ tasks: ts })
      message.success(`成功导入 ${ts.length} 个任务`)
      setPreviewOpen(false)
      setPreviewData([])
      loadTasks()
    } catch {
      message.error('导入失败')
    } finally {
      setConfirming(false)
    }
  }

  const completedCount = tasks.filter((t) => t.is_completed).length
  const totalCount = tasks.length
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const previewColumns = [
    {
      title: '任务名称',
      dataIndex: 'title',
      render: (_: string, record: any, idx: number) => (
        <Input
          value={record.title}
          onChange={(e) => {
            const next = [...previewData]
            next[idx] = { ...next[idx], title: e.target.value }
            setPreviewData(next)
          }}
        />
      ),
    },
    {
      title: '日期',
      dataIndex: 'task_date',
      width: 140,
      render: (v: string) => v || selectedDate.format('YYYY-MM-DD'),
    },
    {
      title: '备注',
      dataIndex: 'description',
      render: (_: string, record: any, idx: number) => (
        <Input
          value={record.description}
          onChange={(e) => {
            const next = [...previewData]
            next[idx] = { ...next[idx], description: e.target.value }
            setPreviewData(next)
          }}
        />
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Top Card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>每日任务</h2>
            <DatePicker value={selectedDate} onChange={(d) => setSelectedDate(d || dayjs())} />
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                form.resetFields()
                form.setFieldsValue({
                  task_date: selectedDate,
                  trip_filter: tripFilter,
                  end_date: selectedDate.add(1, 'year'),
                })
                setModalOpen(true)
              }}>
                添加任务
              </Button>
              <Upload
                accept=".docx,.xlsx,.doc,.xls"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleAiImport(file)
                  return false
                }}
              >
                <Button
                  icon={<RobotOutlined />}
                  loading={importing}
                  style={{ borderStyle: 'dashed' }}
                >
                  AI 识别导入
                </Button>
              </Upload>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#64748b' }}>
              <span>完成进度</span>
              <span>{completedCount} / {totalCount} ({percent}%)</span>
            </div>
            <Progress percent={percent} showInfo={false} strokeColor="#1677ff" trailColor="#f0f0f0" />
          </div>
        )}

        {/* Segmented Filter */}
        <div style={{ overflowX: isMobile ? 'auto' : 'visible' }}>
        <Segmented
          options={TRIP_FILTERS}
          value={tripFilter}
          onChange={(v) => setTripFilter(v as string)}
        />
        </div>
      </Card>

      {/* Task List */}
      {tasks.length === 0 ? (
        <Card>
          <Empty description={isAdmin ? '暂无任务，点击上方按钮添加' : '当天暂无任务'} />
        </Card>
      ) : (
        tasks.map((task) => {
          const isCompleted = task.is_completed
          const isOverdue = task.is_overdue
          return (
            <Card
              key={task.id}
              style={{
                marginBottom: 8,
                opacity: isCompleted && !isOverdue ? 0.55 : 1,
                ...(isOverdue && !isCompleted ? {
                  borderColor: '#ff4d4f',
                  backgroundColor: '#fff2f0',
                } : {}),
              }}
              bodyStyle={{ padding: '12px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Checkbox
                  checked={isCompleted}
                  onChange={() => handleToggle(task.id)}
                  style={{ marginTop: 4 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: 15,
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    color: isOverdue && !isCompleted ? '#ff4d4f' : 'inherit',
                  }}>
                    {task.title}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {task.trip_filter && (
                      <Tag color="blue">{task.trip_filter}</Tag>
                    )}
                    {task.task_time && (
                      <Tag>{task.task_time}{task.end_time ? ` - ${task.end_time}` : ''}</Tag>
                    )}
                    {task.end_date && (
                      <Tag color="purple">至 {dayjs(task.end_date).format('MM/DD')}</Tag>
                    )}
                    {task.location && <Tag color="orange">{task.location}</Tag>}
                    {isOverdue && !isCompleted && (
                      <Tag color="red">已过期</Tag>
                    )}
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
          )
        })
      )}

      {/* Add Task Modal */}
      <Modal
        title="添加每日任务"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        footer={null}
        width={isMobile ? '100%' : 560}
        style={isMobile ? { top: 0, margin: 0 } : {}}
      >
        <Form
          form={form}
          onFinish={handleAdd}
          layout="vertical"
          initialValues={{
            task_date: selectedDate,
            trip_filter: tripFilter,
            end_date: selectedDate.add(1, 'year'),
          }}
        >
          <Form.Item name="title" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input placeholder="例如：出发前往机场" />
          </Form.Item>
          <Form.Item name="trip_filter" label="分组">
            <Select placeholder="选择差旅分组" allowClear options={TRIP_GROUPS.map((v) => ({ label: v, value: v }))} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="task_date" label="开始日期" style={{ flex: 1 }} rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} onChange={handleTaskDateChange} />
            </Form.Item>
            <Form.Item name="end_date" label="结束日期" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} placeholder="默认一年后" />
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

          {/* AI import inside modal */}
          <Form.Item label="AI 识别导入">
            <Upload
              accept=".docx,.xlsx,.doc,.xls"
              showUploadList={false}
              beforeUpload={(file) => {
                handleAiImport(file)
                return false
              }}
            >
              <Button icon={<RobotOutlined />} loading={importing} style={{ borderStyle: 'dashed' }} block>
                从 Excel / Word 智能导入
              </Button>
            </Upload>
          </Form.Item>

          <Button type="primary" htmlType="submit" block>添加</Button>
        </Form>
      </Modal>

      {/* AI Preview Modal */}
      <Modal
        title="AI 识别导入预览"
        open={previewOpen}
        onCancel={() => { setPreviewOpen(false); setPreviewData([]) }}
        width={700}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setPreviewOpen(false); setPreviewData([]) }}>取消</Button>
            <Button type="primary" loading={confirming} onClick={handlePreviewConfirm}>
              确认导入 ({previewData.length} 条)
            </Button>
          </div>
        }
      >
        <Table
          columns={previewColumns}
          dataSource={previewData}
          pagination={false}
          size="small"
          scroll={{ y: 400, x: isMobile ? 'max-content' : undefined }}
        />
      </Modal>
    </div>
  )
}
