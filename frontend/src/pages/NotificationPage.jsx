import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationAPI } from '../utils/api'

const typeFilters = [
  { key: 'all', label: '全部', icon: '🔔' },
  { key: 'ddl', label: 'DDL', icon: '⏰' },
  { key: 'group', label: '团队', icon: '👥' },
  { key: 'ai', label: 'AI', icon: '🤖' },
  { key: 'task', label: '任务', icon: '📋' },
  { key: 'system', label: '系统', icon: '⚙️' },
]

const typeConfig = {
  ddl: { icon: '⏰', label: 'DDL提醒', bg: 'bg-red-50', text: 'text-red-500' },
  ai: { icon: '🤖', label: 'AI建议', bg: 'bg-purple-50', text: 'text-purple-500' },
  group: { icon: '👥', label: '团队', bg: 'bg-blue-50', text: 'text-blue-500' },
  progress: { icon: '📊', label: '进度', bg: 'bg-green-50', text: 'text-green-500' },
  task: { icon: '📋', label: '任务', bg: 'bg-warm-50', text: 'text-warm-500' },
  system: { icon: '🔔', label: '系统', bg: 'bg-gray-50', text: 'text-gray-500' },
}

export default function NotificationPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadNotifications() }, [])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const res = await notificationAPI.list()
      setNotifications(res.data)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
    setLoading(false)
  }

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) { console.error(err) }
  }

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) { console.error(err) }
  }

  const handleNotificationClick = async (n) => {
    // 标记已读
    if (!n.is_read) await markAsRead(n.id)

    // 根据类型跳转
    if (n.related_task_id) {
      navigate(`/tasks`)
    } else if (n.related_group_id) {
      navigate(`/groups/manage?groupId=${n.related_group_id}`)
    } else if (n.type === 'group') {
      navigate('/groups')
    } else if (n.type === 'ai') {
      navigate('/ai-chat')
    } else if (n.type === 'ddl') {
      navigate('/ddl')
    }
  }

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter)

  const unreadCount = notifications.filter(n => !n.is_read).length
  const filterCounts = {}
  typeFilters.forEach(f => {
    filterCounts[f.key] = f.key === 'all'
      ? notifications.length
      : notifications.filter(n => n.type === f.key).length
  })

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    const m = Math.floor(diff / 60000)
    const h = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (m < 1) return '刚刚'
    if (m < 60) return `${m}分钟前`
    if (h < 24) return `${h}小时前`
    if (days < 7) return `${days}天前`
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <div className="px-4 pt-6 pb-24">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-hand text-warm-700">🔔 通知</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-warm-500 hover:text-warm-600 font-medium">
            全部已读
          </button>
        )}
      </div>

      {/* 分类筛选标签 */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {typeFilters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-all ${
              filter === f.key
                ? 'bg-warm-500 text-white shadow-md'
                : 'bg-warm-50 text-warm-600 hover:bg-warm-100'
            }`}
          >
            <span>{f.icon}</span>
            <span>{f.label}</span>
            {filterCounts[f.key] > 0 && (
              <span className={`ml-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] ${
                filter === f.key ? 'bg-white/30' : 'bg-warm-200'
              }`}>
                {filterCounts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 通知列表 */}
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block w-8 h-8 border-2 border-warm-300 border-t-warm-500 rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="hand-card text-center py-12">
          <div className="text-4xl mb-3">
            {filter === 'all' ? '🔕' : typeConfig[filter]?.icon || '📭'}
          </div>
          <p className="text-gray-400 text-sm">
            {filter === 'all' ? '暂无通知' : `暂无${typeConfig[filter]?.label || ''}通知`}
          </p>
          <p className="text-xs text-gray-300 mt-1">
            当有新任务、DDL提醒或团队动态时会在这里显示
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const config = typeConfig[n.type] || typeConfig.system
            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`hand-card flex items-start gap-3 cursor-pointer transition-all hover:shadow-hand active:scale-[0.98] ${
                  !n.is_read ? 'bg-warm-50/50 border-warm-200' : ''
                }`}
              >
                <div className={`text-lg flex-shrink-0 mt-0.5 w-9 h-9 rounded-full ${config.bg} flex items-center justify-center`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className={`text-sm truncate ${!n.is_read ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                        {n.title}
                      </h4>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${config.bg} ${config.text} flex-shrink-0`}>
                        {config.label}
                      </span>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse"></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-300">{formatTime(n.created_at)}</span>
                    {(n.related_task_id || n.related_group_id) && (
                      <span className="text-xs text-warm-400">查看详情 ›</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
