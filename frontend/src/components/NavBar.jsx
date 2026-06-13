import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

export default function NavBar() {
  const location = useLocation()
  const [failedIcons, setFailedIcons] = useState({})
  const hideNavPaths = ['/discussion/', '/authorize/', '/group-chat/', '/task-chat/']
  const shouldHide = hideNavPaths.some(p => location.pathname.startsWith(p))
    || /^\/ai-chat\/\d+/.test(location.pathname)

  if (shouldHide) return null

  const navItems = [
    { path: '/', label: '首页', icon: '/assets/cakie/首页图标_nav-home.png', fallback: '首页' },
    { path: '/friends', label: '好友', icon: '/assets/cakie/好友图标_nav-friends.png', fallback: '好友' },
    { path: '/ai-chat', label: 'AI', icon: '/assets/cakie/AI图标_nav-ai.png', fallback: 'AI' },
    { path: '/skills', label: '我的', icon: '/assets/cakie/我的图标_nav-profile.png', fallback: '我的' },
  ]

  return (
    <nav className="bottom-nav">
      <div className="cakie-nav-tray">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `cakie-nav-item ${isActive ? 'is-active' : ''}`
            }
          >
            <span className="cakie-nav-icon-wrap">
              {failedIcons[item.path] ? (
                <span className="cakie-nav-icon-fallback">{item.fallback}</span>
              ) : (
                <img
                  src={item.icon}
                  alt=""
                  className="cakie-nav-icon"
                  onError={() => setFailedIcons(prev => ({ ...prev, [item.path]: true }))}
                />
              )}
            </span>
            <span className="cakie-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
