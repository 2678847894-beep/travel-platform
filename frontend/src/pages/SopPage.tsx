import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Segmented, Modal, Form, message, Space, Tag, Select, Grid } from 'antd'
import { PlusOutlined, FolderAddOutlined, SearchOutlined, FileTextOutlined, DeleteOutlined, EditOutlined, ImportOutlined } from '@ant-design/icons'
import { getSopFolders, getSopDocuments, createSopFolder, deleteSopFolder, createSopDocument, importSopDocument, updateSopFolder } from '../services/api'
import { useAuthStore } from '../store/authStore'

export default function SopPage() {
  const [folders, setFolders] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [tripFilter, setTripFilter] = useState('香港差旅')
  const [folderModal, setFolderModal] = useState(false)
  const [docModal, setDocModal] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const isAdmin = user?.role === 'admin'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importModal, setImportModal] = useState(false)
  const [importFolderId, setImportFolderId] = useState<number | null>(null)
  const [renameModal, setRenameModal] = useState(false)
  const [renameFolder, setRenameFolder] = useState<any>(null)

  const loadData = async () => {
    const [fRes, dRes] = await Promise.all([
      getSopFolders(tripFilter),
      getSopDocuments(undefined, tripFilter),
    ])
    setFolders(fRes.data)
    setDocuments(dRes.data)
  }

  useEffect(() => { loadData() }, [tripFilter])

  const formatTime = (ts: string) => {
    if (!ts) return ''
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const handleCreateFolder = async (values: any) => {
    await createSopFolder({ ...values, trip_filter: tripFilter, order_index: folders.length })
    message.success('文件夹创建成功')
    setFolderModal(false)
    loadData()
  }

  const handleDeleteFolder = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除文件夹将同时删除其下所有SOP文档，确定继续？',
      onOk: async () => {
        try {
          await deleteSopFolder(id)
          message.success('已删除')
          loadData()
        } catch (err: any) {
          const detail = err?.response?.data?.detail || err?.message || '未知错误'
          message.error(`删除失败：${detail}`)
        }
      },
    })
  }

  const handleRenameFolder = async (values: any) => {
    if (!renameFolder) return
    await updateSopFolder(renameFolder.id, { name: values.name, icon: values.icon })
    message.success('文件夹已更新')
    setRenameModal(false)
    setRenameFolder(null)
    loadData()
  }

  const handleCreateDoc = async (values: any) => {
    await createSopDocument({
      ...values,
      folder_id: selectedFolder,
      trip_filter: tripFilter,
      steps: [],
      folder_name: folders.find((f) => f.id === selectedFolder)?.name || '',
    })
    message.success('文档创建成功')
    setDocModal(false)
    loadData()
  }

  const handleImportConfirm = () => {
    if (importFolderId === null) {
      message.warning('请选择目标文件夹')
      return
    }
    setImportModal(false)
    setTimeout(() => fileInputRef.current?.click(), 100)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder_id', String(importFolderId))
    formData.append('trip_filter', tripFilter)
    try {
      await importSopDocument(formData)
      message.success('文档导入成功')
      loadData()
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || '未知错误'
      message.error(`导入失败：${detail}`)
    }
    e.target.value = ''
  }

  return (
    <div>
      {/* ===== 顶部区域 ===== */}
      <div style={{
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 20,
        marginBottom: 24,
      }}>
        {/* 标题行：左侧标题 + 统计，右侧搜索 + 操作 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>SOP知识库</h2>
            <Tag color="blue" style={{ borderRadius: 6, fontSize: 12, padding: '1px 10px' }}>
              {folders.length} 个文件夹 · {documents.length} 篇文档
            </Tag>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索文档标题..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedFolder(null) }}
              allowClear
              style={{ width: isMobile ? '100%' : 220 }}
            />
            {isAdmin && (
              <>
                <Button icon={<FolderAddOutlined />} onClick={() => setFolderModal(true)}>
                  {isMobile ? '' : '新建文件夹'}
                </Button>
                <Button icon={<ImportOutlined />} onClick={() => {
                  setImportModal(true)
                  setImportFolderId(selectedFolder || folders[0]?.id || null)
                }}>
                  {isMobile ? '' : '导入文档'}
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".txt,.md,.json,.csv,.docx,.pdf,.xlsx,.pptx"
                  onChange={handleFileChange}
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setDocModal(true)}>
                  新建文档
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Segmented 目的地切换 */}
        <Segmented
          options={['香港差旅', '欧洲差旅', '日本差旅', '国内差旅']}
          value={tripFilter}
          onChange={(v) => { setTripFilter(v as string); setSelectedFolder(null) }}
          style={isMobile ? { width: '100%' } : undefined}
          block={isMobile}
        />
      </div>

      {/* ===== 文件夹列表 ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {folders.map((folder) => {
          const isExpanded = selectedFolder === folder.id
          const allDocs = isExpanded ? documents.filter((d) => d.folder_id === folder.id) : []
          const folderDocs = search
            ? allDocs.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
            : allDocs
          const docCount = folder.documents?.length ?? 0

          return (
            <div
              key={folder.id}
              style={{
                background: '#fff',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                borderLeft: isExpanded ? '3px solid #3b82f6' : '3px solid transparent',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                overflow: 'hidden',
              }}
            >
              {/* 文件夹头部行 */}
              <div
                onClick={() => { setSelectedFolder(isExpanded ? null : folder.id); setSearch('') }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  background: isExpanded ? '#F0F7FF' : '#fff',
                  transition: 'background 0.15s',
                }}
              >
                {/* 彩色圆形图标 */}
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  marginRight: 12,
                  flexShrink: 0,
                  color: '#1e40af',
                }}>
                  {folder.icon || '📁'}
                </div>

                {/* 文件夹信息 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: 15,
                    color: '#1e293b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {folder.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    {docCount} 篇文档
                    {folder.updated_at && (
                      <span> · 更新于 {formatTime(folder.updated_at)}</span>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                {isAdmin && (
                  <Space size={2} style={{ flexShrink: 0, marginRight: 4 }}>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => { e.stopPropagation(); setRenameFolder(folder); setRenameModal(true) }}
                      style={{ color: '#64748b' }}
                    />
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }}
                    />
                  </Space>
                )}

                {/* 展开/收起箭头 */}
                <span style={{
                  marginLeft: 4,
                  color: '#94a3b8',
                  fontSize: 11,
                  flexShrink: 0,
                  transition: 'transform 0.2s',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>
                  ▼
                </span>
              </div>

              {/* 展开的文档列表 */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid #e2e8f0', background: '#F8FAFC' }}>
                  {folderDocs.length === 0 ? (
                    <div style={{
                      padding: '36px 16px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: 13,
                    }}>
                      暂无文档，点击上方
                      <span style={{ color: '#3b82f6', fontWeight: 500 }}> + 新建</span>
                      {' '}开始创建
                    </div>
                  ) : (
                    folderDocs.map((doc, idx) => (
                      <div
                        key={doc.id}
                        onClick={() => navigate(`/sop/${doc.id}`)}
                        style={{
                          padding: '12px 16px 12px 52px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: idx < folderDocs.length - 1 ? '1px solid #e8ecf1' : 'none',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#EFF6FF' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <FileTextOutlined style={{
                            color: '#3b82f6',
                            fontSize: 16,
                            flexShrink: 0,
                          }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{
                              fontWeight: 600,
                              fontSize: 14,
                              color: '#1e293b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {doc.title}
                            </div>
                            {doc.description && (
                              <div style={{
                                fontSize: 12,
                                color: '#94a3b8',
                                marginTop: 2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {doc.description.slice(0, 60)}{doc.description.length > 60 ? '...' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                        {doc.updated_at && (
                          <span style={{
                            fontSize: 12,
                            color: '#94a3b8',
                            flexShrink: 0,
                            marginLeft: 12,
                          }}>
                            {formatTime(doc.updated_at)}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 新建文件夹弹窗 */}
      <Modal title="新建文件夹" open={folderModal} onCancel={() => setFolderModal(false)} footer={null}>
        <Form onFinish={handleCreateFolder} layout="vertical">
          <Form.Item name="name" label="文件夹名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 香港差旅" />
          </Form.Item>
          <Form.Item name="icon" label="图标" initialValue="📁">
            <Input placeholder="emoji图标" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>创建</Button>
        </Form>
      </Modal>

      {/* 新建文档弹窗 */}
      <Modal title="新建文档" open={docModal} onCancel={() => setDocModal(false)} footer={null}>
        <Form onFinish={handleCreateDoc} layout="vertical">
          <Form.Item name="title" label="文档标题" rules={[{ required: true }]}>
            <Input placeholder="例如: 香港直播设备检查" />
          </Form.Item>
          <Form.Item label="所属文件夹">
            <Select value={selectedFolder} onChange={setSelectedFolder} placeholder="选择文件夹">
              {folders.map((f) => (
                <Select.Option key={f.id} value={f.id}>{f.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block disabled={!selectedFolder}>创建</Button>
        </Form>
      </Modal>

      {/* 重命名文件夹弹窗 */}
      <Modal title="编辑文件夹" open={renameModal} onCancel={() => { setRenameModal(false); setRenameFolder(null) }} footer={null}>
        <Form onFinish={handleRenameFolder} layout="vertical" initialValues={{ name: renameFolder?.name, icon: renameFolder?.icon }}>
          <Form.Item name="name" label="文件夹名称" rules={[{ required: true }]}>
            <Input placeholder="文件夹名称" />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <Input placeholder="emoji图标" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>保存</Button>
        </Form>
      </Modal>

      {/* 选择导入文件夹弹窗 */}
      <Modal title="选择导入文件夹" open={importModal} onCancel={() => setImportModal(false)} onOk={handleImportConfirm} okText="选择文件">
        <div style={{ padding: '16px 0' }}>
          <Select
            value={importFolderId}
            onChange={setImportFolderId}
            placeholder="选择目标文件夹"
            style={{ width: '100%' }}
          >
            {folders.map((f) => (
              <Select.Option key={f.id} value={f.id}>{f.name}</Select.Option>
            ))}
          </Select>
        </div>
      </Modal>
    </div>
  )
}
