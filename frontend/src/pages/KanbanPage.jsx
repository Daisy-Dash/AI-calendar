import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProject, updateTask, deleteTask } from '../utils/store'

const lanes = [
  { key: 'unclaimed', label: '待认领', color: 'text-rosa-400', accent: 'bg-rosa-300' },
  { key: 'in_progress', label: '进行中', color: 'text-dusty-400', accent: 'bg-dusty-300' },
  { key: 'completed', label: '已完成', color: 'text-sage-400', accent: 'bg-sage-300' },
]

const difficultyLabels = ['', '入门', '简单', '中等', '较难', '困难']
const difficultyColors = [
  '',
  'bg-sage-50 text-sage-500',
  'bg-sage-50 text-sage-400',
  'bg-caramel-50 text-caramel-400',
  'bg-rosa-50 text-rosa-400',
  'bg-rosa-100 text-rosa-500',
]

export default function KanbanPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [activeLane, setActiveLane] = useState('unclaimed')
  const [swipedTaskId, setSwipedTaskId] = useState(null)
  const [longPressTask, setLongPressTask] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [animateIn, setAnimateIn] = useState(true)
  const touchStartX = useRef(0)
  const longPressTimer = useRef(null)

  useEffect(() => {
    const p = getProject(projectId)
    if (!p) { navigate('/'); return }
    setProject(p)
    setTimeout(() => setAnimateIn(false), 1500)
  }, [projectId])

  const refreshProject = () => {
    setProject(getProject(projectId))
  }

  const tasksInLane = (lane) => {
    return (project?.tasks || []).filter(t => t.status === lane)
  }

  const handleTouchStart = (e, taskId) => {
    touchStartX.current = e.touches[0].clientX
    longPressTimer.current = setTimeout(() => {
      const task = project.tasks.find(t => t.id === taskId)
      if (task) {
        setLongPressTask(task)
        setEditTitle(task.title)
      }
    }, 500)
  }

  const handleTouchMove = (e, taskId) => {
    clearTimeout(longPressTimer.current)
    const diff = touchStartX.current - e.touches[0].clientX
    if (diff > 60) setSwipedTaskId(taskId)
    else if (diff < -30) setSwipedTaskId(null)
  }

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current)
  }

  const handleDeleteTask = (taskId) => {
    deleteTask(projectId, taskId)
    setSwipedTaskId(null)
    refreshProject()
  }

  const handleSaveEdit = () => {
    if (longPressTask && editTitle.trim()) {
      updateTask(projectId, longPressTask.id, { title: editTitle.trim() })
      setLongPressTask(null)
      refreshProject()
    }
  }

  if (!project) return null

  const emptyIcons = { unclaimed: '🧁', in_progress: '🍵', completed: '🎉' }
  const emptyText = { unclaimed: '暂无待认领的任务', in_progress: '暂无进行中的任务', completed: '暂无已完成的任务' }

  return (
    <div className="flex flex-col h-screen max-h-screen">
      <div className="flex items-center justify-between px-4 py-3 border-b-[1.5px] border-cream-300 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-rosa-400 text-lg">←</button>
          <div>
            <h1 className="text-base font-medium text-choco-600">{project.name}</h1>
            <p className="text-xs text-choco-200">{project.tasks?.length || 0} 个任务</p>
          </div>
        </div>
        <span className="text-lg">🍰</span>
      </div>

      <div className="flex border-b-[1.5px] border-cream-200 bg-white">
        {lanes.map(lane => {
          const count = tasksInLane(lane.key).length
          const isActive = activeLane === lane.key
          return (
            <button
              key={lane.key}
              onClick={() => setActiveLane(lane.key)}
              className={`flex-1 py-3 text-center text-sm font-medium transition-all relative ${
                isActive ? lane.color : 'text-choco-200'
              }`}
            >
              {lane.label}({count})
              {isActive && (
                <div className={`absolute bottom-0 left-1/4 right-1/4 h-[3px] rounded-full ${lane.accent}`} />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tasksInLane(activeLane).length === 0 ? (
          <div className="text-center py-12 text-choco-200">
            <div className="text-4xl mb-3">{emptyIcons[activeLane]}</div>
            <p className="text-sm">{emptyText[activeLane]}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasksInLane(activeLane).map((task, index) => {
              const isSwiped = swipedTaskId === task.id
              return (
                <div
                  key={task.id}
                  className={`relative overflow-hidden rounded-2xl ${animateIn ? 'task-bounce-in' : ''}`}
                  style={animateIn ? { animationDelay: `${index * 0.15}s` } : {}}
                >
                  <div
                    className={`hand-card cursor-pointer transition-all duration-200 active:scale-[0.98] ${isSwiped ? '-translate-x-20' : ''}`}
                    onClick={() => !isSwiped && navigate(`/task/${projectId}/${task.id}`)}
                    onTouchStart={(e) => handleTouchStart(e, task.id)}
                    onTouchMove={(e) => handleTouchMove(e, task.id)}
                    onTouchEnd={handleTouchEnd}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${difficultyColors[task.difficulty] || difficultyColors[3]}`}>
                          {difficultyLabels[task.difficulty] || '中等'}
                        </span>
                        {task.skills_required?.slice(0, 2).map((skill, j) => (
                          <span key={j} className="tag text-[10px]">{skill}</span>
                        ))}
                      </div>
                      {task.match_score !== null && task.match_score !== undefined && (
                        <span className={`text-xs font-medium ${task.match_score >= 60 ? 'text-sage-400' : 'text-choco-200'}`}>
                          {task.match_score}%匹配
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-medium text-choco-600 mb-1">{task.title}</h4>
                    <p className="text-xs text-choco-200 line-clamp-2 mb-2">{task.description}</p>

                    <div className="flex items-center justify-between text-xs text-choco-200">
                      <div className="flex items-center gap-2">
                        {task.assigned_to && <span>🍪 {task.assigned_to}</span>}
                        <span>📅 预计{task.estimated_days}天</span>
                      </div>
                      <span className="text-rosa-300">查看详情 →</span>
                    </div>
                  </div>

                  {isSwiped && (
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="absolute right-0 top-0 bottom-0 w-20 bg-rosa-400 text-white flex items-center justify-center text-sm font-medium rounded-r-2xl active:bg-rosa-500"
                    >
                      删除
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {longPressTask && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center px-6" onClick={() => setLongPressTask(null)}>
          <div className="bg-white rounded-3xl w-full max-w-[360px] p-5 fade-in-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-medium text-choco-600 mb-3">编辑任务</h3>
            <input
              className="hand-input text-sm mb-4"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setLongPressTask(null)} className="hand-btn-outline flex-1 text-sm py-2">取消</button>
              <button onClick={handleSaveEdit} className="hand-btn flex-1 text-sm py-2">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
