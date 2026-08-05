import { useState } from 'react'
import { Modal, Input, Button, message, Divider } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import {
  ANIMAL_AVATARS,
  getAnimalAvatar,
  setAnimalAvatar,
  getSelectedAnimalIndex,
} from '../utils/avatar'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ProfileModal({ open, onClose }: Props) {
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
        setTimeout(() => { onClose(); logout() }, 1500)
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
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={420}
      className="profile-modal"
      closable={false}
    >
      {/* 头部 */}
      <div className="profile-modal-header">
        <span className="profile-modal-title">个人资料</span>
        <span className="profile-modal-close" onClick={onClose}>✕</span>
      </div>

      {/* 头像区 */}
      <div className="profile-avatar-section">
        <div
          className="profile-avatar-circle"
          style={{ background: effectiveAnimal.bg }}
        >
          <span className="profile-avatar-emoji">{effectiveAnimal.emoji}</span>
        </div>
      </div>

      {/* 小动物选择器 */}
      <div className="profile-animal-picker">
        <div className="profile-animal-label">选择你的小动物</div>
        <div className="profile-animal-grid">
          {ANIMAL_AVATARS.map((a, i) => (
            <div
              key={i}
              className={`profile-animal-item ${(selectedAnimalIdx >= 0 ? selectedAnimalIdx : user.id % ANIMAL_AVATARS.length) === i ? 'selected' : ''}`}
              style={{ background: a.bg }}
              onClick={() => handleSelectAnimal(i)}
            >
              <span>{a.emoji}</span>
            </div>
          ))}
        </div>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* 基本信息 */}
      <div className="profile-info-row">
        <span className="profile-info-label">显示名称</span>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="输入显示名称"
          className="profile-input"
        />
      </div>
      <div className="profile-info-row">
        <span className="profile-info-label">账号</span>
        <Input value={user.username} disabled className="profile-input profile-input-disabled" />
      </div>
      <div className="profile-info-row">
        <span className="profile-info-label">角色</span>
        <span className="profile-role-tag">
          {user.role === 'admin' ? '管理员' : '员工'}
        </span>
      </div>

      <Button
        type="primary"
        block
        loading={saving}
        onClick={handleSaveProfile}
        className="profile-save-btn"
      >
        保存更改
      </Button>

      <Divider style={{ margin: '20px 0 16px' }} />

      {/* 修改密码 */}
      <div className="profile-password-section">
        <div className="profile-password-title">
          <LockOutlined /> 修改密码
        </div>
        <Input.Password
          placeholder="旧密码"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className="profile-input"
        />
        <Input.Password
          placeholder="新密码（至少6位）"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="profile-input"
        />
        <Input.Password
          placeholder="确认新密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="profile-input"
        />
        <Button
          block
          loading={changingPwd}
          onClick={handleChangePassword}
          className="profile-password-btn"
        >
          修改密码
        </Button>
      </div>
    </Modal>
  )
}
