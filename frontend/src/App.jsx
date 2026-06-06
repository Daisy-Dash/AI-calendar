import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import NavBar from './components/NavBar'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProjectListPage from './pages/ProjectListPage'
import SkillProfilePage from './pages/SkillProfilePage'
import DiscussionPage from './pages/DiscussionPage'
import AuthorizePage from './pages/AuthorizePage'
import KanbanPage from './pages/KanbanPage'
import TaskDetailPage from './pages/TaskDetailPage'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-float">🧁</div>
          <div className="w-8 h-8 mx-auto border-3 border-cream-300 border-t-rosa-300 rounded-full animate-spin" />
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const location = useLocation()
  const hideNav = ['/login', '/register'].includes(location.pathname)

  return (
    <div className="app-container">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<RequireAuth><ProjectListPage /></RequireAuth>} />
        <Route path="/skills" element={<RequireAuth><SkillProfilePage /></RequireAuth>} />
        <Route path="/discussion/:projectId" element={<RequireAuth><DiscussionPage /></RequireAuth>} />
        <Route path="/authorize/:projectId" element={<RequireAuth><AuthorizePage /></RequireAuth>} />
        <Route path="/kanban/:projectId" element={<RequireAuth><KanbanPage /></RequireAuth>} />
        <Route path="/task/:projectId/:taskId" element={<RequireAuth><TaskDetailPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {!hideNav && <NavBar />}
    </div>
  )
}
