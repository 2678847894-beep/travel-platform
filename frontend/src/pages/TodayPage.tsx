import { useState, useEffect } from 'react'
import {
  Card, Button, DatePicker, Modal, Form, Input, TimePicker, Select,
  Checkbox, Segmented, message, Tag, Empty, Progress, Upload, Grid,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, UploadOutlined, RobotOutlined, ReloadOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import {
  getTasks, createTask, toggleTask, deleteTask,
  aiImportTasksPreview, aiImportTasksConfirm,
  getTripTemplates, createTripTemplate,
} from '../services/api'
import { useAuthStore } from '../store/authStore'

const DEFAULT_TRIP_FILTERS = ['香港差旅', '欧洲差旅', '日本差旅', '国内差旅']

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

  // Trip filters (dynamic, synced with sidebar templates)
  const [tripFilters, setTripFilters] = useState<string[]>(DEFAULT_TRIP_FILTERS)
  const [addFilterOpen, setAddFilterOpen] = useState(false)
  const [newFilterName, setNewFilterName] = useState('')
  const [addingFilter, setAddingFilter] = useState(false)

  // AI import states
  const [importing, setImporting] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadTasks()
      message.success('已从后端同步最新数据')
    } catch {
      message.error('刷新失败')
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

  // Add new trip filter
  const handleAddFilter = async () => {
    if (!newFilterName.trim()) {
      message.warning('请输入目的地名称')
      return
    }
    setAddingFilter(true)
    try {
      await createTripTemplate({ name: newFilterName.trim() })
      message.success(`目的地「${newFilterName.trim()}」已添加`)
      setTripFilters((prev) =>
        prev.includes(newFilterName.trim()) ? prev : [...prev, newFilterName.trim()]
      )
      setNewFilterName('')
      setAddFilterOpen(false)
    } catch (err: any) {
      message.error(err.response?.data?.detail || '添加失败')
    } finally {
      setAddingFilter(false)
    }
  }

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
        end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') + 'T00:00:00' : null,
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
      const res = await aiImportTasksConfirm({ tasks: ts })
      const importedCount = res.data?.count || ts.length
      message.success(`已成功导入 ${importedCount} 条任务`)
      setPreviewOpen(false)
      setPreviewData([])
      // Switch the active filter to the imported group so the newly added
      // tasks are actually visible after refresh (fix: backend has data but
      // frontend filtered it out because trip_filter didn't match).
      const importedFilters = Array.from(
        new Set(ts.map((t: any) => t.trip_filter).filter(Boolean))
      ) as string[]
      if (importedFilters.length === 1 && importedFilters[0] && importedFilters[0] !== '全部') {
        setTripFilter(importedFilters[0])
      } else if (importedFilters.length === 0 || importedFilters.every((f) => !f || f === '全部')) {
        // All imported as 全部 → ensure we are viewing 全部
        if (tripFilter !== '全部') setTripFilter('全部')
      }
      await loadTasks()
    } catch {
      message.error('导入失败')
    } finally {
      setConfirming(false)
    }
  }

  const completedCount = tasks.filter((t) => t.is_completed).length
  const totalCount = tasks.length
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Top Card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>每日任务</h2>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              loading={refreshing}
              onClick={handleRefresh}
              title="从后端同步刷新最新数据"
            >
              刷新
            </Button>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: isMobile ? 'auto' : 'visible' }}>
        <Segmented
          options={tripFilters}
          value={tripFilter}
          onChange={(v) => setTripFilter(v as string)}
        />
        {isAdmin && (
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setAddFilterOpen(true)}
            style={{ flexShrink: 0 }}
          />
        )}
        </div>
      </Card>

      {/* Task List — grouped by trip_filter */}
      {tasks.length === 0 ? (
        <Card>
          <Empty description={isAdmin ? '暂无任务，点击上方按钮添加' : '当天暂无任务'} />
        </Card>
      ) : (
        (() => {
          // Group tasks by trip_filter, preserving first-appearance order
          const grouped: Record<string, any[]> = {}
          const order: string[] = []
          tasks.forEach((task: any) => {
            const gf = task.trip_filter || '未分组'
            if (!grouped[gf]) {
              grouped[gf] = []
              order.push(gf)
            }
            grouped[gf].push(task)
          })

          return order.map((groupKey) => {
            const groupTasks = grouped[groupKey]
            const groupDone = groupTasks.filter((t) => t.is_completed).length
            const groupTotal = groupTasks.length
            const groupPercent = groupTotal > 0 ? Math.round((groupDone / groupTotal) * 100) : 0
            return (
              <div key={groupKey} style={{ marginBottom: 16 }}>
                {/* Group header — visual separator row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  background: 'linear-gradient(90deg, #e6f0ff 0%, #f0f5ff 100%)',
                  borderLeft: '4px solid #1677ff',
                  borderRadius: '6px 6px 0 0',
                  fontWeight: 700,
                  fontSize: 15,
                  color: '#1d39c4',
                }}>
                  <span>{groupKey}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#5b7bb4' }}>
                    {groupDone} / {groupTotal}
                  </span>
                </div>
                {/* Group progress bar */}
                <div style={{ padding: '6px 14px 0', background: '#fafcff' }}>
                  <Progress percent={groupPercent} showInfo={false} size="small" strokeColor="#1677ff" trailColor="#e6f0ff" />
                </div>
                {/* Group items — indented with left color bar */}
                <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderTop: 'none', borderRadius: '0 0 6px 6px' }}>
                  {groupTasks.map((task: any) => {
                    const isCompleted = task.is_completed
                    const isOverdue = task.is_overdue
                    return (
                      <div
                        key={task.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          padding: '12px 16px 12px 18px',
                          borderLeft: '3px solid #bcd4ff',
                          borderBottom: '1px solid #f5f5f5',
                          opacity: isCompleted && !isOverdue ? 0.55 : 1,
                          ...(isOverdue && !isCompleted ? {
                            borderLeftColor: '#ffccc7',
                            background: '#fff2f0',
                          } : {}),
                        }}
                      >
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
                    )
                  })}
                </div>
              </div>
            )
          })
        })()
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
            <Select placeholder="选择差旅分组" allowClear options={tripFilters.map((v) => ({ label: v, value: v }))} />
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
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {(() => {
            // Group previewData by trip_filter
            const groups: { key: string; items: any[] }[] = []
            const grouped: Record<string, any[]> = {}
            const ungrouped: any[] = []

            previewData.forEach((item: any, idx: number) => {
              const gf = item.trip_filter
              if (gf) {
                if (!grouped[gf]) grouped[gf] = []
                grouped[gf].push({ ...item, _idx: idx })
              } else {
                ungrouped.push({ ...item, _idx: idx })
              }
            })

            // Preserve order of first appearance
            const order: string[] = []
            previewData.forEach((item: any) => {
              const gf = item.trip_filter
              if (gf && !order.includes(gf)) order.push(gf)
            })

            for (const k of order) {
              if (grouped[k]) groups.push({ key: k, items: grouped[k] })
            }
            if (ungrouped.length > 0) groups.push({ key: '未分组', items: ungrouped })

            if (groups.length === 0) {
              return <Empty description="无预览数据" />
            }

            return groups.map((group) => (
              <div key={group.key} style={{ marginBottom: 12 }}>
                {/* Group header — read-only, visual separator */}
                <div style={{
                  padding: '6px 12px',
                  background: '#f0f5ff',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#1d39c4',
                  marginBottom: 4,
                }}>
                  {group.key}
                </div>
                {/* Group items */}
                {group.items.map((item: any) => (
                  <div key={item._idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderBottom: '1px solid #f0f0f0',
                  }}>
                    <div style={{ flex: 1 }}>
                      <Input
                        size="small"
                        value={item.title}
                        onChange={(e) => {
                          const next = [...previewData]
                          next[item._idx] = { ...next[item._idx], title: e.target.value }
                          setPreviewData(next)
                        }}
                      />
                    </div>
                    <div style={{ width: 100, fontSize: 12, color: '#888', textAlign: 'center' }}>
                      {item.task_date || selectedDate.format('YYYY-MM-DD')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Input
                        size="small"
                        placeholder="备注"
                        value={item.description || ''}
                        onChange={(e) => {
                          const next = [...previewData]
                          next[item._idx] = { ...next[item._idx], description: e.target.value }
                          setPreviewData(next)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))
          })()}
        </div>
      </Modal>

      {/* Add Trip Filter Modal */}
      <Modal
        title="添加新目的地"
        open={addFilterOpen}
        onCancel={() => { setAddFilterOpen(false); setNewFilterName('') }}
        onOk={handleAddFilter}
        confirmLoading={addingFilter}
        okText="添加"
        cancelText="取消"
      >
        <div style={{ marginTop: 8 }}>
          <Input
            placeholder="输入目的地名称，例如：纽约差旅"
            value={newFilterName}
            onChange={(e) => setNewFilterName(e.target.value)}
            onPressEnter={handleAddFilter}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  )
}
