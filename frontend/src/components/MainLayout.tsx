import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Input, Tooltip, Drawer, Grid, Button, Modal, message } from 'antd'
import {
  MenuFoldOutlined, MenuUnfoldOutlined, SearchOutlined,
  CheckSquareOutlined, InboxOutlined, FileTextOutlined,
  FolderOutlined, SettingOutlined,
  GlobalOutlined, PlusOutlined, RobotOutlined, CodeOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import { getAnimalAvatar } from '../utils/avatar'
import { getTripTemplates, createTripTemplate } from '../services/api'
import AiAssistant from './AIAssistant'

const { Sider, Content, Header } = Layout

// 侧边栏内容组件（桌面端 Sider 和移动端 Drawer 共用）
function SidebarContent({ collapsed, user, menuItems, currentKey, navigate, logout, onAddTemplate }: any) {
  const animal = user ? getAnimalAvatar(user.id) : null

  return (
    <>
      {/* 用户资料卡片 */}
      <div
        className="sidebar-profile-card"
        style={collapsed ? { padding: '12px 8px' } : {}}
        onClick={() => navigate('/chalv/profile')}
      >
        {collapsed ? (
          <div className="sidebar-profile-collapsed">
            {animal && (
              <div
                className="sidebar-avatar-collapsed"
                style={{ background: animal.bg }}
              >
                <span className="sidebar-avatar-emoji-sm">{animal.emoji}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="sidebar-profile-expanded">
            {animal && (
              <div
                className="sidebar-avatar-circle"
                style={{ background: animal.bg }}
              >
                <span className="sidebar-avatar-emoji">{animal.emoji}</span>
              </div>
            )}
            <div className="sidebar-profile-text">
              <div className="sidebar-profile-name">
                {user?.display_name || '用户'}
              </div>
              <div className="sidebar-profile-role">
                {user?.role === 'admin' ? '管理员' : '员工'}
                <span className="sidebar-profile-dot" />
              </div>
            </div>
          </div>
        )}
      </div>
      <Menu
        className="sidebar-menu"
        mode="inline"
        selectedKeys={[currentKey]}
        style={{ background: 'transparent', borderRight: 0, color: '#2E5A3B', marginTop: 8 }}
        items={menuItems.map((item: any) => {
          if (item.type === 'divider') {
            return {
              type: 'group' as const,
              label: <span style={{ color: '#4A7C59', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{item.label}</span>,
            }
          }
          if (item.type === 'button') {
            return {
              key: item.key,
              icon: item.icon,
              label: collapsed ? null : (
                <span
                  onClick={(e) => { e.stopPropagation(); onAddTemplate() }}
                  style={{ color: '#4A7C59', cursor: 'pointer' }}
                >
                  {item.label}
                </span>
              ),
            }
          }
          return {
            key: item.key,
            icon: item.icon,
            label: collapsed ? null : <span>{item.label}</span>,
          }
        })}
        onClick={({ key }) => {
          if (key === '__add_template__') return
          navigate('/chalv' + key)
        }}
      />
      <div style={{ position: 'absolute', bottom: 40, width: '100%', padding: '0 16px' }}>
        <a href="https://travel-platform-teo8.onrender.com/docs" target="_blank" rel="noopener noreferrer"
           className="sidebar-bottom-link">
          <CodeOutlined />
          {!collapsed && <span>API 文档</span>}
        </a>
      </div>
      <div style={{ position: 'absolute', bottom: 0, width: '100%', padding: '12px 16px', borderTop: '1px solid rgba(76,175,80,0.15)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#4A7C59', transition: 'all 0.2s', fontSize: 13 }}
           onClick={logout}
           onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#1B3A24'}
           onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#4A7C59'}>
        <SettingOutlined />
        {!collapsed && <span>设置</span>}
      </div>
    </>
  )
}

const DEFAULT_TEMPLATES = [
  { name: '香港差旅🌏' },
  { name: '欧洲差旅🌍' },
  { name: '日本差旅🗾' },
  { name: '国内差旅🏠' },
]

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [addingLoading, setAddingLoading] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  // 加载目的地模板
  const loadTemplates = useCallback(async () => {
    try {
      const res = await getTripTemplates()
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setTemplates(res.data)
      } else {
        setTemplates(DEFAULT_TEMPLATES)
      }
    } catch {
      setTemplates(DEFAULT_TEMPLATES)
    }
  }, [])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  // 动态构建菜单
  const menuItems = [
    { key: '/tasks', icon: <CheckSquareOutlined />, label: '每日任务' },
    { key: '/inbox', icon: <InboxOutlined />, label: '新增需求确认处' },
    { type: 'divider' as const, label: '目的地' },
    ...templates.map((t) => ({
      key: `/checklist?template=${encodeURIComponent(t.name)}`,
      icon: <GlobalOutlined />,
      label: t.name,
    })),
    { key: '__add_template__', icon: <PlusOutlined />, label: '添加新清单', type: 'button' as const },
    { type: 'divider' as const, label: '储蓄库' },
    { key: '/sop', icon: <FileTextOutlined />, label: 'SOP知识库' },
    { key: '/documents', icon: <FolderOutlined />, label: '文档库' },
  ]

  // 添加新目的地
  const handleAddTemplate = async () => {
    if (!newTemplateName.trim()) {
      message.warning('请输入目的地名称')
      return
    }
    setAddingLoading(true)
    try {
      await createTripTemplate({ name: newTemplateName.trim() })
      message.success(`目的地「${newTemplateName.trim()}」已添加`)
      setNewTemplateName('')
      setAddModalOpen(false)
      loadTemplates()
    } catch (err: any) {
      message.error(err.response?.data?.detail || '添加失败')
    } finally {
      setAddingLoading(false)
    }
  }

  // AI 拖拽
  const [fabPos, setFabPos] = useState({ x: 0, y: 0 })
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, posX: 0, posY: 0 })
  const hasMoved = useRef(false)

  const handleFabPointerDown = useCallback((e: React.PointerEvent) => {
    hasMoved.current = false
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      posX: fabPos.x,
      posY: fabPos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [fabPos])

  const handleFabPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved.current = true
    }
    setFabPos({
      x: dragRef.current.posX + dx,
      y: dragRef.current.posY + dy,
    })
  }, [])

  const handleFabPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current.dragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }, [])

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
          className="glass-dark"
          style={{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 10 }}
        >
          <SidebarContent
            collapsed={collapsed}
            user={user}
            menuItems={menuItems}
            currentKey={currentKey}
            navigate={navigate}
            logout={logout}
            onAddTemplate={() => setAddModalOpen(true)}
          />
        </Sider>
      )}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={260}
          className="glass-drawer"
          bodyStyle={{ padding: 0, background: 'transparent' }}
          headerStyle={{ display: 'none' }}
        >
          <SidebarContent
            collapsed={false}
            user={user}
            menuItems={menuItems}
            currentKey={currentKey}
            navigate={(k: string) => { navigate(k); setDrawerOpen(false) }}
            logout={() => { logout(); setDrawerOpen(false) }}
            onAddTemplate={() => { setDrawerOpen(false); setAddModalOpen(true) }}
          />
        </Drawer>
      )}

      {/* 主内容 */}
      <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 260), transition: 'margin-left 0.2s' }}>
        {/* 顶部栏 */}
        <Header className="glass-header" style={{ padding: isMobile ? '0 12px' : '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 5 }}>
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
        <Content className="content-area" style={{ padding: isMobile ? 12 : 24, minHeight: 'calc(100vh - 56px)' }}>
          <Outlet />
        </Content>
      </Layout>

      {/* AI悬浮按钮 */}
      <Tooltip title="AI差旅助手">
        <div
          className="ai-fab"
          onPointerDown={handleFabPointerDown}
          onPointerMove={handleFabPointerMove}
          onPointerUp={handleFabPointerUp}
          onClick={() => { if (!hasMoved.current) setAiOpen(!aiOpen) }}
          style={{
            ...(isMobile ? { bottom: 16, right: 16 } : {}),
            transform: fabPos.x !== 0 || fabPos.y !== 0
              ? `translate(${fabPos.x}px, ${fabPos.y}px)`
              : undefined,
            touchAction: 'none',
          }}
        >
          <RobotOutlined style={{ fontSize: 24 }} />
        </div>
      </Tooltip>

      {/* AI聊天面板 */}
      {aiOpen && <AiAssistant onClose={() => setAiOpen(false)} />}

      {/* 添加新目的地弹窗 */}
      <Modal
        title="添加新目的地"
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); setNewTemplateName('') }}
        onOk={handleAddTemplate}
        confirmLoading={addingLoading}
        okText="添加"
        cancelText="取消"
      >
        <div style={{ marginTop: 8 }}>
          <Input
            placeholder="输入目的地名称，例如：纽约差旅"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            onPressEnter={handleAddTemplate}
            autoFocus
          />
        </div>
      </Modal>
    </Layout>
  )
}
