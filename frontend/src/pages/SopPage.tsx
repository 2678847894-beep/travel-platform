import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Segmented, Progress, Modal, Form, message, Space, Tag, Tooltip, Select, Grid } from 'antd'
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
    // 延迟触发确保 Modal 关闭动画完成后再打开文件选择框
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
    // 重置 input 以支持重复导入同一文件
    e.target.value = ''
  }

  const filteredDocs = search
    ? documents.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
    : selectedFolder
      ? documents.filter((d) => d.folder_id === selectedFolder)
      : documents

  return (
    <div>
      {/* 顶部工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>SOP知识库</h2>
            <Tag color="blue">{folders.length}个文件夹 {documents.length}篇文档</Tag>
          </div>
          <Space>
            <Input prefix={<SearchOutlined />} placeholder="搜索SOP文档..." value={search} onChange={(e) => { setSearch(e.target.value); setSelectedFolder(null) }} style={{ width: 240 }} />
            {isAdmin && (
              <>
                <Button icon={<FolderAddOutlined />} onClick={() => setFolderModal(true)}>新建文件夹</Button>
                <Button icon={<ImportOutlined />} onClick={() => { setImportModal(true); setImportFolderId(selectedFolder || folders[0]?.id || null) }}>导入文档</Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".txt,.md,.json,.csv,.docx,.pdf,.xlsx,.pptx"
                  onChange={handleFileChange}
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setDocModal(true)}>新建文档</Button>
              </>
            )}
          </Space>
        </div>
        <div style={{ marginTop: 12 }}>
          <Segmented
            options={['香港差旅', '欧洲差旅', '日本差旅', '国内差旅']}
            value={tripFilter}
            onChange={(v) => { setTripFilter(v as string); setSelectedFolder(null) }}
          />
        </div>
      </Card>

      {/* 文件夹列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {folders.map((folder) => (
          <div key={folder.id}>
            <div
              className="card"
              onClick={() => { setSelectedFolder(folder.id); setSearch('') }}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                cursor: 'pointer',
                borderLeft: selectedFolder === folder.id ? '3px solid #3b82f6' : '3px solid transparent',
                background: selectedFolder === folder.id ? '#EFF6FF' : '#fff',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 20, marginRight: 12, flexShrink: 0 }}>{folder.icon}</span>
              <span style={{ fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
              <Tag style={{ marginRight: 8, flexShrink: 0 }}>{folder.documents?.length ?? 0}篇</Tag>
              {isAdmin && (
                <Space size={4} style={{ flexShrink: 0 }}>
                  <Button type="text" size="small" icon={<EditOutlined />}
                    onClick={(e) => { e.stopPropagation(); setRenameFolder(folder); setRenameModal(true) }} />
                  <Button type="text" danger size="small" icon={<DeleteOutlined />}
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }} />
                </Space>
              )}
            </div>
            {folder.children?.map((child: any) => (
              <div key={child.id}
                onClick={(e) => { e.stopPropagation(); setSelectedFolder(child.id) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px 8px 52px',
                  cursor: 'pointer',
                  borderLeft: selectedFolder === child.id ? '3px solid #3b82f6' : '3px solid transparent',
                  background: selectedFolder === child.id ? '#EFF6FF' : '#fff',
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'all 0.2s',
                }}>
                <FileTextOutlined style={{ marginRight: 8, color: '#94a3b8', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child.name}</span>
                <Tag style={{ flexShrink: 0 }}>{child.documents?.length ?? 0}</Tag>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 文档列表 */}
      {selectedFolder && (
        <Card title={`${folders.find((f) => f.id === selectedFolder)?.name || ''} - 文档列表`} style={{ marginTop: 16 }}>
          {filteredDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>暂无文档</div>
          ) : (
            filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="card"
                style={{ padding: '12px 16px', marginBottom: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => navigate(`/sop/${doc.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileTextOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{doc.title}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{doc.responsible && `负责人: ${doc.responsible}`} {doc.last_updated && `· 更新于 ${new Date(doc.last_updated).toLocaleDateString()}`}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{doc.progress_completed}/{doc.progress_total}</span>
                  <Progress percent={doc.progress_total > 0 ? Math.round(doc.progress_completed / doc.progress_total * 100) : 0} size="small" style={{ width: 100 }} showInfo={false} />
                </div>
              </div>
            ))
          )}
        </Card>
      )}

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
