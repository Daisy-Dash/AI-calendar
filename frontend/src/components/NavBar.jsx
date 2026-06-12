import { NavLink, useLocation } from 'react-router-dom'

export default function NavBar() {
  const location = useLocation()
  const hideNavPaths = ['/discussion/', '/authorize/', '/group-chat/', '/task-chat/']
  const shouldHide = hideNavPaths.some(p => location.pathname.startsWith(p))
    || /^\/ai-chat\/\d+/.test(location.pathname)

  if (shouldHide) return null

  const navItems = [
    { path: '/', label: '首页', icon: '🧁' },
    { path: '/friends', label: '好友', icon: '🍬' },
    { path: '/ai-chat', label: 'AI', icon: '🤖' },
    { path: '/skills', label: '我的', icon: '🍪' },
  ]

  return (
    <nav className="bottom-nav">
      <div className="flex justify-around items-center">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-200 ${
                isActive ? 'text-rosa-400 scale-105' : 'text-choco-200 hover:text-rosa-300'
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
