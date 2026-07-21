import { Card, Tag, List } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'

export default function TodayPage() {
  const pendingItems = [
    { title: '确认香港酒店预订', time: '今天', priority: 'high', status: 'pending' },
    { title: '整理出境证件材料', time: '今天', priority: 'high', status: 'pending' },
    { title: '检查直播设备电池', time: '今天', priority: 'medium', status: 'pending' },
    { title: '提交差旅报销申请', time: '明天截止', priority: 'high', status: 'pending' },
    { title: '确认日本行程SOP', time: '本周', priority: 'medium', status: 'pending' },
  ]

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card title={<h2 style={{ margin: 0, fontSize: 20 }}>📋 今天 - 待处理 12 项</h2>}>
        <List
          dataSource={pendingItems}
          renderItem={(item) => (
            <List.Item
              style={{ padding: '12px 0', cursor: 'pointer' }}
              actions={[
                <Tag color={item.priority === 'high' ? 'red' : 'orange'}>{item.priority === 'high' ? '高优' : '中优'}</Tag>,
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{item.time}</span>,
              ]}
            >
              <List.Item.Meta
                avatar={<ClockCircleOutlined style={{ color: '#f59e0b', fontSize: 18 }} />}
                title={item.title}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
