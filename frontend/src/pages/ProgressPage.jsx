import { useState, useEffect } from 'react'
import { taskAPI } from '../utils/api'

export default function ProgressPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadTasks() }, [])

  const loadTasks = async () => {
    try {
      const res = await taskAPI.list()
      setTasks(res.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const updateProgress = async (id, progress) => {
    try {
      await taskAPI.updateProgress(id, progress)
      loadTasks()
    } catch (err) { console.error(err) }
  }

  const totalProgress = tasks.length > 0
    ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)
    : 0

  const completedTasks = tasks.filter(t => t.status === '已完成').length
  const inProgressTasks = tasks.filter(t => t.status === '进行中').length
  const pendingTasks = tasks.filter(t => t.status === '待办').length

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-hand text-warm-700 mb-4">📊 进度追踪</h1>

      {/* 总体进度 */}
      <div className="hand-card mb-4 bg-gradient-to-r from-warm-50 to-orange-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">总体完成进度</h3>
          <span className="text-2xl font-bold text-warm-500">{totalProgress}%</span>
        </div>
        <div className="progress-bar h-3 mb-4">
          <div className="progress-fill" style={{ width: `${totalProgress}%` }}></div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-green-500">{completedTasks}</div>
            <div className="text-xs text-gray-400">已完成</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-500">{inProgressTasks}</div>
            <div className="text-xs text-gray-400">进行中</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-400">{pendingTasks}</div>
            <div className="text-xs text-gray-400">待办</div>
          </div>
        </div>
      </div>

      {/* 各任务进度 */}
      <div className="space-y-3">
        {tasks.length === 0 && !loading && (
          <div className="hand-card text-center py-10">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-gray-400 text-sm">还没有任务，去创建一些吧</p>
          </div>
        )}

        {tasks.map((task) => {
          const isCompleted = task.status === '已完成'
          const daysUntilDeadline = task.deadline
            ? Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24))
            : null

          return (
            <div key={task.id} className="hand-card task-card">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                    isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300'
                  }`}
                    onClick={() => updateProgress(task.id, isCompleted ? 0 : 100)}
                  >
                    {isCompleted && <span className="text-white text-xs">✓</span>}
                  </div>
                  <h4 className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {task.title}
                  </h4>
                </div>
                <span className="text-xs text-gray-400 ml-2">{task.progress}%</span>
              </div>

              <div className="progress-bar mb-1">
                <div className="progress-fill" style={{ width: `${task.progress}%` }}></div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-1">
                  {daysUntilDeadline !== null && (
                    <span className={`text-xs ${daysUntilDeadline <= 0 ? 'text-red-500' : daysUntilDeadline <= 3 ? 'text-warning' : 'text-gray-400'}`}>
                      📅 {daysUntilDeadline <= 0 ? '已超期' : `剩余${daysUntilDeadline}天`}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {[25, 50, 75, 100].map((p) => (
                    <button
                      key={p}
                      onClick={() => updateProgress(task.id, p)}
                      className={`text-xs px-2 py-0.5 rounded ${
                        task.progress >= p ? 'bg-warm-100 text-warm-600' : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* AI建议 */}
      {tasks.length > 0 && (
        <div className="hand-card mt-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🤖</span>
            <h3 className="text-sm font-medium text-gray-600">AI建议</h3>
          </div>
          <p className="text-sm text-gray-500">
            {totalProgress < 30
              ? '整体进度较慢，建议优先完成紧急任务，使用AI分解功能将大任务拆解'
              : totalProgress < 70
              ? '进度正常，继续保持！建议关注即将截止的任务'
              : '进度良好！继续保持完成剩余任务'}
          </p>
        </div>
      )}
    </div>
  )
}
