import { useState, useEffect } from 'react'
import {
  Button, DatePicker, Modal, Form, Input, TimePicker, Select,
  Checkbox, message, Tag, Empty, Upload, Grid,
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

  const [tripFilters, setTripFilters] = useState<string[]>(DEFAULT_TRIP_FILTERS)
  const [addFilterOpen, setAddFilterOpen] = useState(false)
  const [newFilterName, setNewFilterName] = useState('')
  const [addingFilter, setAddingFilter] = useState(false)

  const [importing, setImporting] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [unifiedTripFilter, setUnifiedTripFilter] = useState('全部')
  const [unifiedStartTime, setUnifiedStartTime] = useState<Dayjs | null>(null)
  const [unifiedEndTime, setUnifiedEndTime] = useState<Dayjs | null>(null)

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

  const handleTaskDateChange = (d: Dayjs | null) => {
    if (d) {
      form.setFieldsValue({ end_date: d.add(1, 'year') })
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
      const dateStr = selectedDate.format('YYYY-MM-DD')
      const ts = previewData.map((item: any) => ({
        ...item,
        task_date: dateStr,
        end_date: dayjs(dateStr).add(1, 'year').format('YYYY-MM-DD'),
        trip_filter: unifiedTripFilter,
        task_time: item.task_time || (unifiedStartTime ? unifiedStartTime.format('HH:mm') : ''),
        end_time: item.end_time || (unifiedEndTime ? unifiedEndTime.format('HH:mm') : ''),
      }))
      const res = await aiImportTasksConfirm({ tasks: ts })
      message.success(`已成功导入 ${res.data?.count || ts.length} 条任务`)
      setPreviewOpen(false)
      setPreviewData([])
      const targetFilter = unifiedTripFilter || tripFilter
      if (unifiedTripFilter && unifiedTripFilter !== '全部') {
        setTripFilter(unifiedTripFilter)
      }
      await loadTasks(undefined, targetFilter)
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
    <div style={{ maxWidth: 900, margin: '0 auto', background: '#fff', minHeight: '100vh', padding: '16px 24px' }}>
      <style>{`
        .task-item { transition: background 0.15s; }
        .task-item:hover { background: #f0f5ff !important; }
        .task-item.task-overdue:hover { background: #fff2f0 !important; }
        .filter-btn { font-family: inherit; transition: all 0.2s; }
        .filter-btn:hover { border-color: #1677ff !important; color: #1677ff !important; }
      `}</style>

      {/* 1. Header bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingBottom: 16, borderBottom: '1px solid #f0f0f0', marginBottom: 20,
        flexWrap: 'wrap', gap: 12,
      }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>每日任务</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DatePicker
            value={selectedDate}
            onChange={(d) => setSelectedDate(d || dayjs())}
          />
          <Button
            icon={<ReloadOutlined />}
            size="small"
            loading={refreshing}
            onClick={handleRefresh}
          />
        </div>
      </div>

      {/* 2. Filter + progress row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
        marginBottom: isAdmin ? 12 : 20,
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {['全部', ...tripFilters].map((f) => (
            <button
              key={f}
              onClick={() => setTripFilter(f)}
              className="filter-btn"
              style={{
                padding: '4px 14px',
                borderRadius: 16,
                border: f === tripFilter ? '1px solid #1677ff' : '1px solid #d9d9d9',
                background: f === tripFilter ? '#1677ff' : '#fff',
                color: f === tripFilter ? '#fff' : '#595959',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
          {isAdmin && (
            <Button
              type="text" size="small"
              icon={<PlusOutlined />}
              onClick={() => setAddFilterOpen(true)}
              style={{ flexShrink: 0, color: '#8c8c8c' }}
            />
          )}
        </div>

        {totalCount > 0 && (
          <div style={{ fontSize: 13, color: '#8c8c8c', whiteSpace: 'nowrap' }}>
            已完成 {completedCount}/{totalCount} &middot; {percent}%
          </div>
        )}
      </div>

      {/* 3. Admin action buttons */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
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

      {/* 4. Task list */}
      {totalCount === 0 ? (
        <div style={{ paddingTop: 40 }}>
          <Empty description={isAdmin ? '暂无任务，点击上方按钮添加' : '当天暂无任务'} />
        </div>
      ) : (
        <div>
          {(() => {
            const grouped: Record<string, any[]> = {}
            const order: string[] = []
            tasks.forEach((task: any) => {
              const gf = task.trip_filter || '未分组'
              if (!grouped[gf]) { grouped[gf] = []; order.push(gf) }
              grouped[gf].push(task)
            })

            return order.map((groupKey) => {
              const groupTasks = grouped[groupKey]
              return (
                <div key={groupKey} style={{ marginBottom: 20 }}>
                  {/* Group header */}
                  <div style={{
                    fontSize: 14, color: '#8c8c8c', fontWeight: 600,
                    paddingLeft: 12, marginBottom: 8,
                    borderLeft: '3px solid #1677ff',
                  }}>
                    {groupKey}
                  </div>

                  {/* Tasks */}
                  <div style={{ paddingLeft: 12 }}>
                    {groupTasks.map((task: any) => {
                      const isCompleted = task.is_completed
                      const isOverdue = task.is_overdue
                      return (
                        <div
                          key={task.id}
                          onClick={() => handleToggle(task.id)}
                          className={`task-item${isOverdue && !isCompleted ? ' task-overdue' : ''}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderBottom: '1px solid #f0f0f0',
                            opacity: isCompleted && !isOverdue ? 0.5 : 1,
                            cursor: 'pointer',
                            ...(isOverdue && !isCompleted ? { background: '#fff2f0' } : {}),
                          }}
                        >
                          <Checkbox
                            checked={isCompleted}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => handleToggle(task.id)}
                          />

                          <span style={{
                            flex: 1, fontSize: 15, fontWeight: 600,
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            color: isOverdue && !isCompleted ? '#ff4d4f' : '#262626',
                          }}>
                            {task.title}
                          </span>

                          {task.trip_filter && (
                            <Tag color="blue" style={{ margin: 0 }}>{task.trip_filter}</Tag>
                          )}

                          {task.task_time && (
                            <Tag style={{ margin: 0 }}>
                              {task.task_time}{task.end_time ? ` - ${task.end_time}` : ''}
                            </Tag>
                          )}

                          {isOverdue && !isCompleted && (
                            <Tag color="red" style={{ margin: 0 }}>已过期</Tag>
                          )}

                          {task.location && (
                            <Tag color="orange" style={{ margin: 0 }}>{task.location}</Tag>
                          )}

                          {task.end_date && (
                            <Tag color="purple" style={{ margin: 0 }}>
                              至 {dayjs(task.end_date).format('MM/DD')}
                            </Tag>
                          )}

                          {isAdmin && (
                            <Button
                              type="text" danger size="small"
                              icon={<DeleteOutlined />}
                              onClick={(e) => { e.stopPropagation(); handleDelete(task.id) }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          })()}
        </div>
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
        onCancel={() => { setPreviewOpen(false); setPreviewData([]); setUnifiedTripFilter('全部'); setUnifiedStartTime(null); setUnifiedEndTime(null) }}
        width={960}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setPreviewOpen(false); setPreviewData([]); setUnifiedTripFilter('全部'); setUnifiedStartTime(null); setUnifiedEndTime(null) }}>取消</Button>
            <Button type="primary" loading={confirming} onClick={handlePreviewConfirm}>
              确认导入 ({previewData.length} 条)
            </Button>
          </div>
        }
      >
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0f5ff', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', color: '#1d39c4' }}>统一导入到目的地：</span>
            <Select
              style={{ minWidth: 180 }}
              value={unifiedTripFilter}
              onChange={(v) => setUnifiedTripFilter(v)}
              options={[{ label: '全部', value: '全部' }, ...tripFilters.map((v) => ({ label: v, value: v }))]}
            />
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', color: '#1d39c4' }}>开始时间：</span>
            <DatePicker
              value={unifiedStartTime}
              onChange={(v) => setUnifiedStartTime(v)}
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              placeholder="默认开始"
              style={{ width: 180 }}
            />
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', color: '#1d39c4' }}>结束时间：</span>
            <DatePicker
              value={unifiedEndTime}
              onChange={(v) => setUnifiedEndTime(v)}
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              placeholder="默认结束"
              style={{ width: 180 }}
            />
          </div>
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {(() => {
            const groups: { key: string; items: any[] }[] = []
            const grouped: Record<string, any[]> = {}
            const ungrouped: any[] = []

            previewData.forEach((item: any, idx: number) => {
              const cat = item.category
              if (cat) {
                if (!grouped[cat]) grouped[cat] = []
                grouped[cat].push({ ...item, _idx: idx })
              } else {
                ungrouped.push({ ...item, _idx: idx })
              }
            })

            const order: string[] = []
            previewData.forEach((item: any) => {
              const cat = item.category
              if (cat && !order.includes(cat)) order.push(cat)
            })

            for (const k of order) {
              if (grouped[k]) groups.push({ key: k, items: grouped[k] })
            }
            if (ungrouped.length > 0) groups.push({ key: '未分类', items: ungrouped })

            if (groups.length === 0) {
              return <Empty description="无预览数据" />
            }

            const categoryOptions = Array.from(
              new Set(previewData.map((item: any) => item.category).filter(Boolean))
            ).map((c: any) => ({ label: c, value: c }))

            return groups.map((group) => (
              <div key={group.key} style={{ marginBottom: 12 }}>
                <div style={{
                  padding: '6px 12px', background: '#f0f5ff',
                  borderRadius: 6, fontWeight: 700, fontSize: 14,
                  color: '#1d39c4', marginBottom: 4,
                }}>
                  {group.key}
                </div>
                {group.items.map((item: any) => (
                  <div key={item._idx} style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
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
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Select
                        size="small"
                        style={{ width: 140 }}
                        placeholder="分类"
                        value={item.category || undefined}
                        allowClear
                        options={categoryOptions}
                        onChange={(val) => {
                          const next = [...previewData]
                          next[item._idx] = { ...next[item._idx], category: val || '' }
                          setPreviewData(next)
                        }}
                      />
                      <TimePicker
                        size="small"
                        style={{ width: 100 }}
                        format="HH:mm"
                        placeholder="开始时间"
                        value={item.task_time ? dayjs(item.task_time, 'HH:mm') : null}
                        onChange={(t) => {
                          const next = [...previewData]
                          next[item._idx] = { ...next[item._idx], task_time: t ? t.format('HH:mm') : '' }
                          setPreviewData(next)
                        }}
                      />
                      <TimePicker
                        size="small"
                        style={{ width: 100 }}
                        format="HH:mm"
                        placeholder="结束时间"
                        value={item.end_time ? dayjs(item.end_time, 'HH:mm') : null}
                        onChange={(t) => {
                          const next = [...previewData]
                          next[item._idx] = { ...next[item._idx], end_time: t ? t.format('HH:mm') : '' }
                          setPreviewData(next)
                        }}
                      />
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
