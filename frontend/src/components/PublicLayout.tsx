import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Drawer, Grid } from 'antd'
import { FileTextOutlined, CalendarOutlined, CheckCircleOutlined, FolderOutlined, MenuOutlined } from '@ant-design/icons'

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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const currentKey = location.pathname === '/' ? '/' : '/' + location.pathname.split('/')[1]

  const menuItems = [
    { key: '/', label: 'SOP知识库', icon: <FileTextOutlined /> },
    { key: '/tasks', label: '每日任务', icon: <CalendarOutlined /> },
    { key: '/checklist', label: '物品清单', icon: <CheckCircleOutlined /> },
    { key: '/documents', label: '文档库', icon: <FolderOutlined /> },
  ]

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header style={{
        background: '#fff',
        padding: isMobile ? '0 12px' : '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 24 }}>
          {isMobile && (
            <span onClick={() => setDrawerOpen(true)} style={{ cursor: 'pointer', fontSize: 18 }}>
              <MenuOutlined />
            </span>
          )}
          <span style={{ fontWeight: 700, fontSize: isMobile ? 15 : 18, color: '#1e293b', cursor: 'pointer' }} onClick={() => navigate('/')}>
            差旅知识库
          </span>
          {!isMobile && (
            <Menu
              mode="horizontal"
              selectedKeys={[currentKey]}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
              style={{ borderBottom: 'none', minWidth: 400 }}
            />
          )}
        </div>
      </Header>

      {/* 移动端Drawer导航 */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={240}
          bodyStyle={{ padding: 12 }}
        >
          <h3 style={{ margin: '0 0 16px 8px', fontSize: 16 }}>差旅知识库</h3>
          <Menu
            mode="inline"
            selectedKeys={[currentKey]}
            items={menuItems}
            onClick={({ key }) => { navigate(key); setDrawerOpen(false) }}
            style={{ border: 'none' }}
          />
        </Drawer>
      )}

      <Content style={{ padding: isMobile ? 12 : 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
