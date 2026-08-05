import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Segmented, Progress, Modal, Form, message, Space, Tag, Tooltip, Upload, Select, Grid } from 'antd'
import { PlusOutlined, UploadOutlined, FolderAddOutlined, SearchOutlined, FileTextOutlined, DeleteOutlined, EditOutlined, ImportOutlined } from '@ant-design/icons'
import { getSopFolders, getSopDocuments, createSopFolder, deleteSopFolder, createSopDocument } from '../services/api'
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
        await deleteSopFolder(id)
        message.success('已删除')
        loadData()
      },
    })
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
                <Upload
                  accept=".txt,.md,.json,.csv"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    const reader = new FileReader()
                    reader.onload = async (e) => {
                      const content = e.target?.result as string
                      await createSopDocument({
                        folder_id: selectedFolder || folders[0]?.id,
                        title: file.name.replace(/\.[^/.]+$/, ''),
                        description: content.slice(0, 500),
                        trip_filter: tripFilter,
                        steps: [],
                        folder_name: selectedFolder ? folders.find((f) => f.id === selectedFolder)?.name || '' : folders[0]?.name || '',
                      })
                      message.success('文档导入成功')
                      loadData()
                    }
                    reader.readAsText(file)
                    return false
                  }}
                >
                  <Button icon={<ImportOutlined />}>导入文档</Button>
                </Upload>
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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(1, 1fr)' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {folders.map((folder) => (
          <Card
            key={folder.id}
            className="card"
            hoverable
            onClick={() => { setSelectedFolder(folder.id); setSearch('') }}
            style={{ borderLeft: selectedFolder === folder.id ? '4px solid #3b82f6' : '4px solid transparent' }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{folder.icon}</span>
                <span>{folder.name}</span>
                <Tag>{folder.sop_count || 0}篇</Tag>
              </div>
            }
            extra={
              isAdmin && (
                <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }} />
              )
            }
          >
            {folder.children?.map((child: any) => (
              <div key={child.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setSelectedFolder(child.id) }}>
                <FileTextOutlined style={{ marginRight: 8 }} />
                {child.name}
                <Tag style={{ marginLeft: 8 }}>{child.sop_count || 0}</Tag>
              </div>
            ))}
          </Card>
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
    </div>
  )
}
