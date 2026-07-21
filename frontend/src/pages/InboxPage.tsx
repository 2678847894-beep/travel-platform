import { Card, List, Tag } from 'antd'
import { InboxOutlined } from '@ant-design/icons'

export default function InboxPage() {
  const items = [
    { title: '香港四季酒店确认邮件', time: '10分钟前', type: '邮件' },
    { title: '差旅预算调整备忘', time: '1小时前', type: '备忘' },
    { title: '新供应商联系方式', time: '3小时前', type: '联系人' },
    { title: '机场接送时间变更', time: '昨天', type: '提醒' },
    { title: '直播设备采购清单草稿', time: '昨天', type: '草稿' },
  ]

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card title={<h2 style={{ margin: 0, fontSize: 20 }}>📥 收集箱 - 临时记录 5 条</h2>}>
        <List
          dataSource={items}
          renderItem={(item) => (
            <List.Item style={{ padding: '12px 0', cursor: 'pointer' }}>
              <List.Item.Meta
                avatar={<InboxOutlined style={{ color: '#3b82f6', fontSize: 18 }} />}
                title={item.title}
                description={
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Tag>{item.type}</Tag>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>{item.time}</span>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
