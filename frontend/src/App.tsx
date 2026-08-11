import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import PublicLayout from './components/PublicLayout'
import MainLayout from './components/MainLayout'
import LoginPage from './pages/LoginPage'

// 公共页面
import PublicSopPage from './pages/PublicSopPage'
import PublicSopDetailPage from './pages/PublicSopDetailPage'
import PublicChecklistPage from './pages/PublicChecklistPage'
import PublicDocumentLibrary from './pages/PublicDocumentLibrary'

// 管理页面（已有）
import TodayPage from './pages/TodayPage'
import InboxPage from './pages/InboxPage'
import ChecklistPage from './pages/ChecklistPage'
import SopPage from './pages/SopPage'
import SopDetailPage from './pages/SopDetailPage'
import DocumentLibrary from './pages/DocumentLibrary'
import ProfilePage from './pages/ProfilePage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // 临时关闭登录验证 - 开发中
  return <>{children}</>
  // const token = useAuthStore((s) => s.token)
  // if (!token) return <Navigate to="/chalv/login" replace />
  // return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* 公共浏览端 - 无需登录 */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<PublicSopPage />} />
        <Route path="sop" element={<PublicSopPage />} />
        <Route path="sop/:id" element={<PublicSopDetailPage />} />
        <Route path="tasks" element={<Navigate to="/chalv/tasks" replace />} />
        <Route path="checklist" element={<PublicChecklistPage />} />
        <Route path="documents" element={<PublicDocumentLibrary />} />
      </Route>

      {/* 管理后台 - 需登录 */}
      <Route path="/chalv/login" element={<LoginPage />} />
      <Route path="/chalv/*" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/chalv/tasks" replace />} />
        <Route path="tasks" element={<TodayPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="checklist" element={<ChecklistPage />} />
        <Route path="sop" element={<SopPage />} />
        <Route path="sop/:id" element={<SopDetailPage />} />
        <Route path="documents" element={<DocumentLibrary />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}


