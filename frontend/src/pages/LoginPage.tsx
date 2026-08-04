import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, message, Typography, Grid } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      await login(values.username, values.password)
      message.success('登录成功')
      navigate('/chalv/today')
    } catch (err: any) {
      message.error(err.response?.data?.detail || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
      {/* 左侧风景区 */}
      <div className="login-scenery">
        <div className="sun" />
        <div className="hot-air-balloon">
          <div className="balloon-envelope" />
          <div className="balloon-ropes"><span /><span /></div>
          <div className="balloon-basket" />
        </div>
        <div className="airplane">
          <div className="airplane-trail" />
          <span className="airplane-icon">✈</span>
        </div>
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
        <div className="cloud cloud-3" />
        <div className="cloud cloud-4" />
        <div className="cloud cloud-5" />
        <div className="mountain-layer-1" />
        <div className="mountain-layer-2" />
        <div className="mountain-blend" />
        <div className="grass-field">
          <div className="tree-simple" style={{ left: '15%' }} />
          <div className="tree-simple" style={{ left: '38%' }} />
          <div className="tree-simple" style={{ left: '62%' }} />
          <div className="tree-simple" style={{ left: '85%' }} />
        </div>
        <div className="scenery-brand">
          <h1>差旅管家</h1>
          <p>让每次出行都有温度</p>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div style={{ flex: isMobile ? '0 0 auto' : '0 0 440px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: '40px 32px' }}>
        <Card style={{ width: '100%', maxWidth: 400, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Typography.Title level={3} style={{ marginBottom: 4, color: '#D4786E' }}>欢迎回来</Typography.Title>
            <Typography.Text type="secondary">登录你的差旅管家账户</Typography.Text>
          </div>
          <Form layout="vertical" onFinish={onFinish} size="large" initialValues={{ username: 'Pear', password: 'Wzw19223' }}>
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined />} placeholder="用户名" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ borderRadius: 8, height: 44, background: '#D4786E', borderColor: '#D4786E' }}>
                登录
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  )
}
