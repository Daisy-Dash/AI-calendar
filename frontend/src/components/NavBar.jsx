import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { notificationAPI } from '../utils/api'

const navItems = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/tasks', label: '任务', icon: '📋' },
  { path: '/ai-chat', label: 'AI', icon: '🤖' },
  { path: '/groups', label: '团队', icon: '👥' },
  { path: '/profile', label: '我的', icon: '👤' },
]

export default function NavBar() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnreadCount()
    // 每30秒刷新一次
    const timer = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(timer)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationAPI.unreadCount()
      setUnreadCount(res.data.count)
    } catch (err) {
      // 静默失败
    }
  }

  return (
    <nav className="bottom-nav">
      <div className="flex justify-around items-center">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-3 rounded-lg transition-all duration-200 relative ${
                isActive
                  ? 'text-warm-500 scale-105'
                  : 'text-gray-400 hover:text-warm-400'
              }`
            }
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
            {/* 通知红点 - 只在"我的"标签上显示 */}
            {item.path === '/profile' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-0.5 font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
