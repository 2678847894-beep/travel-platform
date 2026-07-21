import { useState, useEffect } from 'react'
import { Card, Button, Space, Input, Segmented, Upload, Modal, message, Table, Tag } from 'antd'
import { UploadOutlined, FolderAddOutlined, SearchOutlined, DownloadOutlined, DeleteOutlined, FilePdfOutlined, FileImageOutlined, FileWordOutlined, FileExcelOutlined } from '@ant-design/icons'
import { getDocumentFiles, uploadDocument, deleteDocumentFile } from '../services/api'
import { useAuthStore } from '../store/authStore'

const FOLDERS = ['证件类', '交通票据', '酒店住宿', '会议资料', '发票报销']

const fileIcon = (type: string) => {
  if (['.pdf'].includes(type)) return <FilePdfOutlined style={{ color: '#ef4444', fontSize: 20 }} />
  if (['.png', '.jpg', '.jpeg', '.gif'].includes(type)) return <FileImageOutlined style={{ color: '#3b82f6', fontSize: 20 }} />
  if (['.doc', '.docx'].includes(type)) return <FileWordOutlined style={{ color: '#3b82f6', fontSize: 20 }} />
  if (['.xls', '.xlsx'].includes(type)) return <FileExcelOutlined style={{ color: '#10b981', fontSize: 20 }} />
  return <FilePdfOutlined style={{ color: '#64748b', fontSize: 20 }} />
}

export default function DocumentLibrary() {
  const [files, setFiles] = useState<any[]>([])
  const [selectedFolder, setSelectedFolder] = useState('证件类')
  const [tripFilter, setTripFilter] = useState('全部')
  const [search, setSearch] = useState('')
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const loadFiles = async () => {
    const res = await getDocumentFiles(selectedFolder, tripFilter)
    setFiles(res.data)
  }

  useEffect(() => { loadFiles() }, [selectedFolder, tripFilter])

  const handleUpload = async (info: any) => {
    if (info.file.status === 'done') {
      const formData = new FormData()
      formData.append('file', info.file.originFileObj)
      formData.append('folder_name', selectedFolder)
      formData.append('trip_filter', tripFilter)
      await uploadDocument(formData)
      message.success('上传成功')
      loadFiles()
    }
  }

  const handleDelete = async (id: number) => {
    await deleteDocumentFile(id)
    message.success('已删除')
    loadFiles()
  }

  const filteredFiles = search
    ? files.filter((f) => f.original_name.toLowerCase().includes(search.toLowerCase()))
    : files

  return (
    <div>
      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>文档库</h2>
            <Tag color="blue">{files.length}个文件</Tag>
          </div>
          <Space>
            <Input prefix={<SearchOutlined />} placeholder="搜索文件..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
            {isAdmin && (
              <Upload customRequest={({ onSuccess }: any) => onSuccess && onSuccess(null)} onChange={handleUpload} showUploadList={false}>
                <Button icon={<UploadOutlined />}>上传</Button>
              </Upload>
            )}
          </Space>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Segmented options={FOLDERS} value={selectedFolder} onChange={(v) => setSelectedFolder(v as string)} />
          <Segmented options={['全部', '香港差旅', '日本差旅', '国内差旅']} value={tripFilter} onChange={(v) => setTripFilter(v as string)} />
        </div>
      </Card>

      {/* 文件列表 */}
      <Card>
        {filteredFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            {search ? '未找到匹配文件' : '暂无文件，点击"上传"添加'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filteredFiles.map((f) => (
              <div key={f.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                {fileIcon(f.file_type)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.original_name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {f.file_size ? `${(f.file_size / 1024).toFixed(1)} KB` : ''} · {new Date(f.created_at).toLocaleDateString()}
                  </div>
                </div>
                {isAdmin && (
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(f.id)} />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
