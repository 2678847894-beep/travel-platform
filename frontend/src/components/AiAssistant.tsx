import { useState } from 'react'
import { Button, Input, Tag, Divider } from 'antd'
import { CloseOutlined, SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons'
import { aiAsk } from '../services/api'

interface Message {
  role: 'user' | 'ai'
  content: string
}

const PRESET_QUESTIONS = [
  { label: '🧠 智能问答', question: '香港四季酒店入住流程是什么？' },
  { label: '📋 清单生成', question: '帮我生成日本东京3天差旅物品清单' },
  { label: '📅 SOP推送', question: '今天有哪些待办的SOP步骤？' },
  { label: '🚨 紧急处理', question: '护照丢失了怎么办？' },
  { label: '🌤️ 当地信息', question: '香港今天的天气和交通情况' },
]

export default function AiAssistant({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: '你好！我是差旅AI小助手，可以帮你：\n• 查询差旅SOP步骤\n• 生成出行物品清单\n• 推送待办任务\n• 处理紧急情况\n\n请选择下方快捷入口或直接提问 👇' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (text?: string) => {
    const question = text || input
    if (!question.trim()) return
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setInput('')
    setLoading(true)
    try {
      const res = await aiAsk(question)
      setMessages((prev) => [...prev, { role: 'ai', content: res.data.answer }])
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', content: '抱歉，AI助手暂时无法响应，请稍后重试。' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ai-panel">
      {/* 头部 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RobotOutlined style={{ fontSize: 20 }} />
          <span style={{ fontWeight: 600 }}>AI差旅助手</span>
        </div>
        <CloseOutlined onClick={onClose} style={{ cursor: 'pointer', fontSize: 16 }} />
      </div>

      {/* 快捷入口 */}
      <div style={{ padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid #f1f5f9' }}>
        {PRESET_QUESTIONS.map((q) => (
          <Tag
            key={q.label}
            style={{ cursor: 'pointer', padding: '2px 8px', borderRadius: 12 }}
            color="blue"
            onClick={() => handleSend(q.question)}
          >
            {q.label}
          </Tag>
        ))}
      </div>

      {/* 聊天区 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: msg.role === 'ai' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#10b981',
              color: '#fff', flexShrink: 0, fontSize: 14,
            }}>
              {msg.role === 'ai' ? <RobotOutlined /> : <UserOutlined />}
            </div>
            <div style={{
              maxWidth: '75%', padding: '8px 14px', borderRadius: 12,
              background: msg.role === 'ai' ? '#f1f5f9' : '#3b82f6',
              color: msg.role === 'ai' ? '#1e293b' : '#fff',
              fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>AI正在思考中...</div>
        )}
      </div>

      {/* 输入框 */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={() => handleSend()}
          placeholder="输入你的差旅问题..."
          style={{ borderRadius: 20 }}
        />
        <Button type="primary" shape="circle" icon={<SendOutlined />} onClick={() => handleSend()} loading={loading} />
      </div>
    </div>
  )
}
