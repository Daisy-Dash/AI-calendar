import { useState, useEffect } from 'react'
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
        <button onClick={() => navigate(`/kanban/${projectId}`)} className="text-rosa-400 text-lg flex items-center"><img src="/assets/cakie/返回箭头_icon-back.png" className="inline-block w-5 h-5" alt="" /></button>
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
          </div>
        </div>
      )}

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
