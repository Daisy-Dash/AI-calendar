import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { groupAPI, taskAPI } from '../utils/api'

const DEFAULT_CAKIE_AVATAR = '/assets/cakie/头像_草莓蛋糕_avatar-strawberry.png'

function CakieAvatar({ src, className = '', alt = '蛋糕头像' }) {
  const [failed, setFailed] = useState(false)
  const imageSrc = typeof src === 'string' && src.startsWith('/assets/cakie/') ? src : DEFAULT_CAKIE_AVATAR

  if (failed) {
    return <span className={`cakie-avatar-image-fallback ${className}`}>蛋糕头像</span>
  }

  return <img src={imageSrc} alt={alt} className={className} onError={() => setFailed(true)} />
}

export default function ProjectListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [groupStats, setGroupStats] = useState({})
  const [myTasks, setMyTasks] = useState({}) // groupId -> [tasks]
  const [allMyTasks, setAllMyTasks] = useState([]) // 全部任务（用于概览）
  const [subtasksMap, setSubtasksMap] = useState({}) // parentId -> [subtasks]
  const [greeting, setGreeting] = useState('')
  const [loading, setLoading] = useState(true)
  const [overduePopup, setOverduePopup] = useState(null)
  const [taskFilter, setTaskFilter] = useState(null) // null | '已完成' | '进行中' | '待处理'
  const [expandedGroups, setExpandedGroups] = useState(() => {
    // 从 localStorage 恢复展开状态
    try {
      const cached = localStorage.getItem('expanded_groups')
      return cached ? JSON.parse(cached) : {}
    } catch { return {} }
  })

  const toggleGroupExpanded = (groupId) => {
    setExpandedGroups(prev => {
      const next = { ...prev, [groupId]: !prev[groupId] }
      try { localStorage.setItem('expanded_groups', JSON.stringify(next)) } catch {}
      return next
    })
  }

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('早上好')
    else if (hour < 18) setGreeting('下午好')
    else setGreeting('晚上好')
    loadData()
  }, [location.key])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await groupAPI.list()
      const groupList = res.data || []
      setGroups(groupList)

      // 加载每个群组的任务统计
      const statsMap = {}
      for (const g of groupList) {
        try {
          const statsRes = await groupAPI.getStats(g.id)
          statsMap[g.id] = statsRes.data
        } catch {
          statsMap[g.id] = { total_tasks: 0, completed_tasks: 0, completion_rate: 0 }
        }
      }
      setGroupStats(statsMap)

      // 加载我的任务（按群组分组）& 检查逾期
      try {
        const tasksRes = await taskAPI.list()
        const allTasks = tasksRes.data || []
        setAllMyTasks(allTasks)
        const now = new Date()

        // 首页项目卡下的任务列表：
        // 只展示父任务，子任务在父任务进度条上展示
        const tasksByGroup = {}
        const subtasksByParent = {}
        const overdueTasks = []
        for (const t of allTasks) {
          if (t.parent_id || t.is_subtask) {
            if (!subtasksByParent[t.parent_id]) subtasksByParent[t.parent_id] = []
            subtasksByParent[t.parent_id].push(t)
            continue
          }
          if (t.group_id) {
            if (!tasksByGroup[t.group_id]) tasksByGroup[t.group_id] = []
            tasksByGroup[t.group_id].push(t)
          }
          if (t.deadline && t.status !== '已完成' && new Date(t.deadline) < now) {
            overdueTasks.push(t)
          }
        }
        // 每个项目内的任务按 DDL 升序排
        for (const gid of Object.keys(tasksByGroup)) {
          tasksByGroup[gid].sort((a, b) => {
            if (!a.deadline && !b.deadline) return 0
            if (!a.deadline) return 1
            if (!b.deadline) return -1
            return new Date(a.deadline) - new Date(b.deadline)
          })
        }
        setMyTasks(tasksByGroup)
        setSubtasksMap(subtasksByParent)

        const twoDays = 2 * 86400000
        for (const subs of Object.values(subtasksByParent)) {
          for (const st of subs) {
            if (st.deadline && st.status !== '已完成') {
              const timeLeft = new Date(st.deadline) - now
              if (timeLeft < twoDays) {
                overdueTasks.push(st)
              }
            }
          }
        }

        if (overdueTasks.length > 0) {
          setOverduePopup(overdueTasks)
        }
      } catch {}
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const getGroupDeadline = (groupId) => {
    // 从stats的member_stats里推断，或者直接返回null
    // 这里我们简化处理，后续可以扩展
    return null
  }

  const isOverdue = (deadline) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  const parentOnlyTasks = allMyTasks.filter(t => !t.parent_id && !t.is_subtask)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <CakieAvatar src={DEFAULT_CAKIE_AVATAR} className="cakie-home-loading-avatar mb-3 animate-float" />
          <p className="text-sm text-choco-200">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-24 fade-in-up">
      {/* 头部问候 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-hand text-choco-600">{greeting} ~</h1>
          <p className="text-sm text-choco-300 mt-1">
            {user ? `${user.username}，准备开工了吗？` : '欢迎使用 AI 统筹组长'}
          </p>
        </div>
        <button
          onClick={() => navigate('/skills')}
          className="cakie-home-user-avatar transition-all active:scale-95"
          aria-label="打开我的 CAKIE 菜单卡"
        >
          <CakieAvatar src={user?.avatar} className="cakie-avatar-image" />
        </button>
      </div>

      {/* 我的任务概览 */}
      {parentOnlyTasks.length > 0 && (
        <div className="mb-4">
          <div className="hand-card bg-gradient-to-r from-lilac-50 to-rosa-50 border-lilac-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rosa-100 to-lilac-100 border border-rosa-200 flex items-center justify-center text-xl flex-shrink-0">
                📌
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-choco-600">我的任务</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <button
                    onClick={() => setTaskFilter(taskFilter === '已完成' ? null : '已完成')}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all active:scale-95 ${
                      taskFilter === '已完成' ? 'bg-sage-200 border-sage-300 text-sage-600' : 'bg-white/80 border-sage-100 text-sage-500'
                    }`}
                  >
                    {parentOnlyTasks.filter(t => t.status === '已完成').length} 完成
                  </button>
                  <button
                    onClick={() => setTaskFilter(taskFilter === '进行中' ? null : '进行中')}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all active:scale-95 ${
                      taskFilter === '进行中' ? 'bg-dusty-200 border-dusty-300 text-dusty-600' : 'bg-white/80 border-dusty-100 text-dusty-500'
                    }`}
                  >
                    {parentOnlyTasks.filter(t => t.status === '进行中').length} 进行中
                  </button>
                  <button
                    onClick={() => setTaskFilter(taskFilter === '待处理' ? null : '待处理')}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all active:scale-95 ${
                      taskFilter === '待处理' ? 'bg-cream-200 border-choco-200 text-choco-600' : 'bg-white/80 border-cream-200 text-choco-400'
                    }`}
                  >
                    {parentOnlyTasks.filter(t => !['已完成','进行中'].includes(t.status)).length} 待处理
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 筛选结果：按项目分组展示 */}
          {taskFilter && (() => {
            const filtered = taskFilter === '待处理'
              ? parentOnlyTasks.filter(t => !['已完成','进行中'].includes(t.status))
              : parentOnlyTasks.filter(t => t.status === taskFilter)
            if (filtered.length === 0) {
              return (
                <div className="mt-2 text-center py-4 text-xs text-choco-200 fade-in-up">
                  暂无「{taskFilter}」的任务
                </div>
              )
            }
            // 按所属项目分组（所有任务都是团队任务）
            const byGroup = {}
            for (const t of filtered) {
              const gId = t.group_id
              if (!gId) continue
              if (!byGroup[gId]) byGroup[gId] = []
              byGroup[gId].push(t)
            }
            return (
              <div className="mt-2 space-y-2 fade-in-up">
                {Object.entries(byGroup).map(([gId, tasks]) => {
                  const g = groups.find(gr => gr.id === parseInt(gId))
                  return (
                    <div
                      key={gId}
                      onClick={() => navigate(`/group-chat/${gId}`)}
                      className="hand-card cursor-pointer hover:shadow-md transition-all active:scale-[0.98] py-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="cakie-project-avatar is-small flex-shrink-0">
                          <CakieAvatar src={DEFAULT_CAKIE_AVATAR} className="cakie-avatar-image" alt="项目蛋糕头像" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-choco-600 truncate">{g?.name || '未知项目'}</p>
                          <p className="text-[10px] text-choco-200 mt-0.5">
                            {tasks.length} 个{taskFilter === '待处理' ? '待处理' : taskFilter}任务
                          </p>
                        </div>
                        <span className="text-choco-200 text-xs">→</span>
                      </div>
                      <div className="mt-1.5 pl-[46px] space-y-0.5">
                        {tasks.slice(0, 3).map(t => (
                          <p key={t.id} className="text-[11px] text-choco-300 truncate">· {t.title}</p>
                        ))}
                        {tasks.length > 3 && (
                          <p className="text-[10px] text-choco-200">还有 {tasks.length - 3} 个...</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {/* 创建新团队项目按钮 */}
      <button
        onClick={() => navigate('/create-group')}
        className="w-full hand-card border-dashed border-sage-200 text-center py-4 text-sage-400 hover:bg-sage-50 transition-all active:scale-[0.98] mb-4"
      >
        <span className="text-xl inline-block mr-1">+</span>
        <span className="text-sm">创建新团队项目</span>
      </button>

      {/* 团队项目列表 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-choco-500 font-medium flex items-center gap-1.5">
            <CakieAvatar src={DEFAULT_CAKIE_AVATAR} className="cakie-project-title-avatar" alt="项目蛋糕头像" /> 我的团队项目
          </p>
          <span className="text-xs text-choco-200">{groups.length} 个项目</span>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12">
            <CakieAvatar src={DEFAULT_CAKIE_AVATAR} className="cakie-project-empty-avatar mb-4" alt="项目蛋糕头像" />
            <p className="text-choco-300 text-sm mb-1">还没有团队项目</p>
            <p className="text-choco-200 text-xs">点击下方按钮创建你的第一个团队项目</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...groups].sort((a, b) => {
              const aDone = a.status === 'completed' ? 1 : 0
              const bDone = b.status === 'completed' ? 1 : 0
              return aDone - bDone
            }).map((g, index) => {
              const isCompleted = g.status === 'completed'
              const personalTasks = myTasks[g.id] || []
              const totalTasks = personalTasks.length
              const completedTasks = personalTasks.filter(t => t.status === '已完成').length
              const completionRate = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0

              return (
                <div key={g.id} style={{ animationDelay: `${index * 0.08}s` }}>
                  {/* 团队项目卡片 */}
                  <div
                    onClick={() => navigate(`/group-chat/${g.id}`)}
                    className={`hand-card cursor-pointer transition-all active:scale-[0.98] hover:shadow-md ${
                      isCompleted ? 'opacity-50 grayscale' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="cakie-project-avatar">
                          <CakieAvatar src={DEFAULT_CAKIE_AVATAR} className="cakie-avatar-image" alt="项目蛋糕头像" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-choco-600">{g.name}</p>
                          <p className="text-xs text-choco-200 mt-0.5">
                            {g.member_count || 0} 人
                            {g.status === 'in_progress' && ' · 进行中'}
                            {g.status === 'gathering' && ' · 召集中'}
                            {g.status === 'discussing' && ' · 讨论中'}
                            {g.status === 'confirming' && ' · 待确认'}
                            {g.status === 'completed' && ' · 已完成'}
                          </p>
                        </div>
                      </div>
                      <span className="text-choco-200 text-sm mt-1">→</span>
                    </div>

                    {/* 团队总进度 */}
                    {totalTasks > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-choco-300">
                            📋 {completedTasks}/{totalTasks} 任务完成
                          </span>
                          <span className={`text-xs font-medium ${
                            completionRate >= 80 ? 'text-sage-400' :
                            completionRate >= 40 ? 'text-dusty-400' :
                            'text-choco-300'
                          }`}>
                            {completionRate}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-cream-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              completionRate >= 80 ? 'bg-gradient-to-r from-sage-300 to-sage-400' :
                              completionRate >= 40 ? 'bg-gradient-to-r from-dusty-300 to-dusty-400' :
                              'bg-gradient-to-r from-rosa-200 to-rosa-300'
                            }`}
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 我在这个项目里的任务卡片列表 — 可折叠展开（已完成项目自动折叠） */}
                  {personalTasks.length > 0 && !isCompleted && (() => {
                    // 默认：任务 ≤ 2 时展开，> 2 时折叠
                    const expanded = expandedGroups[g.id] !== undefined ? expandedGroups[g.id] : personalTasks.length <= 2
                    const overdueCount = personalTasks.filter(t => t.deadline && t.status !== '已完成' && new Date(t.deadline) < new Date()).length
                    const doneCount = personalTasks.filter(t => t.status === '已完成' || t.progress >= 100).length
                    return (
                      <>
                        {/* 折叠/展开切换按钮 */}
                        <button
                          onClick={() => toggleGroupExpanded(g.id)}
                          className="ml-6 mt-1 w-[calc(100%-1.5rem)] px-3 py-1.5 rounded-lg bg-cream-50 border border-cream-200 hover:bg-cream-100 active:scale-[0.98] transition-all flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-choco-300">
                              {expanded ? '收起任务' : '展开任务'}
                            </span>
                            <span className="text-choco-200">·</span>
                            <span className="text-choco-300">{personalTasks.length} 个</span>
                            {overdueCount > 0 && (
                              <>
                                <span className="text-choco-200">·</span>
                                <span className="text-red-500 font-medium animate-pulse">⚠️ {overdueCount} 逾期</span>
                              </>
                            )}
                            {doneCount > 0 && overdueCount === 0 && (
                              <>
                                <span className="text-choco-200">·</span>
                                <span className="text-sage-500">✅ {doneCount} 完成</span>
                              </>
                            )}
                          </div>
                          <span className={`text-choco-300 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
                        </button>

                        {/* 任务卡片列表 */}
                        {expanded && (
                          <div className="ml-6 mt-1 space-y-1.5 fade-in-up">
                            {personalTasks.map(t => {
                        const tOverdue = t.deadline && t.status !== '已完成' && new Date(t.deadline) < new Date()
                        const tDone = t.status === '已完成' || t.progress >= 100
                        return (
                          <div
                            key={t.id}
                            onClick={() => navigate(`/task-chat/${t.id}`)}
                            className={`px-3 py-2.5 rounded-xl border cursor-pointer transition-all active:scale-[0.98] hover:shadow-sm flex items-center gap-2.5 ${
                              tOverdue
                                ? 'bg-red-50 border-red-200 animate-pulse'
                                : tDone
                                  ? 'bg-sage-50 border-sage-100'
                                  : 'bg-gradient-to-r from-lilac-50 to-cream-50 border-lilac-100'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${
                              tOverdue ? 'bg-red-100' : tDone ? 'bg-sage-100' : 'bg-lilac-100'
                            }`}>
                              {tOverdue ? '⚠️' : tDone ? '✅' : '🤖'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-xs font-medium truncate ${tOverdue ? 'text-red-600' : 'text-choco-600'}`}>
                                  {t.title}
                                </p>
                                {t.deadline && (
                                  <span className={`text-[9px] flex-shrink-0 ${tOverdue ? 'text-red-500 font-medium' : 'text-choco-200'}`}>
                                    {tOverdue ? '已逾期' : new Date(t.deadline).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              {/* 进度条 — 有子任务时显示节点 */}
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 relative h-1.5 bg-white/70 rounded-full overflow-visible">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      tDone ? 'bg-sage-300' :
                                      tOverdue ? 'bg-red-400' :
                                      t.progress >= 50 ? 'bg-dusty-300' :
                                      'bg-lilac-300'
                                    }`}
                                    style={{ width: `${t.progress || 0}%` }}
                                  />
                                  {(subtasksMap[t.id] || []).map((st, si) => {
                                    const subs = subtasksMap[t.id]
                                    const pos = ((si + 1) / subs.length) * 100
                                    const sDone = st.status === '已完成' || (st.progress || 0) >= 100
                                    const sOverdue = st.deadline && !sDone && new Date(st.deadline) < new Date()
                                    const sApproaching = st.deadline && !sDone && !sOverdue && (new Date(st.deadline) - new Date()) < 2 * 86400000
                                    return (
                                      <div
                                        key={st.id}
                                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border transition-all ${
                                          sDone ? 'bg-sage-400 border-white' :
                                          sOverdue ? 'bg-red-400 border-white animate-pulse' :
                                          sApproaching ? 'bg-red-300 border-white' :
                                          'bg-white border-rosa-300'
                                        }`}
                                        style={{ left: `${pos}%` }}
                                        title={`${st.title}${st.deadline ? ' · ' + new Date(st.deadline).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : ''}`}
                                      />
                                    )
                                  })}
                                </div>
                                <span className={`text-[10px] flex-shrink-0 ${tOverdue ? 'text-red-500' : 'text-choco-300'}`}>
                                  {t.progress || 0}%
                                </span>
                              </div>
                              {/* 子任务节点日期标记 */}
                              {(subtasksMap[t.id] || []).length > 0 && (
                                <div className="flex items-center justify-between mt-0.5 text-[8px] text-choco-200">
                                  {subtasksMap[t.id].slice(0, 4).map(st => {
                                    const sDone = st.status === '已完成'
                                    const sOverdue = st.deadline && !sDone && new Date(st.deadline) < new Date()
                                    const sApproaching = st.deadline && !sDone && !sOverdue && (new Date(st.deadline) - new Date()) < 2 * 86400000
                                    return (
                                      <span key={st.id} className={sOverdue ? 'text-red-500 font-medium' : sApproaching ? 'text-red-400' : ''}>
                                        {st.deadline ? new Date(st.deadline).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '—'}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                            <span className="text-choco-200 text-xs">→</span>
                          </div>
                        )
                      })}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 逾期任务弹窗提醒 */}
      {overduePopup && overduePopup.length > 0 && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-3 bg-transparent" onClick={() => setOverduePopup(null)}>
          <div className="bg-white rounded-3xl w-full max-w-[380px] p-5 fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⏰</span>
              <div>
                <h3 className="text-base font-medium text-rosa-500">任务截止提醒</h3>
                <p className="text-xs text-choco-200">以下任务已逾期或即将到期</p>
              </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {overduePopup.map(task => {
                const isOverdueNow = new Date(task.deadline) < new Date()
                const daysLeft = Math.ceil((new Date(task.deadline) - new Date()) / 86400000)
                const isSubtask = task.parent_id || task.is_subtask
                const parentTask = isSubtask ? allMyTasks.find(t => t.id === task.parent_id) : null
                return (
                  <div key={task.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                    isOverdueNow ? 'bg-rosa-50 border-rosa-100' : 'bg-amber-50 border-amber-100'
                  }`}>
                    <span className="text-red-400 text-sm">{isOverdueNow ? '🔴' : '🟡'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-choco-600 truncate">
                        {isSubtask && parentTask ? `${parentTask.title} › ` : ''}{task.title}
                      </p>
                      <p className={`text-[10px] ${isOverdueNow ? 'text-rosa-400' : 'text-amber-500'}`}>
                        截止: {new Date(task.deadline).toLocaleDateString('zh-CN')}
                        {isOverdueNow
                          ? ` · 已逾期 ${Math.abs(daysLeft)} 天`
                          : ` · ${daysLeft} 天后截止`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => setOverduePopup(null)}
              className="w-full py-2.5 rounded-xl text-sm text-white bg-rosa-400 active:scale-[0.98]"
              style={{ boxShadow: '0 2px 0 #B37474' }}
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
