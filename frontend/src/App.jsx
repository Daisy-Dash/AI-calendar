import React from 'react'
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
import AIChatPage from './pages/AIChatPage'
import GroupManagePage from './pages/GroupManagePage'
import StatsPage from './pages/StatsPage'
import FriendsPage from './pages/FriendsPage'
import CreateGroupPage from './pages/CreateGroupPage'
import GroupChatPage from './pages/GroupChatPage'
import InvitationPopup from './components/InvitationPopup'

class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('App crash:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding:'40px',fontFamily:'monospace',color:'#B37474',background:'#FAF6F1',minHeight:'100vh'}}>
          <h2>Something went wrong</h2>
          <pre style={{whiteSpace:'pre-wrap',fontSize:'14px',marginTop:'12px',background:'white',padding:'16px',borderRadius:'12px',border:'1px solid #E8DDD2'}}>
            {this.state.error.message}{'\n\n'}{this.state.error.stack}
          </pre>
          <button onClick={() => { this.setState({ error: null }); window.location.href = '/login' }}
            style={{marginTop:'16px',padding:'10px 24px',background:'#D4A5A5',color:'white',border:'none',borderRadius:'999px',cursor:'pointer'}}>
            Back to Login
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

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
  const { user } = useAuth()
  const location = useLocation()
  const hideNav = ['/login', '/register'].includes(location.pathname)

  return (
    <AppErrorBoundary>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />
          <Route path="/" element={<RequireAuth><ProjectListPage /></RequireAuth>} />
          <Route path="/skills" element={<RequireAuth><SkillProfilePage /></RequireAuth>} />
          <Route path="/discussion/:projectId" element={<RequireAuth><DiscussionPage /></RequireAuth>} />
          <Route path="/authorize/:projectId" element={<RequireAuth><AuthorizePage /></RequireAuth>} />
          <Route path="/kanban/:projectId" element={<RequireAuth><KanbanPage /></RequireAuth>} />
          <Route path="/task/:projectId/:taskId" element={<RequireAuth><TaskDetailPage /></RequireAuth>} />
          <Route path="/ai-chat" element={<RequireAuth><AIChatPage /></RequireAuth>} />
          <Route path="/friends" element={<RequireAuth><FriendsPage /></RequireAuth>} />
          <Route path="/create-group" element={<RequireAuth><CreateGroupPage /></RequireAuth>} />
          <Route path="/group-chat/:groupId" element={<RequireAuth><GroupChatPage /></RequireAuth>} />
          <Route path="/groups/manage" element={<RequireAuth><GroupManagePage /></RequireAuth>} />
          <Route path="/stats" element={<RequireAuth><StatsPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        {user && <InvitationPopup />}
        {!hideNav && <NavBar />}
      </div>
    </AppErrorBoundary>
  )
}
