import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { userAPI, notificationAPI } from '../utils/api'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, notifyRes] = await Promise.allSettled([
        userAPI.getStats(),
        notificationAPI.unreadCount(),
      ])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      if (notifyRes.status === 'fulfilled') setUnreadNotifications(notifyRes.value.data.count)
    } catch (err) {
      console.error('Failed to load profile data:', err)
    }
    setLoading(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { icon: '🔔', label: '通知', path: '/notifications', badge: unreadNotifications },
    { icon: '📊', label: '统计', path: '/stats' },
    { icon: '📅', label: 'DDL时间线', path: '/ddl' },
    { icon: '🤖', label: 'AI助手', path: '/ai-chat' },
    { icon: '👥', label: '团队管理', path: '/groups' },
    { icon: '⚙️', label: '设置', path: '/settings' },
  ]

  return (
    <div className="px-4 pt-6 pb-24">
      {/* 用户信息卡片 */}
      <div className="hand-card mb-6 bg-gradient-to-r from-warm-50 to-orange-50">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-warm-200 flex items-center justify-center text-2xl text-warm-600 font-bold shadow-inner">
            {user?.username?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-hand text-warm-700">{user?.username || '用户'}</h2>
            <p className="text-sm text-gray-400">{user?.email || ''}</p>
            {user?.bio && <p className="text-xs text-warm-400 mt-1">{user.bio}</p>}
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="text-gray-300 hover:text-warm-500 text-xl"
            title="编辑资料"
          >
            ✏️
          </button>
        </div>
      </div>

      {/* 统计卡片 - 真实数据 */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="hand-card text-center py-4 animate-pulse">
              <div className="h-8 bg-gray-100 rounded w-8 mx-auto mb-1"></div>
              <div className="h-4 bg-gray-100 rounded w-12 mx-auto"></div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: '任务总数', value: stats.total_tasks, icon: '📋' },
            { label: '已完成', value: stats.completed_tasks, icon: '✅' },
            { label: '连续打卡', value: `${stats.streak_days}天`, icon: '🔥' },
          ].map((item) => (
            <div key={item.label} className="hand-card text-center py-4">
              <div className="text-lg mb-1">{item.icon}</div>
              <div className="text-lg font-bold text-warm-500">{item.value}</div>
              <div className="text-xs text-gray-400">{item.label}</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* 详细统计 */}
      {stats && (
        <div className="hand-card mb-6">
          <h3 className="text-sm font-medium text-gray-600 mb-3">📈 数据概览</h3>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">完成率</span>
              <span className="font-medium text-green-500">{stats.completion_rate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">进行中</span>
              <span className="font-medium text-blue-500">{stats.in_progress_tasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">待办</span>
              <span className="font-medium text-gray-500">{stats.pending_tasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">群组</span>
              <span className="font-medium text-purple-500">{stats.group_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">紧急DDL</span>
              <span className={`font-medium ${stats.urgent_deadline > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                {stats.urgent_deadline}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">已超期</span>
              <span className={`font-medium ${stats.overdue_tasks > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                {stats.overdue_tasks}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 菜单列表 */}
      <div className="hand-card p-0 overflow-hidden mb-6">
        {menuItems.map((item, i) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-all hover:bg-warm-50 ${
              i < menuItems.length - 1 ? 'border-b border-warm-50' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm text-gray-700">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.badge > 0 && (
                <span className="bg-red-500 text-white text-xs min-w-[20px] h-5 rounded-full flex items-center justify-center px-1 font-medium">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              <span className="text-gray-300 text-xs">›</span>
            </div>
          </button>
        ))}
      </div>

      {/* 退出登录 */}
      <button
        onClick={handleLogout}
        className="w-full py-3 text-sm text-red-500 bg-white rounded-xl border-2 border-red-100 hover:bg-red-50 transition-all"
      >
        退出登录
      </button>

      <div className="text-center mt-6">
        <p className="text-xs text-gray-300">AI日程协作者 v1.0.0</p>
      </div>
    </div>
  )
}
