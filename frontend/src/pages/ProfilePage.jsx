import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { icon: '🔔', label: '通知', path: '/notifications', count: 3 },
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
          <div className="w-16 h-16 rounded-full bg-warm-200 flex items-center justify-center text-2xl text-warm-600 font-bold">
            {user?.username?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-hand text-warm-700">{user?.username || '用户'}</h2>
            <p className="text-sm text-gray-400">{user?.email || ''}</p>
            <p className="text-xs text-warm-300 mt-1">✏️ 点击编辑资料</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: '任务总数', value: '12', icon: '📋' },
          { label: '已完成', value: '5', icon: '✅' },
          { label: '连续打卡', value: '7天', icon: '🔥' },
        ].map((item) => (
          <div key={item.label} className="hand-card text-center py-4">
            <div className="text-lg mb-1">{item.icon}</div>
            <div className="text-lg font-bold text-warm-500">{item.value}</div>
            <div className="text-xs text-gray-400">{item.label}</div>
          </div>
        ))}
      </div>

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
              {item.count && (
                <span className="bg-warm-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {item.count}
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
