import { Card, Empty } from 'antd'

export default function InboxPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card title={<h2 style={{ margin: 0, fontSize: 20 }}>收集箱</h2>}>
        <Empty description="暂无临时记录" />
      </Card>
    </div>
  )
}
