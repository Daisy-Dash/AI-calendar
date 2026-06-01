import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/tasks', label: '任务', icon: '📋' },
  { path: '/ai-chat', label: 'AI', icon: '🤖' },
  { path: '/groups', label: '团队', icon: '👥' },
  { path: '/profile', label: '我的', icon: '👤' },
]

export default function NavBar() {
  return (
    <nav className="bottom-nav">
      <div className="flex justify-around items-center">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'text-warm-500 scale-105'
                  : 'text-gray-400 hover:text-warm-400'
              }`
            }
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
