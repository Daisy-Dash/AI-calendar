import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProject, updateProject, setProjectTasks, getUserProfile } from '../utils/store'
import { decomposeTask } from '../utils/mockAI'

export default function AuthorizePage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    const p = getProject(projectId)
    if (!p) { navigate('/'); return }
    setProject(p)
    if (p.status === 'in_progress' || p.status === 'completed') {
      navigate(`/kanban/${projectId}`)
    }
  }, [projectId])

  const handleConfirm = async () => {
    setLoading(true)
    setConfirmed(true)

    const profile = getUserProfile()
    const tasks = await decomposeTask(project.confirmed_goal || project.name, profile)

    setProjectTasks(projectId, tasks)

    setTimeout(() => {
      navigate(`/kanban/${projectId}`)
    }, 1200)
  }

  if (!project) return null

  const checkItems = [
    { icon: '🍓', text: '拆解为可执行的子任务' },
    { icon: '🫐', text: '评估每个任务的难度等级' },
    { icon: '🍵', text: '生成小白专属操作指南' },
    { icon: '🍰', text: '计算你的技能匹配度' },
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 fade-in-up">
      <div className={`transition-all duration-700 w-full max-w-sm ${confirmed ? 'scale-110 opacity-0' : 'scale-100 opacity-100'}`}>
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-float">🎂</div>
          <h1 className="text-2xl font-hand text-choco-600 mb-2">团队已确定方案方向</h1>
          <div className="hand-card bg-gradient-to-r from-cream-100 to-rosa-50 mt-4 mb-6">
            <p className="text-base text-choco-500 font-medium leading-relaxed">
              "{project.confirmed_goal || project.name}"
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          {checkItems.map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-choco-400" style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="text-lg">{item.icon}</span>
              <span>AI 将为你：{item.text}</span>
            </div>
          ))}
        </div>

        {!loading ? (
          <>
            <button
              onClick={handleConfirm}
              className="authorize-btn w-full py-5 text-lg font-medium text-white rounded-full transition-all active:scale-95"
            >
              确认目标并开始拆解
            </button>
            <button
              onClick={() => navigate(`/discussion/${projectId}`)}
              className="w-full text-center mt-4 text-sm text-rosa-400 hover:text-rosa-500 transition-colors"
            >
              ← 返回讨论修改方案
            </button>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-cream-300 border-t-rosa-300 rounded-full animate-spin" />
            <p className="text-rosa-400 font-medium animate-pulse">AI 正在智能拆解任务...</p>
            <p className="text-xs text-choco-200 mt-2">分析项目需求、评估难度、生成指南</p>
          </div>
        )}
      </div>
    </div>
  )
}
