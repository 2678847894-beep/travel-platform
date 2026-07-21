import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import { FileTextOutlined, CalendarOutlined, CheckCircleOutlined, FolderOutlined } from '@ant-design/icons'

const { Header, Content } = Layout

const navItems = [
  { key: '/', icon: <FileTextOutlined />, label: 'SOP知识库' },
  { key: '/sop', icon: <FileTextOutlined />, label: 'SOP知识库' },
  { key: '/tasks', icon: <CalendarOutlined />, label: '每日任务' },
  { key: '/checklist', icon: <CheckCircleOutlined />, label: '物品清单' },
  { key: '/documents', icon: <FolderOutlined />, label: '文档库' },
]

export default function PublicLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentKey = location.pathname === '/' ? '/' : '/' + location.pathname.split('/')[1]

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#1e293b', cursor: 'pointer' }} onClick={() => navigate('/')}>
            差旅知识库
          </span>
          <Menu
            mode="horizontal"
            selectedKeys={[currentKey]}
            items={[
              { key: '/', label: 'SOP知识库', icon: <FileTextOutlined /> },
              { key: '/tasks', label: '每日任务', icon: <CalendarOutlined /> },
              { key: '/checklist', label: '物品清单', icon: <CheckCircleOutlined /> },
              { key: '/documents', label: '文档库', icon: <FolderOutlined /> },
            ]}
            onClick={({ key }) => navigate(key)}
            style={{ borderBottom: 'none', minWidth: 400 }}
          />
        </div>
      </Header>
      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
