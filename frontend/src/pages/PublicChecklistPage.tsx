import { useState, useEffect } from 'react'
import { Card, Progress, Segmented, Collapse, Tag } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { getChecklistItems } from '../services/api'

const TEMPLATES = ['香港差旅', '欧洲差旅', '日本差旅', '国内差旅']

export default function PublicChecklistPage() {
  const [template, setTemplate] = useState('香港差旅')
  const [items, setItems] = useState<any[]>([])
  const [filterType, setFilterType] = useState('全部')

  const loadItems = async () => {
    try {
      const res = await getChecklistItems(template, filterType)
      setItems(res.data)
    } catch { /* silently handle */ }
  }

  useEffect(() => { loadItems() }, [template, filterType])

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
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>物品清单</h2>
            <Tag color="blue">{template}</Tag>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>{prepared}/{total} 已准备</span>
            <span style={{ fontWeight: 600 }}>{pct}%</span>
          </div>
          <Progress percent={pct} strokeColor={pct === 100 ? '#10b981' : '#3b82f6'} showInfo={false} />
        </div>

        <div style={{ marginTop: 12 }}>
          <Segmented options={['全部', '未准备', '必备', '国际', '电子设备']} value={filterType} onChange={(v) => setFilterType(v as string)} />
        </div>
      </Card>

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
                  style={{
                    padding: '10px 12px', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    border: `2px solid ${item.is_prepared ? '#10b981' : '#cbd5e1'}`,
                    background: item.is_prepared ? '#10b981' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', flexShrink: 0,
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

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', padding: '8px 24px', boxShadow: '0 -2px 8px rgba(0,0,0,0.08)', zIndex: 5 }}>
        <Progress percent={pct} format={() => `${prepared}/${total}`} strokeColor={pct === 100 ? '#10b981' : '#3b82f6'} />
      </div>
    </div>
  )
}
