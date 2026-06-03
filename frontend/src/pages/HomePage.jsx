import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { taskAPI, scheduleAPI } from '../utils/api'
import { useWebSocket } from '../hooks/useWebSocket'
import { useBrowserNotification } from '../hooks/useBrowserNotification'
import { formatDate, getDaysUntilDeadline } from '../utils/helpers'

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 })
  const [upcomingDDL, setUpcomingDDL] = useState([])
  const [greeting, setGreeting] = useState('')
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickInput, setQuickInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsedResult, setParsedResult] = useState(null)
  const [creating, setCreating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const touchStartY = useRef(0)
  const touchMoveY = useRef(0)
  const pullIndicatorRef = useRef(null)

  const loadData = useCallback(async () => {
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
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load tasks:', err)
    }
  }, [])

  // 初始加载 + 自动刷新
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('早上好')
    else if (hour < 18) setGreeting('下午好')
    else setGreeting('晚上好')

    loadData()

    // 每60秒自动刷新
    const timer = setInterval(() => {
      loadData()
    }, 60000)

    return () => clearInterval(timer)
  }, [loadData])

  // 浏览器推送通知
  const { showNotification } = useBrowserNotification()

  // WebSocket 实时更新 — 收到变更时自动刷新 + 浏览器通知
  useWebSocket({
    onTaskUpdate: (msg) => {
      loadData()
      if (msg.event === 'created') {
        showNotification('新任务', { body: msg.data?.title || '任务已创建' })
      }
    },
    onNotification: (data) => {
      loadData()
      // 浏览器推送通知
      if (data && data.title) {
        showNotification(data.title, {
          body: data.message || '',
          tag: `notif-${data.id || Date.now()}`,
          data: { type: data.type },
        })
      }
    },
  })

  // 下拉刷新处理
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e) => {
    touchMoveY.current = e.touches[0].clientY
    const pullDistance = touchMoveY.current - touchStartY.current
    if (pullDistance > 20 && window.scrollY === 0 && !refreshing) {
      if (pullIndicatorRef.current) {
        const opacity = Math.min(pullDistance / 80, 1)
        pullIndicatorRef.current.style.opacity = opacity
        pullIndicatorRef.current.style.transform = `translateY(${Math.min(pullDistance - 20, 40)}px)`
      }
      if (pullDistance > 80) {
        handleRefresh()
      }
    }
  }

  const handleTouchEnd = () => {
    if (pullIndicatorRef.current) {
      pullIndicatorRef.current.style.opacity = '0'
      pullIndicatorRef.current.style.transform = 'translateY(0)'
    }
  }

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  // 自然语言解析
  const handleQuickParse = async () => {
    if (!quickInput.trim()) return
    setParsing(true)
    setParsedResult(null)
    try {
      const res = await scheduleAPI.parse(quickInput)
      const suggestion = res.data.suggestions?.[0]
      if (suggestion && suggestion.title && res.data.parsed) {
        setParsedResult(suggestion)
      } else {
        // 如果解析不成功，作为任务创建
        setParsedResult({
          title: quickInput,
          date: new Date().toISOString().split('T')[0],
          start_time: '',
          end_time: '',
          note: '',
          color: '#FF9F43',
          isTask: true,
        })
      }
    } catch (err) {
      console.error('Parse failed:', err)
      setParsedResult({
        title: quickInput,
        date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        note: '',
        color: '#FF9F43',
        isTask: true,
      })
    }
    setParsing(false)
  }

  // 确认创建（日程或任务）
  const handleConfirmCreate = async () => {
    if (!parsedResult) return
    setCreating(true)
    try {
      if (parsedResult.isTask) {
        await taskAPI.create({ title: parsedResult.title })
        navigate('/tasks')
      } else {
        await scheduleAPI.create({
          title: parsedResult.title,
          date: parsedResult.date,
          start_time: parsedResult.start_time || undefined,
          end_time: parsedResult.end_time || undefined,
          color: parsedResult.color || '#FF9F43',
          note: parsedResult.note || '',
        })
        navigate('/calendar')
      }
      setShowQuickAdd(false)
      setQuickInput('')
      setParsedResult(null)
    } catch (err) {
      console.error('Create failed:', err)
      alert('创建失败，请重试')
    }
    setCreating(false)
  }

  // 直接作为任务创建
  const handleCreateAsTask = async () => {
    if (!parsedResult) return
    setCreating(true)
    try {
      await taskAPI.create({ title: parsedResult.title })
      setShowQuickAdd(false)
      setQuickInput('')
      setParsedResult(null)
      loadData()
    } catch (err) {
      console.error('Create task failed:', err)
      alert('创建失败，请重试')
    }
    setCreating(false)
  }

  const quickActions = [
    { icon: '🤖', label: 'AI帮我规划', path: '/ai-chat', color: 'from-warm-400 to-warm-500' },
    { icon: '➕', label: '新建任务', path: '/tasks', color: 'from-green-400 to-green-500' },
    { icon: '📅', label: '查看日历', path: '/calendar', color: 'from-blue-400 to-blue-500' },
    { icon: '📊', label: '进度统计', path: '/stats', color: 'from-purple-400 to-purple-500' },
  ]

  const todayProgress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !parsedResult) {
      handleQuickParse()
    }
  }

  return (
    <div
      className="px-4 pt-6 pb-24"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 下拉刷新指示器 */}
      <div
        ref={pullIndicatorRef}
        className="flex justify-center items-center h-0 overflow-visible transition-all duration-200"
        style={{ opacity: 0 }}
      >
        <div className="flex items-center gap-2 text-xs text-warm-400 bg-white px-4 py-1.5 rounded-full shadow-sm">
          {refreshing ? (
            <>
              <span className="inline-block w-3 h-3 border border-warm-400 border-t-transparent rounded-full animate-spin"></span>
              刷新中...
            </>
          ) : (
            '↕ 下拉刷新'
          )}
        </div>
      </div>

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
        {/* 最后更新时间 */}
        {lastUpdated && (
          <div className="text-right mt-2">
            <span className="text-xs text-gray-300">
              🕐 {lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 更新
            </span>
          </div>
        )}
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

      {/* 🆕 悬浮快速添加按钮 */}
      <button
        onClick={() => { setShowQuickAdd(true); setQuickInput(''); setParsedResult(null) }}
        className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-br from-warm-400 to-warm-500 text-white rounded-full shadow-lg shadow-warm-300/40 flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all z-40"
        style={{ maxWidth: '430px', right: 'calc(50% - 215px + 16px)' }}
      >
        ✨
      </button>

      {/* 自然语言快速添加弹窗 */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-end justify-center" onClick={() => setShowQuickAdd(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-app p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">✨ 快速添加</h3>
              <button onClick={() => setShowQuickAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {!parsedResult ? (
              <div>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🤖</span>
                    <span className="text-sm font-medium text-gray-600">AI 智能识别</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    输入你想要做的事情，AI 会自动识别时间、日期并创建日程
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {['明天下午3点开会', '后天交作业', '6月10日聚餐', '今晚8点运动'].map(example => (
                      <button
                        key={example}
                        onClick={() => setQuickInput(example)}
                        className="text-xs px-2.5 py-1.5 bg-white rounded-lg border border-purple-100 text-purple-600 hover:bg-purple-50 transition-all"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="hand-input flex-1 text-sm"
                      placeholder="说说你想做什么..."
                      value={quickInput}
                      onChange={e => setQuickInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                    <button
                      onClick={handleQuickParse}
                      className="hand-btn text-sm py-2 px-4"
                      disabled={parsing || !quickInput.trim()}
                    >
                      {parsing ? '🔍' : '解析'}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-300 text-center">
                  支持自然语言输入，如 &ldquo;明天下午3点开会&rdquo;、&ldquo;6月15日前交报告&rdquo;
                </p>
              </div>
            ) : (
              <div className="fade-in-up">
                <div className="hand-card mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span>✅</span>
                    <span className="text-sm font-medium text-green-700">
                      {parsedResult.isTask ? '识别为任务' : '识别为日程'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-16">标题</span>
                      <span className="text-gray-800 font-medium">{parsedResult.title}</span>
                    </div>
                    {parsedResult.date && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 w-16">日期</span>
                        <span className="text-gray-800">{parsedResult.date}</span>
                      </div>
                    )}
                    {parsedResult.start_time && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 w-16">时间</span>
                        <span className="text-gray-800">
                          {parsedResult.start_time}
                          {parsedResult.end_time ? ` ~ ${parsedResult.end_time}` : ''}
                        </span>
                      </div>
                    )}
                    {parsedResult.note && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 w-16">备注</span>
                        <span className="text-gray-800">{parsedResult.note}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setParsedResult(null); setQuickInput('') }}
                    className="hand-btn-outline flex-1 text-sm"
                  >
                    ↩️ 重新输入
                  </button>
                  {parsedResult.isTask ? (
                    <button onClick={handleCreateAsTask} className="hand-btn flex-1 text-sm" disabled={creating}>
                      {creating ? '创建中...' : '📋 创建任务'}
                    </button>
                  ) : (
                    <button onClick={handleConfirmCreate} className="hand-btn flex-1 text-sm" disabled={creating}>
                      {creating ? '创建中...' : '📅 创建日程'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
