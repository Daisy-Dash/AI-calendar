import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { taskAPI } from '../utils/api'
import { formatDate, getPriorityColor } from '../utils/helpers'

export default function TaskListPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all')
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', deadline: '', start_time: '', end_time: '', priority: 1, description: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadTasks() }, [filter])

  const loadTasks = async () => {
    try {
      const params = filter === 'all' ? {} : { status_filter: filter === '待办' ? '待办' : filter === '进行中' ? '进行中' : '已完成' }
      const res = await taskAPI.list(params)
      setTasks(res.data)
    } catch (err) { console.error(err) }
  }

  const createTask = async (e) => {
    e.preventDefault()
    if (!newTask.title.trim()) return
    setLoading(true)
    try {
      await taskAPI.create(newTask)
      setShowNewTask(false)
      setNewTask({ title: '', deadline: '', start_time: '', end_time: '', priority: 1, description: '' })
      loadTasks()
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const deleteTask = async (id) => {
    if (!confirm('确定删除此任务？')) return
    try {
      await taskAPI.delete(id)
      loadTasks()
    } catch (err) { console.error(err) }
  }

  const updateProgress = async (id, progress) => {
    try {
      await taskAPI.updateProgress(id, progress)
      loadTasks()
    } catch (err) { console.error(err) }
  }

  const filters = ['全部', '待办', '进行中', '已完成']
  const filterMap = { '全部': 'all', '待办': '待办', '进行中': '进行中', '已完成': '已完成' }

  return (
    <div className="px-4 pt-6 pb-24">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-hand text-warm-700">📋 任务列表</h1>
        <button onClick={() => setShowNewTask(true)} className="hand-btn text-sm py-2 px-4">
          ➕ 新建
        </button>
      </div>

      {/* 筛选标签 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(filterMap[f])}
            className={`px-4 py-1.5 text-sm rounded-lg whitespace-nowrap transition-all ${
              filter === filterMap[f]
                ? 'bg-warm-500 text-white shadow-md'
                : 'bg-warm-50 text-warm-600 hover:bg-warm-100'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 新建任务弹窗 */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-end justify-center" onClick={() => setShowNewTask(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-app p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-4">📝 新建任务</h3>
            <form onSubmit={createTask} className="space-y-3">
              <input className="hand-input" placeholder="任务标题" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} required />
              <textarea className="hand-input" placeholder="任务描述（可选）" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} rows={2} />
              <div className="flex gap-3">
                <input type="date" className="hand-input flex-1" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} placeholder="截止日期" />
                <select className="hand-input flex-1" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: parseInt(e.target.value)})}>
                  <option value={1}>低优先级</option>
                  <option value={2}>中优先级</option>
                  <option value={3}>高优先级</option>
                  <option value={4}>紧急</option>
                </select>
              </div>
              <p className="text-xs text-gray-400 -mt-1 ml-1">📅 截止日期 (DDL)</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input type="time" className="hand-input" value={newTask.start_time} onChange={e => setNewTask({...newTask, start_time: e.target.value})} />
                  <p className="text-xs text-gray-400 mt-0.5 ml-1">开始时间</p>
                </div>
                <div className="flex-1">
                  <input type="time" className="hand-input" value={newTask.end_time} onChange={e => setNewTask({...newTask, end_time: e.target.value})} />
                  <p className="text-xs text-gray-400 mt-0.5 ml-1">结束时间</p>
                </div>
              </div>
              <button type="submit" className="hand-btn w-full" disabled={loading}>
                {loading ? '创建中...' : '创建任务'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 任务列表 */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="hand-card text-center py-10">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400 text-sm">暂无任务，点击右上角新建</p>
          </div>
        ) : (
          tasks.map((task) => {
            const pc = getPriorityColor(task.priority)
            return (
              <div key={task.id} className="hand-card task-card cursor-pointer"
                onClick={() => navigate(`/tasks/${task.id}`)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-2">
                    <h4 className="font-medium text-gray-800 truncate">{task.title}</h4>
                    {task.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: pc.bg, color: pc.text }}>{pc.label}</span>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <div className="progress-bar flex-1">
                    <div className="progress-fill" style={{ width: `${task.progress}%` }}></div>
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{task.progress}%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {task.deadline && (
                      <span className={`text-xs ${task.status !== '已完成' && new Date(task.deadline) < new Date() ? 'text-red-500' : 'text-warm-500'}`}>
                        📅 {formatDate(task.deadline)}
                      </span>
                    )}
                    {task.tags?.map((tag, i) => <span key={i} className="tag">{tag}</span>)}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => updateProgress(task.id, Math.min(100, task.progress + 10))} className="text-xs text-gray-400 hover:text-warm-500 px-2 py-1">➕</button>
                    <button onClick={() => deleteTask(task.id)} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">🗑️</button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
