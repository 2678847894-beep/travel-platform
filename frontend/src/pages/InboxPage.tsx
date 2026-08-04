import { Card, Empty, Grid } from 'antd'

export default function InboxPage() {
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  return (
    <div style={{ maxWidth: isMobile ? '100%' : 800, margin: '0 auto' }}>
      <Card title={<h2 style={{ margin: 0, fontSize: isMobile ? 16 : 20 }}>新增需求确认处</h2>}>
        <Empty description="暂无临时记录" />
      </Card>
    </div>
  )
}
