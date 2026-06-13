import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { groupAPI, taskAPI, messageAPI } from '../utils/api'

export default function KanbanPage() {
  // 兼容旧路由参数名（projectId）+ 新参数名（groupId）
  const params = useParams()
  const groupId = params.groupId || params.projectId
  const navigate = useNavigate()
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState([])
  const [proposal, setProposal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [groupId])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [groupRes, statsRes, tasksRes, msgsRes] = await Promise.all([
        groupAPI.getDetail(parseInt(groupId)),
        groupAPI.getStats(parseInt(groupId)).catch(() => ({ data: null })),
        taskAPI.list({ group_id: parseInt(groupId) }).catch(() => ({ data: [] })),
        messageAPI.getGroupMessages(parseInt(groupId), { limit: 200 }).catch(() => ({ data: [] })),
      ])
      setGroup(groupRes.data)
      setStats(statsRes.data)
      // 排序：DDL 升序，无 DDL 排末尾
      const sorted = [...(tasksRes.data || [])].sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline) - new Date(b.deadline)
      })
      setTasks(sorted)
      // 找最近一次组员提交的方案消息
      const proposals = (msgsRes.data || []).filter(m => m.msg_type === 'proposal')
      if (proposals.length > 0) {
        setProposal(proposals[proposals.length - 1])
      }
    } catch (e) {
      console.error(e)
      alert('看板加载失败')
      navigate(`/group-chat/${groupId}`)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-float">📋</div>
          <p className="text-sm text-choco-200">加载中...</p>
        </div>
      </div>
    )
  }

  if (!group) return null

  const total = stats?.total_tasks || tasks.length
  const completed = stats?.completed_tasks || tasks.filter(t => t.status === '已完成').length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="px-4 pt-6 pb-24 fade-in-up">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={() => navigate(-1)} className="text-rosa-400 text-lg flex-shrink-0 flex items-center"><img src="/assets/cakie/返回箭头_icon-back.png" className="inline-block w-5 h-5" alt="" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium text-choco-600 truncate">{group.name}</h1>
            <p className="text-xs text-choco-200">📋 团队看板</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/group-chat/${groupId}`)}
          className="text-xs px-3 py-1.5 rounded-full bg-rosa-50 border border-rosa-100 text-rosa-500 hover:bg-rosa-100 active:scale-95 transition-all flex-shrink-0"
        >
          回群聊
        </button>
      </div>

      {/* 项目综述卡片 */}
      <div className="hand-card mb-3 bg-gradient-to-br from-rosa-50 to-lilac-50 border-rosa-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🎂</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-choco-600">项目综述</p>
            <p className="text-[10px] text-choco-300">
              {group.member_count || 0} 位成员 ·{' '}
              {group.status === 'gathering' && '📢 召集中'}
              {group.status === 'discussing' && '💭 讨论中'}
              {group.status === 'confirming' && '✋ 待确认'}
              {group.status === 'in_progress' && '🚀 进行中'}
              {group.status === 'completed' && '✅ 已完成'}
            </p>
          </div>
        </div>
        {group.description && (
          <div className="mt-2 px-3 py-2 rounded-xl bg-white/60 border border-rosa-100">
            <p className="text-xs text-choco-500 leading-relaxed">{group.description}</p>
          </div>
        )}
      </div>

      {/* 组员讨论方案（如果有） */}
      {proposal && (
        <div className="hand-card mb-3 bg-gradient-to-br from-sage-50 to-cream-50 border-sage-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📝</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-choco-600">小组讨论方案</p>
              <p className="text-[10px] text-choco-300">
                {proposal.sender?.username || '组员'} 提交 ·{' '}
                {proposal.created_at ? new Date(proposal.created_at).toLocaleDateString('zh-CN') : ''}
              </p>
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white/70 border border-sage-100">
            <p className="text-xs text-choco-600 leading-relaxed whitespace-pre-wrap">{proposal.content}</p>
          </div>
        </div>
      )}

      {/* 总进度条 */}
      <div className="hand-card mb-3 bg-gradient-to-br from-dusty-50 to-cream-50 border-dusty-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <p className="text-sm font-medium text-choco-600">团队总进度</p>
          </div>
          <span className={`text-lg font-bold ${
            completionRate >= 80 ? 'text-sage-500' :
            completionRate >= 40 ? 'text-dusty-500' :
            'text-rosa-500'
          }`}>{completionRate}%</span>
        </div>
        <div className="w-full h-3 bg-cream-200 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              completionRate >= 80 ? 'bg-gradient-to-r from-sage-300 to-sage-400' :
              completionRate >= 40 ? 'bg-gradient-to-r from-dusty-300 to-dusty-400' :
              'bg-gradient-to-r from-rosa-200 to-rosa-300'
            }`}
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-choco-300">
          <span>📋 {completed}/{total} 任务完成</span>
          <span>
            <img src="/assets/cakie/任务过期图标_icon-overdue.png" className="inline-block w-3.5 h-3.5" alt="" /> {tasks.filter(t => t.deadline && t.status !== '已完成' && new Date(t.deadline) < new Date()).length} 逾期 ·{' '}
            ◎ {tasks.filter(t => t.status === '进行中').length} 进行
          </span>
        </div>
        {/* 每位成员的进度 */}
        {stats?.member_stats && stats.member_stats.length > 0 && (
          <div className="space-y-1.5 mt-3 pt-3 border-t border-cream-200">
            <p className="text-[10px] text-choco-400 font-medium mb-1">每位成员的进度</p>
            {stats.member_stats.map(m => {
              const rate = m.total_tasks > 0 ? Math.round((m.completed_tasks / m.total_tasks) * 100) : 0
              return (
                <div key={m.user_id} className="flex items-center gap-2">
                  <span className="text-xs text-choco-500 w-16 truncate flex-shrink-0">{m.username}</span>
                  <div className="flex-1 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        rate >= 80 ? 'bg-sage-300' :
                        rate >= 40 ? 'bg-dusty-300' : 'bg-rosa-200'
                      }`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-choco-300 w-10 text-right flex-shrink-0">
                    {m.completed_tasks}/{m.total_tasks}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 任务分工卡片（DDL 升序） */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-choco-600 flex items-center gap-1.5">
            <span>🪜</span> 任务分工
          </p>
          <span className="text-[10px] text-choco-300">按 DDL 由近到远 · {tasks.length} 个</span>
        </div>

        {tasks.length === 0 ? (
          <div className="hand-card text-center py-8">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm text-choco-300">还没有任务</p>
            <p className="text-[10px] text-choco-200 mt-1">回到群聊提交方案后 AI 会自动拆任务</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => {
              const isMine = task.assigned_to === user?.id
              const isOverdue = task.deadline && task.status !== '已完成' && new Date(task.deadline) < new Date()
              const isDone = task.status === '已完成' || (task.progress || 0) >= 100
              const assignee = group.members?.find(m => m.user_id === task.assigned_to)
              const assigneeName = assignee?.username || (task.assigned_to ? '其他成员' : '未分配')
              const assigneeAvatar = assignee?.avatar || '👤'

              return (
                <div
                  key={task.id}
                  onClick={isMine ? () => navigate(`/task-chat/${task.id}`) : undefined}
                  className={`hand-card transition-all ${
                    isMine ? 'cursor-pointer hover:shadow-md active:scale-[0.98] border-rosa-200 bg-gradient-to-r from-white to-rosa-50' :
                    isOverdue && !isDone ? 'border-red-200 bg-red-50/40' :
                    'opacity-85'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${
                      isDone ? 'bg-sage-100' :
                      isOverdue ? 'bg-red-100' :
                      isMine ? 'bg-rosa-100' : 'bg-lilac-50'
                    }`}>
                      {isDone ? '✅' : isOverdue ? <img src="/assets/cakie/任务过期图标_icon-overdue.png" className="inline-block w-5 h-5" alt="" /> : isMine ? '🤖' : assigneeAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-snug ${
                          isDone ? 'text-choco-300 line-through' :
                          isOverdue ? 'text-red-600' :
                          'text-choco-600'
                        }`}>{task.title}</p>
                        {task.deadline && (
                          <span className={`text-[10px] flex-shrink-0 whitespace-nowrap ${
                            isOverdue && !isDone ? 'text-red-500 font-medium' : 'text-choco-300'
                          }`}>
                            {isOverdue && !isDone ? <><img src="/assets/cakie/任务过期图标_icon-overdue.png" className="inline-block w-3 h-3" alt="" /> 逾期</> : '📅 '}
                            {new Date(task.deadline).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-[11px] text-choco-300 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
                      )}
                      {/* 进度条 */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isDone ? 'bg-sage-300' :
                              isOverdue ? 'bg-red-400' :
                              (task.progress || 0) >= 50 ? 'bg-dusty-300' :
                              'bg-rosa-300'
                            }`}
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                        <span className={`text-[10px] flex-shrink-0 font-medium ${
                          isOverdue && !isDone ? 'text-red-500' : 'text-choco-400'
                        }`}>{task.progress || 0}%</span>
                      </div>
                      {/* 负责人 + 标记 */}
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px] text-choco-400 flex items-center gap-1">
                          {isMine ? (
                            <><span>🌟</span> <span className="font-medium text-rosa-500">我负责</span></>
                          ) : (
                            <><span>{assigneeAvatar}</span> <span>{assigneeName}</span></>
                          )}
                        </p>
                        {isMine && <span className="text-[10px] text-rosa-400">点击进 AI 聊天 →</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
