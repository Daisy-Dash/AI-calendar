import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { userAPI } from '../utils/api'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })
  const [loaded, setLoaded] = useState(false)

  // 初始化：从后端加载设置或使用本地缓存
  useEffect(() => {
    if (!user) {
      // 未登录时使用本地偏好
      applyTheme(localStorage.getItem('theme') || 'light')
      setLoaded(true)
      return
    }

    // 登录后从后端加载
    userAPI.getSettings()
      .then(res => {
        const serverTheme = res.data.theme || 'light'
        setTheme(serverTheme)
        applyTheme(serverTheme)
      })
      .catch(() => {
        // 后端不可用时使用本地
        const local = localStorage.getItem('theme') || 'light'
        applyTheme(local)
      })
      .finally(() => setLoaded(true))
  }, [user])

  const applyTheme = (t) => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (t === 'system') {
      // 跟随系统
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const changeTheme = async (newTheme) => {
    setTheme(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('theme', newTheme)

    // 已登录则同步到后端
    if (user) {
      try {
        await userAPI.updateSettings({ theme: newTheme })
      } catch (err) {
        console.error('Failed to sync theme:', err)
      }
    }
  }

  // 监听系统主题变化
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  if (!loaded) return null

  return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
