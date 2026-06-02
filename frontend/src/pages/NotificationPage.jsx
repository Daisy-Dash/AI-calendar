import { useState, useEffect } from 'react'
import { notificationAPI } from '../utils/api'

const typeConfig = {
  ddl: { icon: '⏰', label: 'DDL提醒', bg: 'bg-red-50', text: 'text-red-500' },
  ai: { icon: '🤖', label: 'AI建议', bg: 'bg-purple-50', text: 'text-purple-500' },
  group: { icon: '👥', label: '团队', bg: 'bg-blue-50', text: 'text-blue-500' },
  progress: { icon: '📊', label: '进度', bg: 'bg-green-50', text: 'text-green-500' },
  task: { icon: '📋', label: '任务', bg: 'bg-warm-50', text: 'text-warm-500' },
  system: { icon: '🔔', label: '系统', bg: 'bg-gray-50', text: 'text-gray-500' },
}

export default function NotificationPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadNotifications() }, [])

  const loadNotifications = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await notificationAPI.list()
      setNotifications(res.data)
    } catch (err) {
      console.error('Failed to load notifications:', err)
      setError('加载通知失败，请检查后端是否启动')
    }
    setLoading(false)
  }

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markRead(id)
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error(err)
    }
  }

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead()
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error(err)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  const getTypeConfig = (type) => typeConfig[type] || typeConfig.system

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-hand text-warm-700">🔔 通知</h1>
          {unreadCount > 0 && (
            <span className="bg-warm-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-warm-500 hover:text-warm-600 font-medium"
          >
            全部已读
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block w-8 h-8 border-2 border-warm-300 border-t-warm-500 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="hand-card text-center py-10">
          <div className="text-4xl mb-3">😞</div>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="hand-card text-center py-10">
          <div className="text-4xl mb-3">🔕</div>
          <p className="text-gray-400 text-sm">暂无通知</p>
          <p className="text-xs text-gray-300 mt-1">当有新任务、DDL提醒或团队动态时会在这里显示</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const config = getTypeConfig(n.type)
            return (
              <div
                key={n.id}
                className={`hand-card flex items-start gap-3 cursor-pointer transition-all ${
                  !n.is_read ? 'bg-warm-50/50 border-warm-200' : ''
                }`}
                onClick={() => !n.is_read && markAsRead(n.id)}
              >
                <div className={`text-lg flex-shrink-0 mt-0.5 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm ${!n.is_read ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                        {n.title}
                      </h4>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-warm-500 flex-shrink-0"></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                  <span className="text-xs text-gray-300 mt-1 block">{formatTime(n.created_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
