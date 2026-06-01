import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { taskAPI } from '../utils/api'
import { formatDate, getDaysUntilDeadline } from '../utils/helpers'

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 })
  const [upcomingDDL, setUpcomingDDL] = useState([])
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('早上好')
    else if (hour < 18) setGreeting('下午好')
    else setGreeting('晚上好')

    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await taskAPI.list()
      const tasks = res.data
      setStats({
        total: tasks.length,
        pending: tasks.filter(t => t.status === '待办').length,
        inProgress: tasks.filter(t => t.status === '进行中').length,
        completed: tasks.filter(t => t.status === '已完成').length,
      })

      const sorted = tasks
        .filter(t => t.deadline && t.status !== '已完成')
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5)
      setUpcomingDDL(sorted)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    }
  }

  const quickActions = [
    { icon: '🤖', label: 'AI帮我规划', path: '/ai-chat', color: 'from-warm-400 to-warm-500' },
    { icon: '➕', label: '新建任务', path: '/tasks', color: 'from-green-400 to-green-500' },
    { icon: '📅', label: '查看日历', path: '/calendar', color: 'from-blue-400 to-blue-500' },
    { icon: '📊', label: '进度统计', path: '/stats', color: 'from-purple-400 to-purple-500' },
  ]

  // 计算今天已完成百分比
  const todayProgress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return (
    <div className="px-4 pt-6 pb-24">
      {/* 欢迎区域 */}
      <div className="hand-card mb-6 bg-gradient-to-r from-warm-50 to-orange-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-hand text-warm-700 mb-1">
              {greeting}，{user?.username || '朋友'} ✨
            </h2>
            <p className="text-sm text-warm-500">今天也要元气满满哦！</p>
          </div>
          <div className="text-4xl">☀️</div>
        </div>
      </div>

      {/* 今日概览 */}
      <div className="hand-card mb-6">
        <h3 className="text-base font-medium text-gray-700 mb-3">📊 今日概览</h3>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: '全部', value: stats.total, color: 'text-warm-500' },
            { label: '待办', value: stats.pending, color: 'text-red-500' },
            { label: '进行中', value: stats.inProgress, color: 'text-blue-500' },
            { label: '已完成', value: stats.completed, color: 'text-green-500' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-xs text-gray-400">{item.label}</div>
            </div>
          ))}
        </div>

        {/* 进度条 */}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${todayProgress}%` }}></div>
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">今日完成 {todayProgress}%</p>
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className={`hand-card p-4 flex items-center gap-3 bg-gradient-to-r ${action.color} text-white border-none`}
          >
            <span className="text-2xl">{action.icon}</span>
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* 即将截止 */}
      <div className="hand-card">
        <h3 className="text-base font-medium text-gray-700 mb-3">⏰ 即将截止</h3>
        {upcomingDDL.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-sm">暂无即将截止的任务</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingDDL.map((task) => {
              const days = getDaysUntilDeadline(task.deadline)
              const isUrgent = days !== null && days <= 3
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-warm-50 cursor-pointer hover:bg-warm-100 transition-all"
                  onClick={() => navigate('/tasks')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isUrgent ? 'bg-red-500' : 'bg-warm-400'}`}></span>
                    <span className="text-sm truncate">{task.title}</span>
                  </div>
                  <span className={`text-xs flex-shrink-0 ml-2 ${isUrgent ? 'text-red-500 font-medium' : 'text-warm-500'}`}>
                    {formatDate(task.deadline)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
