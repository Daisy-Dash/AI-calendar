import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import NavBar from './components/NavBar'
import LoginPage from './pages/LoginPage'
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

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner /></div>
  return user ? children : <Navigate to="/login" />
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-warm-50">
      <div className="w-12 h-12 border-3 border-warm-300 border-t-warm-500 rounded-full animate-spin mb-4"></div>
      <p className="text-warm-600 font-hand text-lg">AI日程协作者</p>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />

  return (
    <div className="app-container">
      <Routes>
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
    </div>
  )
}
