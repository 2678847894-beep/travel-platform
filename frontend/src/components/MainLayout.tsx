import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Input, Avatar, Tooltip, Drawer, Grid, Button } from 'antd'
import {
  MenuFoldOutlined, MenuUnfoldOutlined, SearchOutlined,
  CheckSquareOutlined, InboxOutlined, FileTextOutlined,
  FolderOutlined, SettingOutlined,
  GlobalOutlined, HomeOutlined, PlusOutlined, RobotOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import AiAssistant from './AiAssistant'

const { Sider, Content, Header } = Layout

// 侧边栏内容组件（桌面端 Sider 和移动端 Drawer 共用）
function SidebarContent({ collapsed, user, menuItems, currentKey, navigate, logout }: any) {
  return (
    <>
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar style={{ background: '#3b82f6' }} icon={<span>👤</span>} />
          {!collapsed && <span style={{ color: '#fff', fontWeight: 600 }}>{user?.display_name || '用户'}</span>}
        </div>
        {!collapsed && <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{user?.role === 'admin' ? '管理员' : '员工'}</div>}
      </div>
      <Menu
        mode="inline"
        selectedKeys={[currentKey]}
        style={{ background: 'transparent', borderRight: 0, color: '#fff', marginTop: 8 }}
        theme="dark"
        items={menuItems.map((item: any) => {
          if (item.type === 'divider') {
            return {
              type: 'group' as const,
              label: <span style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{item.label}</span>,
            }
          }
          return {
            key: item.key,
            icon: item.icon,
            label: collapsed ? null : <span>{item.label}</span>,
          }
        })}
        onClick={({ key }) => navigate('/chalv' + key)}
      />
      <div style={{ position: 'absolute', bottom: 0, width: '100%', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#94a3b8' }}
           onClick={logout}>
        <SettingOutlined />
        {!collapsed && <span style={{ fontSize: 13 }}>设置</span>}
      </div>
    </>
  )
}

const menuItems = [
  { key: '/tasks', icon: <CheckSquareOutlined />, label: '每日任务' },
  { key: '/inbox', icon: <InboxOutlined />, label: '新增需求确认处' },
  { type: 'divider' as const, label: '目的地' },
  { key: '/checklist?template=香港差旅', icon: <GlobalOutlined />, label: '香港差旅' },
  { key: '/checklist?template=欧洲差旅', icon: <GlobalOutlined />, label: '欧洲差旅' },
  { key: '/checklist?template=日本差旅', icon: <GlobalOutlined />, label: '日本差旅' },
  { key: '/checklist?template=国内差旅', icon: <HomeOutlined />, label: '国内差旅' },
  { key: '/checklist?template=new', icon: <PlusOutlined />, label: '添加新清单' },
  { type: 'divider' as const, label: '储蓄库' },
  { key: '/sop', icon: <FileTextOutlined />, label: 'SOP知识库' },
  { key: '/documents', icon: <FolderOutlined />, label: '文档库' },
]

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const currentKey = location.pathname.replace('/chalv', '') + location.search

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 —— 桌面端固定，移动端 Drawer */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={260}
          style={{ background: '#1e293b', overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 10 }}
        >
          <SidebarContent collapsed={collapsed} user={user} menuItems={menuItems} currentKey={currentKey} navigate={navigate} logout={logout} />
        </Sider>
      )}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={260}
          bodyStyle={{ padding: 0, background: '#1e293b' }}
          headerStyle={{ display: 'none' }}
        >
          <SidebarContent collapsed={false} user={user} menuItems={menuItems} currentKey={currentKey} navigate={(k: string) => { navigate(k); setDrawerOpen(false) }} logout={() => { logout(); setDrawerOpen(false) }} />
        </Drawer>
      )}

      {/* 主内容 */}
      <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 260), transition: 'margin-left 0.2s' }}>
        {/* 顶部栏 */}
        <Header style={{ background: '#fff', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: 56, position: 'sticky', top: 0, zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16 }}>
            <span onClick={() => isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed)} style={{ cursor: 'pointer', fontSize: 18 }}>
              {isMobile ? <MenuUnfoldOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
            </span>
            <span style={{ fontWeight: 700, fontSize: isMobile ? 15 : 18, color: '#1e293b' }}>差旅管家</span>
          </div>
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Input prefix={<SearchOutlined />} placeholder="搜索差旅SOP、文档、任务..." style={{ width: 320, borderRadius: 8 }} />
            </div>
          )}
        </Header>

        {/* 内容区 */}
        <Content style={{ padding: isMobile ? 12 : 24, minHeight: 'calc(100vh - 56px)', background: '#f8fafc' }}>
          <Outlet />
        </Content>
      </Layout>

      {/* AI悬浮按钮 */}
      <Tooltip title="AI差旅助手">
        <div className="ai-fab" onClick={() => setAiOpen(!aiOpen)} style={isMobile ? { bottom: 16, right: 16 } : {}}>
          <RobotOutlined style={{ fontSize: 24 }} />
        </div>
      </Tooltip>

      {/* AI聊天面板 */}
      {aiOpen && <AiAssistant onClose={() => setAiOpen(false)} />}
    </Layout>
  )
}
