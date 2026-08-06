import { useState } from 'react'
import { Input, Button, message, Divider, Card } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import {
  ANIMAL_AVATARS,
  getAnimalAvatar,
  setAnimalAvatar,
  getSelectedAnimalIndex,
} from '../utils/avatar'

export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [saving, setSaving] = useState(false)

  // 密码修改
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPwd, setChangingPwd] = useState(false)

  // 小动物选择
  const [selectedAnimalIdx, setSelectedAnimalIdx] = useState(getSelectedAnimalIndex)

  if (!user) return null

  const animal = getAnimalAvatar(user.id)
  const effectiveAnimal = selectedAnimalIdx >= 0 ? ANIMAL_AVATARS[selectedAnimalIdx] : animal

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      message.warning('显示名称不能为空')
      return
    }
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: displayName.trim() }),
      })
      if (res.ok) {
        const updatedUser = { ...user, display_name: displayName.trim() }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        useAuthStore.setState({ user: updatedUser })
        message.success('资料已更新')
      } else {
        message.error('更新失败，请重试')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      message.warning('请填写所有密码字段')
      return
    }
    if (newPassword !== confirmPassword) {
      message.warning('两次新密码不一致')
      return
    }
    if (newPassword.length < 6) {
      message.warning('新密码至少6位')
      return
    }
    setChangingPwd(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      })
      if (res.ok) {
        message.success('密码已修改，请重新登录')
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => { logout() }, 1500)
      } else {
        const data = await res.json()
        message.error(data.detail || '修改失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setChangingPwd(false)
    }
  }

  const handleSelectAnimal = (index: number) => {
    setSelectedAnimalIdx(index)
    setAnimalAvatar(index)
    message.success(`已切换为 ${ANIMAL_AVATARS[index].name}`)
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ marginBottom: 24, color: '#1e293b' }}>个人资料</h2>

      {/* Card1: 个人头像 */}
      <Card title="个人头像" style={{ marginBottom: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: effectiveAnimal.bg,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
            }}
          >
            {effectiveAnimal.emoji}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 8, color: '#64748b', fontSize: 13 }}>
          选择你的小动物
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
            gap: 12,
            maxWidth: 400,
            margin: '0 auto',
          }}
        >
          {ANIMAL_AVATARS.map((a, i) => (
            <div
              key={i}
              onClick={() => handleSelectAnimal(i)}
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: a.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                cursor: 'pointer',
                margin: '0 auto',
                border:
                  (selectedAnimalIdx >= 0
                    ? selectedAnimalIdx
                    : user.id % ANIMAL_AVATARS.length) === i
                    ? '3px solid #4C7B3B'
                    : '3px solid transparent',
                transition: 'border-color 0.2s',
              }}
            >
              {a.emoji}
            </div>
          ))}
        </div>
      </Card>

      {/* Card2: 基本信息 */}
      <Card title="基本信息" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 6, color: '#475569', fontSize: 13 }}>显示名称</div>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="输入显示名称"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 6, color: '#475569', fontSize: 13 }}>账号</div>
          <Input value={user.username} disabled />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 6, color: '#475569', fontSize: 13 }}>角色</div>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 12px',
              borderRadius: 4,
              background: user.role === 'admin' ? '#e6f7e6' : '#f0f0f0',
              color: user.role === 'admin' ? '#4C7B3B' : '#666',
              fontSize: 13,
            }}
          >
            {user.role === 'admin' ? '管理员' : '员工'}
          </span>
        </div>
        <Button type="primary" loading={saving} onClick={handleSaveProfile}>
          保存更改
        </Button>
      </Card>

      {/* Card3: 修改密码 */}
      <Card title={<><LockOutlined /> 修改密码</>} style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Input.Password
            placeholder="旧密码"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Input.Password
            placeholder="新密码（至少6位）"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <Input.Password
            placeholder="确认新密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button loading={changingPwd} onClick={handleChangePassword}>
          修改密码
        </Button>
      </Card>
    </div>
  )
}
