import { useState, useEffect } from 'react'
<<<<<<< HEAD
import { useNavigate, useParams } from 'react-router-dom'
import { getProject, updateTask, getUserProfile } from '../utils/store'
import { calculateMatchScore } from '../utils/mockAI'

function RadarChart({ scores, size = 180 }) {
  const labels = ['编程', '设计', '文案', '调研', '工具']
  const center = size / 2
  const radius = size / 2 - 30
  const levels = 4
  const colors = ['#D4A5A5', '#B8A9CA', '#A8BFA0', '#9FB5C4', '#C9A87C']

  const angleStep = (2 * Math.PI) / labels.length
  const getPoint = (index, value) => {
    const angle = angleStep * index - Math.PI / 2
    const r = (value / 100) * radius
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) }
  }

  const gridPaths = []
  for (let level = 1; level <= levels; level++) {
    const points = labels.map((_, i) => {
      const p = getPoint(i, (level / levels) * 100)
      return `${p.x},${p.y}`
    })
    gridPaths.push(points.join(' '))
  }

  const dataPoints = scores.map((s, i) => {
    const p = getPoint(i, s)
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridPaths.map((path, i) => (
        <polygon key={i} points={path} fill="none" stroke="#F2E1E1" strokeWidth="1" />
      ))}
      {labels.map((_, i) => {
        const p = getPoint(i, 100)
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#F2E1E1" strokeWidth="1" />
      })}
      <polygon points={dataPoints} fill="rgba(212,165,165,0.2)" stroke="#D4A5A5" strokeWidth="2" />
      {scores.map((s, i) => {
        const p = getPoint(i, s)
        return <circle key={i} cx={p.x} cy={p.y} r="4" fill={colors[i]} />
      })}
      {labels.map((label, i) => {
        const p = getPoint(i, 125)
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#A69485">
            {label}
          </text>
        )
      })}
    </svg>
  )
}

