import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProjects, createProject, deleteProject, getUserProfile } from '../utils/store'
import { groupAPI } from '../utils/api'

const statusMap = {
  discussing: { label: '讨论中', color: 'text-rosa-400', bg: 'bg-rosa-50' },
  confirmed: { label: '已确认', color: 'text-dusty-400', bg: 'bg-dusty-50' },
  in_progress: { label: '进行中', color: 'text-dusty-400', bg: 'bg-dusty-50' },
  completed: { label: '已完成', color: 'text-sage-400', bg: 'bg-sage-50' },
}

export default function ProjectListPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [swipedId, setSwipedId] = useState(null)
  const [touchStartX, setTouchStartX] = useState(0)
  const [greeting, setGreeting] = useState('')
  const [groups, setGroups] = useState([])

  useEffect(() => {
    setProjects(getProjects())
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('早上好')
    else if (hour < 18) setGreeting('下午好')
    else setGreeting('晚上好')
    // 加载团队项目
    groupAPI.list().then(res => setGroups(res.data)).catch(() => {})
  }, [])

  const profile = getUserProfile()

  const handleCreate = () => {
    if (!newName.trim()) return
    if (!profile) {
      navigate('/skills')
      return
    }
    const project = createProject({ name: newName.trim(), description: newDesc.trim() })
    setProjects(getProjects())
    setShowCreate(false)
    setNewName('')
    setNewDesc('')
    navigate(`/discussion/${project.id}`)
  }

  const handleProjectClick = (project) => {
    if (project.status === 'discussing') navigate(`/discussion/${project.id}`)
    else if (project.status === 'confirmed') navigate(`/authorize/${project.id}`)
    else navigate(`/kanban/${project.id}`)
  }

  const handleDelete = (id) => {
    deleteProject(id)
    setProjects(getProjects())
    setSwipedId(null)
  }

  const handleTouchStart = (e, id) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchMove = (e, id) => {
    const diff = touchStartX - e.touches[0].clientX
    if (diff > 60) setSwipedId(id)
    else if (diff < -30) setSwipedId(null)
  }

  return (
    <div className="px-4 pt-6 pb-24 fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-hand text-choco-600">{greeting} ~</h1>
          <p className="text-sm text-choco-300 mt-1">
            {profile ? `${profile.name || profile.major?.[0] || ''}，准备开工了吗？` : '欢迎使用 AI 统筹组长'}
          </p>
        </div>
        <button
          onClick={() => navigate('/skills')}
          className="w-10 h-10 rounded-full bg-rosa-50 flex items-center justify-center text-lg hover:bg-rosa-100 transition-all active:scale-95"
        >
          {profile ? '🍪' : '🍬'}
        </button>
      </div>

      {!profile && (
        <div className="hand-card mb-4 bg-gradient-to-r from-rosa-50 to-lilac-50 border-rosa-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🍬</span>
            <span className="text-sm font-medium text-rosa-500">先完善你的技能名片</span>
          </div>
          <p className="text-xs text-choco-300 mb-3">填写你的专业和擅长技能，AI 将根据你的背景提供个性化建议</p>
          <button onClick={() => navigate('/skills')} className="hand-btn text-sm py-2 px-4">
            去填写
          </button>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🧁</div>
            <p className="text-choco-300 text-sm mb-1">还没有项目</p>
            <p className="text-choco-200 text-xs">点击下方按钮创建你的第一个团队项目</p>
          </div>
        ) : (
          projects.map((project, index) => {
            const status = statusMap[project.status] || statusMap.discussing
            const taskCount = project.tasks?.length || 0
            const completedCount = project.tasks?.filter(t => t.status === 'completed').length || 0
            const isSwiped = swipedId === project.id

            return (
              <div
                key={project.id}
                className="relative overflow-hidden rounded-2xl"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div
                  className={`hand-card cursor-pointer transition-all duration-200 ${isSwiped ? '-translate-x-20' : ''}`}
                  onClick={() => !isSwiped && handleProjectClick(project)}
                  onTouchStart={(e) => handleTouchStart(e, project.id)}
                  onTouchMove={(e) => handleTouchMove(e, project.id)}
                  onTouchEnd={() => {}}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🧁</span>
                        <h3 className="text-base font-medium truncate text-choco-600">{project.name}</h3>
                      </div>
                      {project.description && (
                        <p className="text-xs text-choco-200 truncate ml-7 mb-2">{project.description}</p>
                      )}
                      <div className="flex items-center gap-3 ml-7">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        {taskCount > 0 && (
                          <span className="text-xs text-choco-200">{completedCount}/{taskCount} 任务</span>
                        )}
                        <span className="text-xs text-choco-100">
                          {new Date(project.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                    <span className="text-choco-200 text-sm mt-1">→</span>
                  </div>
                </div>
                {isSwiped && (
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="absolute right-0 top-0 bottom-0 w-20 bg-rosa-400 text-white flex items-center justify-center text-sm font-medium rounded-r-2xl"
                  >
                    删除
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 团队项目 */}
      {groups.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-choco-400 font-medium mb-2">🎂 团队项目</p>
          <div className="space-y-3">
            {groups.map(g => (
              <div
                key={g.id}
                onClick={() => navigate(`/group-chat/${g.id}`)}
                className="hand-card cursor-pointer transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sage-50 border border-sage-100 flex items-center justify-center text-lg">
                      🎂
                    </div>
                    <div>
                      <p className="text-sm font-medium text-choco-600">{g.name}</p>
                      <p className="text-xs text-choco-200">{g.member_count || 0} 人 · 群号 {g.invite_code}</p>
                    </div>
                  </div>
                  <span className="text-choco-200 text-sm">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setShowCreate(true)}
          className="flex-1 hand-card border-dashed border-cream-400 text-center py-4 text-rosa-300 hover:bg-cream-50 transition-all active:scale-[0.98]"
        >
          <span className="text-xl block mb-0.5">+</span>
          <span className="text-xs">个人项目</span>
        </button>
        <button
          onClick={() => navigate('/create-group')}
          className="flex-1 hand-card border-dashed border-sage-200 text-center py-4 text-sage-400 hover:bg-sage-50 transition-all active:scale-[0.98]"
        >
          <span className="text-xl block mb-0.5">🎂</span>
          <span className="text-xs">团队项目</span>
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/20 z-[200] flex items-end justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-[430px] p-6 pb-20 fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-cream-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-choco-600">新建团队项目</h3>
              <button onClick={() => setShowCreate(false)} className="text-choco-200 hover:text-choco-400 text-xl">×</button>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                className="hand-input flex-1 text-sm"
                placeholder="项目名称（如：课程大作业）"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
              <button
                onClick={handleCreate}
                className="hand-btn text-sm py-2 px-4 flex-shrink-0"
                disabled={!newName.trim()}
              >
                {profile ? '确认' : '填名片'}
              </button>
            </div>
            <textarea
              className="hand-input mb-2 text-sm resize-none"
              rows={2}
              placeholder="简要描述（选填）"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
