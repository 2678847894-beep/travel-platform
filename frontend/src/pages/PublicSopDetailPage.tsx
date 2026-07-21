import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Progress, Space, Tag, Descriptions } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { getSopDocument } from '../services/api'

interface Step {
  id?: number
  order: number
  title: string
  detail?: string
  status: boolean
  checked_at?: string | null
}

export default function PublicSopDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<any>(null)
  const [steps, setSteps] = useState<Step[]>([])

  const loadDoc = async () => {
    try {
      const res = await getSopDocument(Number(id))
      setDoc(res.data)
      setSteps(res.data.steps || [])
    } catch { /* silently handle */ }
  }

  useEffect(() => { loadDoc() }, [id])

  if (!doc) return <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>

  const completed = steps.filter((s) => s.status).length
  const total = steps.length
  const pct = total > 0 ? Math.round(completed / total * 100) : 0

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/sop')} style={{ marginBottom: 8 }}>返回</Button>
            <h2 style={{ margin: 0 }}>{doc.title}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Tag color="blue">{doc.folder_name}</Tag>
              <Tag>{doc.trip_filter}</Tag>
              {doc.execution_time && <span style={{ fontSize: 13, color: '#64748b' }}>执行时间: {doc.execution_time}</span>}
              {doc.responsible && <span style={{ fontSize: 13, color: '#64748b' }}>负责人: {doc.responsible}</span>}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 14, color: '#64748b' }}>{completed}/{total} 项已完成</span>
            <span style={{ fontWeight: 600, color: pct === 100 ? '#10b981' : '#3b82f6' }}>{pct}%</span>
          </div>
          <Progress percent={pct} strokeColor={pct === 100 ? '#10b981' : '#3b82f6'} showInfo={false} />
        </div>
      </Card>

      {doc.description && (
        <Card style={{ marginBottom: 16 }}>
          <Descriptions column={1} size="small">
            {doc.execution_time && <Descriptions.Item label="执行时间">{doc.execution_time}</Descriptions.Item>}
            {doc.responsible && <Descriptions.Item label="负责人">{doc.responsible}</Descriptions.Item>}
          </Descriptions>
          <div style={{ marginTop: 8, color: '#475569', lineHeight: 1.6 }}>{doc.description}</div>
        </Card>
      )}

      <Card title="执行步骤">
        {steps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>暂无步骤</div>
        ) : (
          steps.sort((a, b) => a.order - b.order).map((step) => (
            <div
              key={step.order}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: `2px solid ${step.status ? '#10b981' : '#cbd5e1'}`,
                background: step.status ? '#10b981' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', flexShrink: 0, marginTop: 2,
              }}>
                {step.status && '✓'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  <span style={{ color: '#3b82f6', marginRight: 8 }}>{step.order}.</span>
                  {step.title}
                </div>
                {step.detail && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{step.detail}</div>}
              </div>
              {step.status && <Tag color="success">已完成</Tag>}
            </div>
          ))
        )}
      </Card>

      <Card title="备注" style={{ marginTop: 16 }}>
        <div style={{ color: doc.notes ? '#475569' : '#94a3b8', minHeight: 40 }}>
          {doc.notes || '暂无备注'}
        </div>
      </Card>

      <div style={{ textAlign: 'center', marginTop: 24, padding: '16px 0' }}>
        <Button onClick={() => navigate('/sop')}>返回列表</Button>
      </div>
    </div>
  )
}
