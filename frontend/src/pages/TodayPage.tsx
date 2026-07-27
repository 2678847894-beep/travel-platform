import { Card, Empty } from 'antd'

export default function TodayPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card title={<h2 style={{ margin: 0, fontSize: 20 }}>今天</h2>}>
        <Empty description="暂无待处理任务，去「每日任务」添加吧" />
      </Card>
    </div>
  )
}