export default function TaskDetailPage() {
  const { projectId, taskId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [task, setTask] = useState(null)
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const p = getProject(projectId)
    if (!p) { navigate('/'); return }
    setProject(p)
    const t = p.tasks.find(t => t.id === taskId)
    if (!t) { navigate(`/kanban/${projectId}`); return }
    const profile = getUserProfile()
    t.match_score = calculateMatchScore(t, profile)
    setTask(t)
    setClaimed(t.status !== 'unclaimed')
  }, [projectId, taskId])

  const handleClaim = async () => {
    setClaiming(true)
    const profile = getUserProfile()
    setTimeout(() => {
      updateTask(projectId, taskId, {
        status: 'in_progress',
        assigned_to: profile?.name || '我',
      })
      setClaiming(false)
      setClaimed(true)
      setShowConfetti(true)
      setTask(prev => ({ ...prev, status: 'in_progress', assigned_to: profile?.name || '我' }))
      setTimeout(() => setShowConfetti(false), 2000)
    }, 800)
  }

  const handleUnclaim = () => {
    updateTask(projectId, taskId, { status: 'unclaimed', assigned_to: null })
    setClaimed(false)
    setTask(prev => ({ ...prev, status: 'unclaimed', assigned_to: null }))
  }

  const handleComplete = () => {
    updateTask(projectId, taskId, { status: 'completed' })
    setTask(prev => ({ ...prev, status: 'completed' }))
  }

  const toggleGuideStep = (index) => {
    const newSteps = [...task.guide_steps]
    newSteps[index] = { ...newSteps[index], done: !newSteps[index].done }
    updateTask(projectId, taskId, { guide_steps: newSteps })
    setTask(prev => ({ ...prev, guide_steps: newSteps }))
  }

  if (!task) return null

  const profile = getUserProfile()
  const radarScores = computeRadarScores(task, profile)
  const matchScore = task.match_score ?? 50
  const guideProgress = task.guide_steps?.length > 0
    ? Math.round(task.guide_steps.filter(s => s.done).length / task.guide_steps.length * 100)
    : 0

  const confettiColors = ['#D4A5A5', '#B8A9CA', '#A8BFA0', '#9FB5C4', '#C9A87C']

  return (
    <div className="px-4 pt-4 pb-24 fade-in-up">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: confettiColors[i % 5],
              }}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(`/kanban/${projectId}`)} className="text-rosa-400 text-lg">←</button>
        <h1 className="text-lg font-medium flex-1 truncate text-choco-600">{task.title}</h1>
        <span className={`text-xs px-2.5 py-1 rounded-full ${
          task.status === 'completed' ? 'bg-sage-50 text-sage-500' :
          task.status === 'in_progress' ? 'bg-dusty-50 text-dusty-400' :
          'bg-rosa-50 text-rosa-400'
        }`}>
          {task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待认领'}
        </span>
      </div>

      <div className="hand-card mb-4">
        <p className="text-sm text-choco-400 leading-relaxed">{task.description}</p>
        <div className="flex items-center gap-3 mt-3 text-xs text-choco-200">
          <span>📅 预计 {task.estimated_days} 天</span>
          <span>🍩 难度 {task.difficulty}/5</span>
          {task.assigned_to && <span>🍪 {task.assigned_to}</span>}
        </div>
        <div className="flex gap-1.5 mt-3">
          {task.skills_required?.map((skill, i) => (
            <span key={i} className="tag text-[10px]">{skill}</span>
          ))}
        </div>
      </div>

      <div className="hand-card mb-4">
        <h3 className="text-sm font-medium text-choco-500 mb-3 text-center">技能匹配度</h3>
        <div className="flex justify-center">
          <RadarChart scores={radarScores} />
        </div>
        <div className="text-center mt-2">
          <span className={`text-2xl font-bold ${matchScore >= 60 ? 'text-sage-400' : matchScore >= 30 ? 'text-caramel-400' : 'text-rosa-400'}`}>
            {matchScore}%
          </span>
          <p className="text-xs text-choco-200 mt-1">
            {matchScore >= 80 ? '非常匹配！这个任务很适合你' :
             matchScore >= 60 ? '匹配度不错，可以挑战一下' :
             matchScore >= 30 ? '有一定难度，但可以学习新技能' :
             '全新领域，AI 会提供详细指南'}
          </p>
        </div>
      </div>

      {task.status === 'unclaimed' && (
        <button
          onClick={handleClaim}
          className={`w-full py-4 text-base font-medium text-white rounded-full shadow-lg transition-all mb-4 ${
            claiming ? 'bg-choco-200' : 'authorize-btn active:scale-95'
          }`}
          disabled={claiming}
        >
          {claiming ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              认领中...
            </span>
          ) : '认领这个任务'}
        </button>
      )}

      {task.status === 'in_progress' && (
        <div className="flex gap-2 mb-4">
          <button onClick={handleUnclaim} className="hand-btn-outline flex-1 text-sm py-3">取消认领</button>
          <button
            onClick={handleComplete}
            className="hand-btn flex-1 text-sm py-3"
            style={{ background: 'linear-gradient(135deg, #A8BFA0, #8AA880)', boxShadow: '0 3px 0 #6F8F66' }}
          >
            标记完成 ✓
          </button>
        </div>
      )}

      {(task.status === 'in_progress' || task.status === 'completed') && task.guide_steps?.length > 0 && (
        <div className="hand-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-choco-500">小白操作指南</h3>
            <span className="text-xs text-rosa-400">{guideProgress}% 完成</span>
          </div>

          <div className="progress-bar mb-4">
            <div className="progress-fill" style={{ width: `${guideProgress}%` }} />
          </div>

          <div className="space-y-3">
            {task.guide_steps.map((step, i) => (
              <div
                key={i}
                className={`flex gap-3 p-3 rounded-2xl transition-all cursor-pointer ${
                  step.done ? 'bg-sage-50' : 'bg-cream-100'
                }`}
                onClick={() => toggleGuideStep(i)}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  step.done ? 'bg-sage-400 text-white' : 'border-2 border-cream-400'
                }`}>
                  {step.done ? '✓' : <span className="text-xs text-choco-200">{i + 1}</span>}
                </div>
                <div>
                  <p className={`text-sm font-medium ${step.done ? 'text-sage-500 line-through' : 'text-choco-500'}`}>
                    {step.title}
                  </p>
                  <p className={`text-xs mt-1 ${step.done ? 'text-sage-300' : 'text-choco-200'}`}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
=======
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
>>>>>>> 85652a8d7910558fefa90e8ec9562240eff85d5b
          </div>
        </div>
      )}

<<<<<<< HEAD
      {task.status === 'unclaimed' && (
        <div className="hand-card bg-gradient-to-r from-lilac-50 to-rosa-50 border-lilac-100">
          <div className="flex items-center gap-2 mb-2">
            <span>🔒</span>
            <span className="text-sm text-lilac-400 font-medium">认领后解锁操作指南</span>
          </div>
          <p className="text-xs text-choco-200">
            AI 已为这个任务准备了 {task.guide_steps?.length || 0} 步详细指南，认领后即可查看
          </p>
        </div>
      )}
    </div>
  )
}

function computeRadarScores(task, profile) {
  const dimensions = {
    '编程': ['前端开发', '后端开发', '算法设计', 'Python', 'JavaScript', 'React', 'Vue', 'CSS'],
    '设计': ['UI设计', '视觉设计', '交互设计', 'Figma', 'Photoshop', 'Illustrator', 'Sketch'],
    '文案': ['文案撰写', '演讲汇报', 'Word', 'Markdown'],
    '调研': ['调研分析', '用户研究', '市场分析', '需求分析'],
    '工具': ['PPT', 'Excel', 'Tableau', 'SPSS', 'MATLAB', 'Premiere', 'After Effects', 'Blender'],
  }

  const userSkills = [...(profile?.skills || []), ...(profile?.tools || [])]
  const taskSkills = task.skills_required || []

  return Object.values(dimensions).map(dimSkills => {
    const relevant = dimSkills.filter(s => taskSkills.some(ts => ts.includes(s) || s.includes(ts)))
    if (relevant.length === 0) return 20
    const matched = relevant.filter(s => userSkills.some(us => us.includes(s) || s.includes(us)))
    return Math.max(20, Math.round((matched.length / relevant.length) * 100))
  })
}
=======
      {/* 元信息 */}
      <div className="hand-card text-xs text-gray-400 space-y-1">
        <p>创建时间: {new Date(task.created_at).toLocaleString('zh-CN')}</p>
        {task.estimated_hours && <p>预估工时: {task.estimated_hours} 小时</p>}
        {task.group_id && <p>团队任务 | 群组ID: {task.group_id}</p>}
      </div>
    </div>
  )
}
>>>>>>> 85652a8d7910558fefa90e8ec9562240eff85d5b
