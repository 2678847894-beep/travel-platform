import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Progress, Space, Checkbox, Input, message, Modal, Tag, Descriptions, Grid } from 'antd'
import { ArrowLeftOutlined, EditOutlined, ExportOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import { getSopDocument, updateSopDocument, toggleSopStep, deleteSopDocument } from '../services/api'
import { useAuthStore } from '../store/authStore'

interface Step {
  id?: number
  order: number
  title: string
  detail?: string
  status: boolean
  checked_at?: string | null
}

export default function SopDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [doc, setDoc] = useState<any>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [notes, setNotes] = useState('')
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const loadDoc = async () => {
    const res = await getSopDocument(Number(id))
    setDoc(res.data)
    setSteps(res.data.steps || [])
    setNotes(res.data.notes || '')
  }

  useEffect(() => { loadDoc() }, [id])

  const handleToggle = async (stepOrder: number) => {
    await toggleSopStep(Number(id), stepOrder)
    setSteps((prev) =>
      prev.map((s) => (s.order === stepOrder ? { ...s, status: !s.status } : s))
    )
  }

  const handleReset = () => {
    Modal.confirm({
      title: '重置进度',
      content: '将取消所有已勾选的步骤，确定继续？',
      onOk: async () => {
        const resetSteps = steps.map((s) => ({ ...s, status: false, checked_at: undefined }))
        await updateSopDocument(Number(id), { steps: resetSteps })
        setSteps(resetSteps)
        message.success('已重置')
      },
    })
  }

  const handleSave = async () => {
    await updateSopDocument(Number(id), {
      title: editTitle,
      description: editDesc,
      notes,
    })
    setEditing(false)
    loadDoc()
    message.success('已保存')
  }

  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后将无法恢复，确定继续？',
      onOk: async () => {
        await deleteSopDocument(Number(id))
        message.success('已删除')
        navigate('/sop')
      },
    })
  }

  if (!doc) return <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>

  const completed = steps.filter((s) => s.status).length
  const total = steps.length
  const pct = total > 0 ? Math.round(completed / total * 100) : 0

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* 顶部信息 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/sop')} style={{ marginBottom: 8 }}>返回</Button>
            {editing ? (
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }} />
            ) : (
              <h2 style={{ margin: 0 }}>{doc.title}</h2>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Tag color="blue">{doc.folder_name}</Tag>
              <Tag>{doc.trip_filter}</Tag>
              {doc.execution_time && <span style={{ fontSize: 13, color: '#64748b' }}>执行时间: {doc.execution_time}</span>}
              {doc.responsible && <span style={{ fontSize: 13, color: '#64748b' }}>负责人: {doc.responsible}</span>}
            </div>
          </div>
          <Space>
            {isAdmin && (
              editing ? (
                <>
                  <Button onClick={() => setEditing(false)}>取消</Button>
                  <Button type="primary" onClick={handleSave}>保存</Button>
                </>
              ) : (
                <>
                  <Button icon={<EditOutlined />} onClick={() => { setEditTitle(doc.title); setEditDesc(doc.description); setEditing(true) }}>编辑</Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>重置进度</Button>
                  <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>删除</Button>
                </>
              )
            )}
          </Space>
        </div>

        {editing && (
          <Input.TextArea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="SOP说明" style={{ marginTop: 8 }} rows={2} />
        )}

        {/* 进度 */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 14, color: '#64748b' }}>{completed}/{total} 项已完成</span>
            <span style={{ fontWeight: 600, color: pct === 100 ? '#10b981' : '#3b82f6' }}>{pct}%</span>
          </div>
          <Progress percent={pct} strokeColor={pct === 100 ? '#10b981' : '#3b82f6'} showInfo={false} />
        </div>
      </Card>

      {/* SOP说明 */}
      {doc.description && !editing && (
        <Card style={{ marginBottom: 16 }}>
          <Descriptions column={1} size="small">
            {doc.execution_time && <Descriptions.Item label="执行时间">{doc.execution_time}</Descriptions.Item>}
            {doc.responsible && <Descriptions.Item label="负责人">{doc.responsible}</Descriptions.Item>}
          </Descriptions>
          <div style={{ marginTop: 8, color: '#475569', lineHeight: 1.6 }}>{doc.description}</div>
        </Card>
      )}

      {/* 步骤列表 */}
      <Card title="执行步骤">
        {steps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            暂无步骤，点击"编辑"添加步骤
          </div>
        ) : (
          steps.sort((a, b) => a.order - b.order).map((step) => (
            <div
              key={step.order}
              className={`check-item ${step.status ? 'checked' : ''}`}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                cursor: 'pointer',
              }}
              onClick={() => handleToggle(step.order)}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: `2px solid ${step.status ? '#10b981' : '#cbd5e1'}`,
                background: step.status ? '#10b981' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', flexShrink: 0, marginTop: 2,
                transition: 'all 0.3s',
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

      {/* 备注 */}
      <Card title="备注" style={{ marginTop: 16 }}>
        {editing ? (
          <Input.TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="记录特殊情况、异常或注意事项..." />
        ) : (
          <div style={{ color: notes ? '#475569' : '#94a3b8', minHeight: 40 }}>
            {notes || '暂无备注'}
          </div>
        )}
      </Card>

      {/* 底部操作 */}
      <div style={{ textAlign: 'center', marginTop: 24, padding: '16px 0' }}>
        <Space>
          <Button onClick={() => navigate('/sop')}>返回列表</Button>
          {!editing && <Button icon={<ReloadOutlined />} onClick={handleReset}>重置进度</Button>}
        </Space>
      </div>
    </div>
  )
}
