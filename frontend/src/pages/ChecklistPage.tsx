import { useState, useEffect } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { Card, Button, Progress, Space, Input, Segmented, Modal, Form, message, Collapse, Tag, Upload, Select } from 'antd'
import { PlusOutlined, ReloadOutlined, FileTextOutlined, InboxOutlined, DeleteOutlined } from '@ant-design/icons'
import { getChecklistItems, createChecklistItem, deleteChecklistItem } from '../services/api'
import { getTrips, createTrip, deleteTrip, getTripItems, toggleTripItem } from '../services/api'
import { useAuthStore } from '../store/authStore'

const { Dragger } = Upload

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
  const [tripModalOpen, setTripModalOpen] = useState(false)
  const [imageBase64, setImageBase64] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

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
      const filterMap: Record<string, string> = { '已准备': 'prepared', '未准备': 'unprepared', '常备': 'essential', '全部': 'all' }
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
              options={template === '香港差旅' ? ['全部', '已准备', '未准备', '常备'] : ['全部', '已准备', '未准备']}
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
        <Collapse
          defaultActiveKey={Object.keys(grouped)}
          items={Object.entries(grouped).map(([cat, catItems]) => {
            const catPrepared = catItems.filter((i) => i.is_prepared).length
            return {
              key: cat,
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{cat}</span>
                  <span style={{ fontSize: 13, color: '#64748b' }}>({catPrepared}/{catItems.length})</span>
                </div>
              ),
              children: catItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '10px 12px', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  }}
                  onClick={() => handleToggle(item.id)}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    border: `2px solid ${item.is_prepared ? '#10b981' : '#cbd5e1'}`,
                    background: item.is_prepared ? '#10b981' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', flexShrink: 0, transition: 'all 0.3s',
                  }}>
                    {item.is_prepared && '✓'}
                  </div>
                  <span style={{ flex: 1 }}>{item.name}</span>
                  {item.image_data && <img src={item.image_data} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />}
                  {item.is_prepared && <Tag color="success">已准备</Tag>}
                  {item.is_essential && <Tag color="red">常备</Tag>}
                  {item.related_doc_id && <FileTextOutlined style={{ color: '#3b82f6' }} />}
                  {isAdmin && (
                    <Button type="text" danger size="small" icon={<DeleteOutlined />}
                      onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id) }} />
                  )}
                </div>
              )),
            }
          })}
        />
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
    </div>
  )
}
