import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import NavBar from './components/NavBar'
import LoginPage from './pages/LoginPage'
<<<<<<< HEAD
import RegisterPage from './pages/RegisterPage'
import ProjectListPage from './pages/ProjectListPage'
import SkillProfilePage from './pages/SkillProfilePage'
import DiscussionPage from './pages/DiscussionPage'
import AuthorizePage from './pages/AuthorizePage'
import KanbanPage from './pages/KanbanPage'
import TaskDetailPage from './pages/TaskDetailPage'
=======
import HomePage from './pages/HomePage'
import TaskListPage from './pages/TaskListPage'
import CalendarPage from './pages/CalendarPage'
import AISplitPage from './pages/AISplitPage'
import ProgressPage from './pages/ProgressPage'
import DDLPage from './pages/DDLPage'
import AIChatPage from './pages/AIChatPage'
import GroupPage from './pages/GroupPage'
import SettingsPage from './pages/SettingsPage'
import StatsPage from './pages/StatsPage'
import NotificationPage from './pages/NotificationPage'
import GroupManagePage from './pages/GroupManagePage'
import InvitationPopup from './components/InvitationPopup'
import TaskDetailPage from './pages/TaskDetailPage'
import ProfilePage from './pages/ProfilePage'
>>>>>>> 85652a8d7910558fefa90e8ec9562240eff85d5b

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
<<<<<<< HEAD
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
=======
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
        <Route path="/tasks" element={<PrivateRoute><TaskListPage /></PrivateRoute>} />
        <Route path="/tasks/:taskId" element={<PrivateRoute><TaskDetailPage /></PrivateRoute>} />
        <Route path="/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
        <Route path="/ai-split" element={<PrivateRoute><AISplitPage /></PrivateRoute>} />
        <Route path="/progress" element={<PrivateRoute><ProgressPage /></PrivateRoute>} />
        <Route path="/ddl" element={<PrivateRoute><DDLPage /></PrivateRoute>} />
        <Route path="/ai-chat" element={<PrivateRoute><AIChatPage /></PrivateRoute>} />
        <Route path="/groups" element={<PrivateRoute><GroupPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        <Route path="/stats" element={<PrivateRoute><StatsPage /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><NotificationPage /></PrivateRoute>} />
        <Route path="/groups/manage" element={<PrivateRoute><GroupManagePage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      </Routes>
      {user && <InvitationPopup />}
      {user && <NavBar />}
>>>>>>> 85652a8d7910558fefa90e8ec9562240eff85d5b
    </div>
  )
}
