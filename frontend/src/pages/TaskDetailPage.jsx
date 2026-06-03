import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { taskAPI } from '../utils/api'
import { formatDate, getPriorityColor, getStatusColor } from '../utils/helpers'

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadTask() }, [taskId])

  const loadTask = async () => {
    try {
      const res = await taskAPI.get(taskId)
      setTask(res.data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const updateProgress = async (progress) => {
    try {
      const res = await taskAPI.updateProgress(taskId, progress)
      setTask(res.data)
    } catch (err) { console.error(err) }
  }

  const toggleStatus = async () => {
    const newStatus = task.status === '已完成' ? '待办' : '已完成'
    const newProgress = newStatus === '已完成' ? 100 : 0
    try {
      const res = await taskAPI.update(taskId, { status: newStatus, progress: newProgress })
      setTask(res.data)
    } catch (err) { console.error(err) }
  }

  if (loading) return <div className="flex justify-center items-center min-h-screen">
    <div className="w-8 h-8 border-2 border-warm-300 border-t-warm-500 rounded-full animate-spin"></div>
  </div>

  if (!task) return <div className="text-center py-20 text-gray-400">任务不存在</div>

  const pc = getPriorityColor(task.priority)
  const sc = getStatusColor(task.status)
  const now = new Date()
  const ddl = task.deadline ? new Date(task.deadline) : null
  const daysLeft = ddl ? Math.ceil((ddl - now) / (1000 * 60 * 60 * 24)) : null
  const isOverdue = daysLeft !== null && daysLeft < 0 && task.status !== '已完成'

  return (
    <div className="px-4 pt-6 pb-24">
      <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-warm-500 mb-4">← 返回</button>

      {/* 任务头部 */}
      <div className="hand-card mb-4" style={{ borderLeftColor: pc.text, borderLeftWidth: '4px' }}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 mr-3">
            <h1 className="text-lg font-bold text-gray-800">{task.title}</h1>
            {task.description && <p className="text-sm text-gray-500 mt-2">{task.description}</p>}
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: pc.bg, color: pc.text }}>
            {pc.label}
          </span>
        </div>

        {/* DDL 倒计时 */}
        {ddl && (
          <div className={`mt-3 p-3 rounded-xl ${isOverdue ? 'bg-red-50' : daysLeft <= 3 ? 'bg-orange-50' : 'bg-warm-50'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                📅 截止: {ddl.getMonth()+1}月{ddl.getDate()}日 {ddl.getHours()}:{String(ddl.getMinutes()).padStart(2,'0')}
              </span>
              <span className={`text-sm font-bold ${isOverdue ? 'text-red-500' : daysLeft <= 3 ? 'text-orange-500' : 'text-warm-500'}`}>
                {isOverdue ? `⏰ 超期${Math.abs(daysLeft)}天` : daysLeft === 0 ? '今天截止!' : `剩余${daysLeft}天`}
              </span>
            </div>
          </div>
        )}

        {/* 时间范围 */}
        {(task.start_time || task.end_time) && (
          <div className="mt-2 p-3 rounded-xl bg-blue-50 text-sm text-blue-600">
            ⏱ {task.start_time ? new Date(task.start_time).toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}) : '?'}
            {' ~ '}
            {task.end_time ? new Date(task.end_time).toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}) : '?'}
          </div>
        )}
      </div>

      {/* 进度条 */}
      <div className="hand-card mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">📊 任务进度</h3>
          <span className="text-lg font-bold" style={{ color: pc.text }}>{task.progress}%</span>
        </div>
        <div className="progress-bar h-4 mb-3">
          <div className="progress-fill h-4" style={{ width: `${task.progress}%`, transition: 'width 0.5s ease' }}></div>
        </div>
        <div className="flex gap-2">
          {[0, 25, 50, 75, 100].map(p => (
            <button key={p}
              onClick={() => updateProgress(p)}
              className={`flex-1 py-1.5 text-xs rounded-lg transition-all ${
                task.progress >= p ? 'bg-warm-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >{p}%</button>
          ))}
        </div>
      </div>

      {/* 状态切换 */}
      <div className="hand-card mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer ${
              task.status === '已完成' ? 'bg-green-500 border-green-500' : 'border-gray-300'
            }`} onClick={toggleStatus}>
              {task.status === '已完成' && <span className="text-white text-xs">✓</span>}
            </div>
            <span className="text-sm" style={{ color: sc.text }}>{task.status}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full`} style={{ background: sc.bg, color: sc.text }}>
            {task.status}
          </span>
        </div>
      </div>

      {/* 标签 */}
      {task.tags?.length > 0 && (
        <div className="hand-card mb-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">🏷 标签</h3>
          <div className="flex flex-wrap gap-1.5">
            {task.tags.map((tag, i) => <span key={i} className="tag">{tag}</span>)}
          </div>
        </div>
      )}

      {/* 元信息 */}
      <div className="hand-card text-xs text-gray-400 space-y-1">
        <p>创建时间: {new Date(task.created_at).toLocaleString('zh-CN')}</p>
        {task.estimated_hours && <p>预估工时: {task.estimated_hours} 小时</p>}
        {task.group_id && <p>团队任务 | 群组ID: {task.group_id}</p>}
      </div>
    </div>
  )
}
