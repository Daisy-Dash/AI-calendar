import { useState, useEffect } from 'react'
import { taskAPI } from '../utils/api'

export default function DDLPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadTasks() }, [])

  const loadTasks = async () => {
    try {
      const res = await taskAPI.list()
      const withDDL = res.data.filter(t => t.deadline)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      setTasks(withDDL)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const urgentTasks = tasks.filter(t => {
    const ddl = new Date(t.deadline)
    const diff = Math.ceil((ddl - today) / (1000 * 60 * 60 * 24))
    return diff <= 3 && t.status !== '已完成'
  })

  const futureTasks = tasks.filter(t => {
    const ddl = new Date(t.deadline)
    const diff = Math.ceil((ddl - today) / (1000 * 60 * 60 * 24))
    return diff > 3 && t.status !== '已完成'
  })

  const completedDDL = tasks.filter(t => t.status === '已完成')

  const formatDDL = (deadline) => {
    const d = new Date(deadline)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  const getDaysLeft = (deadline) => {
    const ddl = new Date(deadline)
    return Math.ceil((ddl - today) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-hand text-warm-700 mb-4">⏰ DDL时间线</h1>

      {loading ? (
        <div className="text-center py-10 text-gray-400">加载中...</div>
      ) : tasks.length === 0 ? (
        <div className="hand-card text-center py-10">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-400 text-sm">暂无DDL任务</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 紧急DDL */}
          {urgentTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-500 mb-3 flex items-center gap-2">
                <span>🔴</span> 紧急（3天内）
              </h3>
              <div className="space-y-2">
                {urgentTasks.map((task, i) => (
                  <div key={task.id} className="hand-card border-red-200 bg-red-50/30 fade-in-up" style={{animationDelay: `${i * 0.1}s`}}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 text-center">
                        <div className="text-lg font-bold text-red-500">{formatDDL(task.deadline)}</div>
                        <div className="text-xs text-red-400">{getDaysLeft(task.deadline) <= 0 ? '今日' : `${getDaysLeft(task.deadline)}天`}</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-800">{task.title}</h4>
                        <div className="progress-bar mt-1">
                          <div className="progress-fill" style={{width: `${task.progress}%`}}></div>
                        </div>
                      </div>
                      <span className="text-xs text-red-500 font-medium">{task.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 时间线 */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
              <span>📅</span> 全部DDL
            </h3>
            <div className="relative">
              {/* 竖线 */}
              <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-warm-200"></div>

              <div className="space-y-4">
                {futureTasks.concat(completedDDL).map((task, i) => {
                  const daysLeft = getDaysLeft(task.deadline)
                  const isOverdue = daysLeft < 0 && task.status !== '已完成'
                  return (
                    <div key={task.id} className="flex gap-4 fade-in-up" style={{animationDelay: `${i * 0.05}s`}}>
                      {/* 时间点 */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 z-10 ${
                        task.status === '已完成' ? 'bg-green-500' :
                        isOverdue ? 'bg-red-500' : 'bg-warm-400'
                      }`}>
                        <span className="text-white text-xs">
                          {task.status === '已完成' ? '✓' : isOverdue ? '!' : formatDDL(task.deadline).slice(0, 2)}
                        </span>
                      </div>
                      {/* 内容 */}
                      <div className="flex-1 hand-card">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${task.status === '已完成' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {task.title}
                          </h4>
                          <span className={`text-xs ${task.status === '已完成' ? 'text-green-500' : isOverdue ? 'text-red-500' : 'text-warm-500'}`}>
                            {task.status === '已完成' ? '已完成' : isOverdue ? `超期${Math.abs(daysLeft)}天` : `剩余${daysLeft}天`}
                          </span>
                        </div>
                        <div className="progress-bar mt-2">
                          <div className="progress-fill" style={{width: `${task.progress}%`}}></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
