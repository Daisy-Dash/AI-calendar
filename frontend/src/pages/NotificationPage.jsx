import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const mockNotifications = [
  { id: 1, type: 'ddl', title: '任务即将截止', message: '"完成毕业设计" 还有2天截止', time: '2小时前', read: false },
  { id: 2, type: 'ai', title: 'AI建议', message: '您有3个任务待处理，建议优先完成紧急任务', time: '3小时前', read: false },
  { id: 3, type: 'group', title: '团队邀请', message: '张三邀请您加入"设计组"', time: '昨天', read: false },
  { id: 4, type: 'progress', title: '进度提醒', message: '"数据分析报告" 已完成50%', time: '昨天', read: true },
  { id: 5, type: 'system', title: '系统通知', message: '欢迎使用AI日程协作者！', time: '3天前', read: true },
  { id: 6, type: 'ddl', title: '任务已超期', message: '"提交周报" 已超期2天', time: '5天前', read: true },
]

export default function NotificationPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(mockNotifications)

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const getIcon = (type) => {
    switch (type) {
      case 'ddl': return '⏰'
      case 'ai': return '🤖'
      case 'group': return '👥'
      case 'progress': return '📊'
      case 'system': return '🔔'
      default: return '📌'
    }
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-hand text-warm-700">🔔 通知</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-warm-500 hover:text-warm-600">
            全部已读 ({unreadCount})
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="hand-card text-center py-10">
          <div className="text-4xl mb-3">🔕</div>
          <p className="text-gray-400 text-sm">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`hand-card flex items-start gap-3 cursor-pointer transition-all ${
                !n.read ? 'bg-warm-50/50 border-warm-200' : ''
              }`}
              onClick={() => markAsRead(n.id)}
            >
              <div className="text-lg flex-shrink-0 mt-0.5">{getIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm ${!n.read ? 'font-medium text-gray-800' : 'text-gray-600'}`}>{n.title}</h4>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-warm-500 flex-shrink-0"></span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                <span className="text-xs text-gray-300 mt-1 block">{n.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
