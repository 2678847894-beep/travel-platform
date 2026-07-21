import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Input, Segmented, Progress, Tag } from 'antd'
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons'
import { getSopFolders, getSopDocuments, getSopStats } from '../services/api'

export default function PublicSopPage() {
  const [folders, setFolders] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [tripFilter, setTripFilter] = useState('全部')
  const [stats, setStats] = useState({ total_completed: 0, total_items: 0, percentage: 0 })
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const loadData = async () => {
    try {
      const [fRes, dRes, sRes] = await Promise.all([
        getSopFolders(tripFilter),
        getSopDocuments(undefined, tripFilter),
        getSopStats(),
      ])
      setFolders(fRes.data)
      setDocuments(dRes.data)
      setStats(sRes.data)
    } catch { /* silently handle auth errors for public view */ }
  }

  useEffect(() => { loadData() }, [tripFilter])

  const filteredDocs = search
    ? documents.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
    : selectedFolder
      ? documents.filter((d) => d.folder_id === selectedFolder)
      : documents

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>SOP知识库</h2>
            <Tag color="blue">{folders.length}个文件夹 {documents.length}篇文档</Tag>
          </div>
          <Input prefix={<SearchOutlined />} placeholder="搜索SOP文档..." value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedFolder(null) }} style={{ width: 240 }} />
        </div>
        <div style={{ marginTop: 12 }}>
          <Segmented
            options={['全部', '香港', '日本', '欧洲', '国内']}
            value={tripFilter}
            onChange={(v) => { setTripFilter(v as string); setSelectedFolder(null) }}
          />
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: '#64748b' }}>全局进度</span>
          <span style={{ fontWeight: 600 }}>{stats.total_completed} / {stats.total_items} 项 ({stats.percentage}%)</span>
        </div>
        <Progress percent={stats.percentage} strokeColor={{ from: '#3b82f6', to: '#10b981' }} showInfo={false} />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
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
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      {doc.responsible && `负责人: ${doc.responsible}`}
                      {doc.last_updated && ` · 更新于 ${new Date(doc.last_updated).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{doc.progress_completed}/{doc.progress_total}</span>
                  <Progress percent={doc.progress_total > 0 ? Math.round(doc.progress_completed / doc.progress_total * 100) : 0}
                    size="small" style={{ width: 100 }} showInfo={false} />
                </div>
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  )
}
