import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { Card, Button, Progress, Space, Input, Segmented, Modal, Form, message, Tag, Upload, Select } from 'antd'
import { PlusOutlined, ReloadOutlined, FileTextOutlined, InboxOutlined, HolderOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { getChecklistItems, createChecklistItem, updateChecklistItem, deleteChecklistItem, reorderChecklistItems } from '../services/api'
import { getTrips, createTrip, deleteTrip, getTripItems, toggleTripItem } from '../services/api'
import { useAuthStore } from '../store/authStore'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const { Dragger } = Upload

/* ── Draggable Card Wrapper ── */
function SortableCard({ item, onToggle, onEdit, isAdmin }: {
  item: any
  onToggle: (id: number) => void
  onEdit: (item: any) => void
  isAdmin: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 999 : 'auto',
    border: `1px solid ${item.is_prepared ? '#10b981' : '#e2e8f0'}`,
    borderRadius: 10,
    overflow: 'hidden',
    background: item.is_prepared ? '#f0fdf4' : '#fff',
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 20,
          cursor: 'grab',
          background: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          color: '#94a3b8',
          fontSize: 12,
          userSelect: 'none',
        }}
        title="拖拽排序"
      >
        <HolderOutlined style={{ fontSize: 14 }} />
      </div>

      {/* 图片 */}
      <div
        onClick={() => onToggle(item.id)}
        style={{
          width: '100%', height: 110, background: '#f8fafc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
        {item.image_data ? (
          <img src={item.image_data} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#cbd5e1' }}>
            <FileTextOutlined style={{ fontSize: 28 }} />
            <div style={{ fontSize: 11, marginTop: 4 }}>暂无图片</div>
          </div>
        )}
      </div>

      {/* 信息区 */}
      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{
          fontWeight: 600, fontSize: 13, marginBottom: 8,
          textDecoration: item.is_prepared ? 'line-through' : 'none',
          color: item.is_prepared ? '#94a3b8' : '#1e293b',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            onClick={() => onToggle(item.id)}
            style={{
              width: 20, height: 20, borderRadius: '50%',
              background: item.is_prepared ? '#10b981' : '#fff',
              border: `2px solid ${item.is_prepared ? '#10b981' : '#d1d5db'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0, cursor: 'pointer',
            }}>
            {item.is_prepared ? '✓' : ''}
          </div>
          <Input
            size="small"
            placeholder="数量"
            style={{ width: 56, fontSize: 12 }}
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            type="text" size="small" icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); onEdit(item) }}
            style={{ color: '#94a3b8', padding: '0 4px', minWidth: 24 }}
          />
          <div style={{ flex: 1 }} />
          {item.is_essential && <Tag color="red" style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}>常备</Tag>}
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function ChecklistPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [template, setTemplate] = useState(() => {
    const p = new URLSearchParams(location.search).get('template') || '香港差旅'
    return p === 'new' ? '默认' : p
  })

  const [trips, setTrips] = useState<any[]>([])
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [filterType, setFilterType] = useState('全部')
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [tripModalOpen, setTripModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [imageBase64, setImageBase64] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  useEffect(() => {
    const p = new URLSearchParams(location.search).get('template') || '香港差旅'
    setTemplate(p === 'new' ? '默认' : p)
    setSelectedTripId(null)
  }, [location.search])

  const loadTrips = async () => {
    try {
      const res = await getTrips(template)
      setTrips(res.data)
      if (res.data.length > 0 && !selectedTripId) {
        setSelectedTripId(res.data[0].id)
      }
    } catch { setTrips([]) }
  }

  useEffect(() => { loadTrips() }, [template])

  const loadItems = async () => {
    if (!selectedTripId) { setItems([]); return }
    try {
      const filterMap: Record<string, string> = { '已准备': 'prepared', '未准备': 'unprepared', '常备': 'essential', '全部': 'all', '其他': 'all' }
      const res = await getTripItems(selectedTripId, filterMap[filterType] || 'all')
      setItems(res.data)
    } catch { setItems([]) }
  }

  useEffect(() => { loadItems() }, [selectedTripId, filterType])

  const handleToggle = async (itemId: number) => {
    if (!selectedTripId) return
    await toggleTripItem(selectedTripId, itemId)
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, is_prepared: !i.is_prepared } : i)))
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = async (file: File) => {
    const base64 = await fileToBase64(file)
    setImageBase64(base64)
    setPreviewUrl(base64)
    return false
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile()
        if (file) handleImageUpload(file)
        break
      }
    }
  }

  const handleAdd = async (values: any) => {
    await createChecklistItem({ ...values, checklist_template: template, image_data: imageBase64 })
    message.success('添加成功')
    setModalOpen(false)
    setImageBase64('')
    setPreviewUrl('')
    loadItems()
  }

  const handleDeleteItem = async (id: number) => {
    await deleteChecklistItem(id)
    message.success('已删除')
    loadItems()
  }

  const handleEditItem = (item: any) => {
    setEditItem(item)
    setEditModalOpen(true)
    setImageBase64(item.image_data || '')
    setPreviewUrl(item.image_data || '')
  }

  const handleUpdateItem = async (values: any) => {
    if (!editItem) return
    await updateChecklistItem(editItem.id, {
      ...values,
      checklist_template: template,
      image_data: imageBase64,
    })
    message.success('已更新')
    setEditModalOpen(false)
    setEditItem(null)
    setImageBase64('')
    setPreviewUrl('')
    loadItems()
  }

  const handleRenameCategory = async (oldCat: string) => {
    if (!categoryName || categoryName === oldCat) { setEditingCategory(null); return }
    const itemsInCat = items.filter((i) => i.category === oldCat)
    for (const item of itemsInCat) {
      await updateChecklistItem(item.id, {
        name: item.name,
        category: categoryName,
        checklist_template: template,
        image_data: item.image_data || '',
        is_essential: item.is_essential,
      })
    }
    message.success('分类已重命名')
    setEditingCategory(null)
    loadItems()
  }

  const handleCreateTrip = async (values: any) => {
    const res = await createTrip({ ...values, template })
    message.success('行程已创建')
    setTripModalOpen(false)
    loadTrips()
    setSelectedTripId(res.data.id)
  }

  const handleDeleteTrip = async () => {
    if (!selectedTripId) return
    Modal.confirm({
      title: '确认删除',
      content: '删除行程不会删除共享物品，只清除该行程的准备进度。',
      onOk: async () => {
        await deleteTrip(selectedTripId)
        message.success('已删除')
        setSelectedTripId(null)
        loadTrips()
      },
    })
  }

  // ── Drag-and-Drop Handler ──
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // Find which category the items belong to
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id)
      const newIndex = prev.findIndex((i) => i.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev

      const reordered = [...prev]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)

      // Persist new sort_order to backend
      const payload = reordered.map((item, idx) => ({
        id: item.id,
        sort_order: idx,
      }))
      reorderChecklistItems(payload).catch(() => {})

      return reordered
    })
  }, [])

  const grouped: Record<string, any[]> = {}
  items.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  })

  const prepared = items.filter((i) => i.is_prepared).length
  const total = items.length
  const pct = total > 0 ? Math.round(prepared / total * 100) : 0

  const selectedTrip = trips.find((t) => t.id === selectedTripId)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{template === '默认' ? '物品清单' : template}</h2>
            <Select
              placeholder="选择行程"
              value={selectedTripId}
              onChange={(v) => setSelectedTripId(v)}
              style={{ minWidth: 200 }}
              notFoundContent="暂无行程，点击右边按钮创建"
              options={trips.map((t) => ({
                label: t.trip_date ? `${t.name} (${t.trip_date})` : t.name,
                value: t.id,
              }))}
            />
            {isAdmin && (
              <Button size="small" icon={<PlusOutlined />} onClick={() => setTripModalOpen(true)}>
                新建行程
              </Button>
            )}
            {selectedTripId && isAdmin && trips.length > 1 && (
              <Button size="small" danger icon={<DeleteOutlined />} onClick={handleDeleteTrip}>
                删除行程
              </Button>
            )}
            {selectedTrip && selectedTrip.trip_date && (
              <Tag color="blue">{selectedTrip.trip_date}</Tag>
            )}
          </div>
          <Space>
            {selectedTripId && isAdmin && (
              <Button icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加物品</Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={loadItems}>刷新</Button>
          </Space>
        </div>

        {selectedTripId && total > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>{prepared}/{total} 已准备</span>
              <span style={{ fontWeight: 600 }}>{pct}%</span>
            </div>
            <Progress percent={pct} strokeColor={pct === 100 ? '#10b981' : '#3b82f6'} showInfo={false} />
          </div>
        )}

        {selectedTripId && (
          <div style={{ marginTop: 12 }}>
            <Segmented
              options={template === '香港差旅' ? ['全部', '已准备', '未准备', '常备', '其他'] : ['全部', '已准备', '未准备', '其他']}
              value={filterType}
              onChange={(v) => setFilterType(v as string)}
            />
          </div>
        )}
      </Card>

      {!selectedTripId ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            {isAdmin ? '请选择或创建一个行程' : '暂无行程'}
          </div>
        </Card>
      ) : Object.keys(grouped).length === 0 ? (
        <Card><div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>暂无物品</div></Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div>
            {Object.entries(grouped).map(([cat, catItems]) => {
              const catPrepared = catItems.filter((i) => i.is_prepared).length
              const catIds = catItems.map((i) => i.id)
              return (
                <Card
                  key={cat}
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {editingCategory === cat ? (
                        <Input
                          size="small"
                          value={categoryName}
                          onChange={(e) => setCategoryName(e.target.value)}
                          onPressEnter={() => handleRenameCategory(cat)}
                          onBlur={() => handleRenameCategory(cat)}
                          style={{ width: 160 }}
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => { setEditingCategory(cat); setCategoryName(cat) }}
                          style={{ fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                        >
                          {cat} <EditOutlined style={{ fontSize: 12, color: '#94a3b8', marginLeft: 6 }} />
                        </span>
                      )}
                      <Tag>{catPrepared}/{catItems.length}</Tag>
                    </div>
                  }
                  style={{ marginBottom: 16 }}
                >
                  <SortableContext items={catIds} strategy={rectSortingStrategy}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
                      {catItems.map((item) => (
                        <SortableCard
                          key={item.id}
                          item={item}
                          onToggle={handleToggle}
                          onEdit={handleEditItem}
                          isAdmin={isAdmin}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </Card>
              )
            })}
          </div>
        </DndContext>
      )}

      {selectedTripId && (
        <div style={{ position: 'fixed', bottom: 0, left: 260, right: 0, background: '#fff', padding: '8px 24px', boxShadow: '0 -2px 8px rgba(0,0,0,0.08)', zIndex: 5 }}>
          <Progress percent={pct} format={() => `${prepared}/${total}`} strokeColor={pct === 100 ? '#10b981' : '#3b82f6'} />
        </div>
      )}

      {/* 新建行程弹窗 */}
      <Modal title="新建行程" open={tripModalOpen} onCancel={() => setTripModalOpen(false)} footer={null}>
        <Form onFinish={handleCreateTrip} layout="vertical">
          <Form.Item name="name" label="行程名称" rules={[{ required: true }]}>
            <Input placeholder="例如：7月欧洲行程" />
          </Form.Item>
          <Form.Item name="trip_date" label="出发日期">
            <Input type="date" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>创建</Button>
        </Form>
      </Modal>

      {/* 添加物品弹窗 */}
      <Modal title="添加物品" open={modalOpen} onCancel={() => { setModalOpen(false); setImageBase64(''); setPreviewUrl('') }} footer={null}>
        <div onPaste={handlePaste} tabIndex={-1}>
        <Form onFinish={handleAdd} layout="vertical">
          <Form.Item name="name" label="物品名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 护照" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Input placeholder="例如: 证件票据类" />
          </Form.Item>
          <Form.Item label="图片">
            <Dragger accept="image/*" showUploadList={false} beforeUpload={handleImageUpload}
              style={{ padding: previewUrl ? 0 : undefined }}>
              {previewUrl ? (
                <img src={previewUrl} alt="预览" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
              ) : (
                <>
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  <p className="ant-upload-text">拖入图片或点击选择</p>
                  <p className="ant-upload-hint">也可在弹窗内任意位置 Ctrl+V 粘贴图片</p>
                </>
              )}
            </Dragger>
            {previewUrl && (
              <Button type="link" danger size="small" onClick={() => { setImageBase64(''); setPreviewUrl('') }} style={{ marginTop: 8 }}>
                移除图片
              </Button>
            )}
          </Form.Item>
          <Button type="primary" htmlType="submit" block>添加</Button>
        </Form>
        </div>
      </Modal>

      {/* 编辑物品弹窗 */}
      <Modal title="编辑物品" open={editModalOpen} onCancel={() => { setEditModalOpen(false); setEditItem(null); setImageBase64(''); setPreviewUrl('') }} footer={null}>
        <div onPaste={handlePaste} tabIndex={-1}>
        <Form onFinish={handleUpdateItem} layout="vertical" initialValues={editItem ? { name: editItem.name, category: editItem.category, is_essential: editItem.is_essential } : {}}>
          <Form.Item name="name" label="物品名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 护照" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Input placeholder="例如: 证件票据类" />
          </Form.Item>
          <Form.Item name="is_essential" valuePropName="checked">
            <input type="checkbox" /> 标记为常备
          </Form.Item>
          <Form.Item label="图片">
            <Dragger accept="image/*" showUploadList={false} beforeUpload={handleImageUpload}
              style={{ padding: previewUrl ? 0 : undefined }}>
              {previewUrl ? (
                <img src={previewUrl} alt="" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
              ) : (
                <>
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  <p className="ant-upload-text">拖入图片或点击更换</p>
                </>
              )}
            </Dragger>
            {previewUrl && (
              <Button type="link" danger size="small" onClick={() => { setImageBase64(''); setPreviewUrl('') }} style={{ marginTop: 8 }}>
                移除图片
              </Button>
            )}
          </Form.Item>
          <Button type="primary" htmlType="submit" block>保存</Button>
        </Form>
        </div>
      </Modal>
    </div>
  )
}
