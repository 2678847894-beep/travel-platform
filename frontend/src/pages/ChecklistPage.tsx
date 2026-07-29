import { useState, useEffect } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { Card, Button, Progress, Space, Input, Segmented, Modal, Form, message, Collapse, Tag } from 'antd'
import { PlusOutlined, EditOutlined, ExportOutlined, ReloadOutlined, FileTextOutlined } from '@ant-design/icons'
import { getChecklistItems, createChecklistItem, toggleChecklistItem, deleteChecklistItem } from '../services/api'
import { useAuthStore } from '../store/authStore'

const TEMPLATES = ['香港差旅', '欧洲差旅', '日本差旅', '国内差旅']

export default function ChecklistPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [template, setTemplate] = useState(() => {
    const p = searchParams.get('template') || '香港差旅'
    return p === 'new' ? '默认' : p
  })
  const [items, setItems] = useState<any[]>([])
  const [filterType, setFilterType] = useState('全部')
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(location.search).get('template') || '香港差旅'
    setTemplate(p === 'new' ? '默认' : p)
  }, [location.search])
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const loadItems = async () => {
    const filterMap: Record<string, string> = { '已准备': 'prepared', '未准备': 'unprepared', '常备': 'essential', '全部': 'all' }
    const res = await getChecklistItems(template, filterMap[filterType] || 'all')
    setItems(res.data)
  }

  useEffect(() => { loadItems() }, [template, filterType])

  const handleToggle = async (id: number) => {
    await toggleChecklistItem(id)
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_prepared: !i.is_prepared } : i)))
  }

  const handleAdd = async (values: any) => {
    await createChecklistItem({ ...values, checklist_template: template })
    message.success('添加成功')
    setModalOpen(false)
    loadItems()
  }

  // 按分类分组
  const grouped: Record<string, any[]> = {}
  items.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  })

  const prepared = items.filter((i) => i.is_prepared).length
  const total = items.length
  const pct = total > 0 ? Math.round(prepared / total * 100) : 0

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{template === '默认' ? '物品清单' : template}</h2>
          </div>
          <Space>
            {isAdmin && (
              <Button icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加物品</Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={loadItems}>刷新</Button>
          </Space>
        </div>

        {/* 进度 */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>{prepared}/{total} 已准备</span>
            <span style={{ fontWeight: 600 }}>{pct}%</span>
          </div>
          <Progress percent={pct} strokeColor={pct === 100 ? '#10b981' : '#3b82f6'} showInfo={false} />
        </div>

        {/* 快速筛选 */}
        <div style={{ marginTop: 12 }}>
          <Segmented
            options={template === '香港差旅' ? ['全部', '已准备', '未准备', '常备'] : ['全部', '已准备', '未准备']}
            value={filterType}
            onChange={(v) => setFilterType(v as string)}
          />
        </div>
      </Card>

      {/* 分类列表 */}
      {Object.keys(grouped).length === 0 ? (
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
                  className={`check-item ${item.is_prepared ? 'checked' : ''}`}
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
                  {item.is_prepared && <Tag color="success">已准备</Tag>}
                  {item.is_essential && <Tag color="red">必备</Tag>}
                  {item.is_international && <Tag color="orange">国际</Tag>}
                  {item.is_electronic && <Tag color="purple">电子</Tag>}
                  {item.related_doc_id && <FileTextOutlined style={{ color: '#3b82f6' }} />}
                </div>
              )),
            }
          })}
        />
      )}

      {/* 底部进度条 */}
      <div style={{ position: 'fixed', bottom: 0, left: 260, right: 0, background: '#fff', padding: '8px 24px', boxShadow: '0 -2px 8px rgba(0,0,0,0.08)', zIndex: 5 }}>
        <Progress percent={pct} format={() => `${prepared}/${total}`} strokeColor={pct === 100 ? '#10b981' : '#3b82f6'} />
      </div>

      {/* 添加物品弹窗 */}
      <Modal title="添加物品" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form onFinish={handleAdd} layout="vertical">
          <Form.Item name="name" label="物品名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 护照" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Input placeholder="例如: 证件票据类" />
          </Form.Item>
          <Form.Item name="is_essential" valuePropName="checked">
            <input type="checkbox" /> 标记为常备
          </Form.Item>
          <Button type="primary" htmlType="submit" block>添加</Button>
        </Form>
      </Modal>
    </div>
  )
}
