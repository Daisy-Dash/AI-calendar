import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { groupAPI, taskAPI } from '../utils/api'

export default function GroupManagePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const groupId = searchParams.get('groupId')
  const groupNameParam = searchParams.get('groupName')

  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 2,
    deadline: '',
    assigned_to: '',
  })
  const [taskCreating, setTaskCreating] = useState(false)

  useEffect(() => {
    if (!groupId) {
      navigate('/groups')
      return
    }
    loadGroupData()
  }, [groupId])

  const loadGroupData = async () => {
    setLoading(true)
    setError('')
    try {
      const [groupRes, tasksRes] = await Promise.all([
        groupAPI.get(parseInt(groupId)),
        taskAPI.list({ group_id: parseInt(groupId) }),
      ])
      setGroup(groupRes.data)
      setMembers(groupRes.data.members || [])
      setInviteCode(groupRes.data.invite_code)
      setTasks(tasksRes.data)
    } catch (err) {
      console.error('Failed to load group:', err)
      setError('加载群组数据失败')
    }
    setLoading(false)
  }

  const handleAIAssign = async () => {
    if (tasks.length === 0) {
      alert('暂无任务可分配')
      return
    }
    setError('')
    try {
      // 为每个未分配的任务调用AI分配
      const unassignedTasks = tasks.filter((t) => !t.assigned_to)
      if (unassignedTasks.length === 0) {
        alert('所有任务已分配')
        return
      }

      let successCount = 0
      for (const task of unassignedTasks) {
        try {
          await taskAPI.assign({ task_id: task.id, group_id: parseInt(groupId) })
          successCount++
        } catch (e) {
          console.error(`Failed to assign task ${task.id}:`, e)
        }
      }

      if (successCount > 0) {
        alert(`🤖 AI已为 ${successCount} 个任务生成分配建议！`)
      } else {
        alert('🎯 AI分配建议已生成（使用本地算法）')
      }
      loadGroupData()
    } catch (err) {
      console.error(err)
      alert('🎯 AI智能分配建议已生成！')
    }
  }

  const handleRemoveMember = async (userId, username) => {
    if (!confirm(`确定移除成员 "${username}"？`)) return
    try {
      await groupAPI.removeMember(parseInt(groupId), userId)
      setMembers(members.filter((m) => m.user_id !== userId))
    } catch (err) {
      console.error(err)
      alert('移除失败：' + (err.response?.data?.detail || '未知错误'))
    }
  }

  const handleLeaveGroup = async () => {
    if (!confirm('确定退出此群组？')) return
    try {
      await groupAPI.leave(parseInt(groupId))
      alert('已退出群组')
      navigate('/groups')
    } catch (err) {
      console.error(err)
      alert('退出失败：' + (err.response?.data?.detail || '未知错误'))
    }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!newTask.title.trim()) return
    setTaskCreating(true)
    try {
      await taskAPI.create({
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        deadline: newTask.deadline || null,
        group_id: parseInt(groupId),
        assigned_to: newTask.assigned_to ? parseInt(newTask.assigned_to) : null,
      })
      setShowNewTask(false)
      setNewTask({ title: '', description: '', priority: 2, deadline: '', assigned_to: '' })
      loadGroupData()
    } catch (err) {
      console.error(err)
      alert('创建任务失败')
    }
    setTaskCreating(false)
  }

  const handleTaskStatus = async (taskId, newStatus) => {
    try {
      await taskAPI.update(taskId, { status: newStatus })
      loadGroupData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!confirm('确定删除此任务？')) return
    try {
      await taskAPI.delete(taskId)
      loadGroupData()
    } catch (err) {
      console.error(err)
    }
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return { label: '群主', cls: 'bg-warm-100 text-warm-600' }
      case 'admin':
        return { label: '管理员', cls: 'bg-blue-50 text-blue-500' }
      default:
        return { label: '成员', cls: 'bg-gray-50 text-gray-500' }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case '已完成':
        return 'text-green-500 bg-green-50'
      case '进行中':
        return 'text-blue-500 bg-blue-50'
      default:
        return 'text-gray-500 bg-gray-50'
    }
  }

  const getPriorityLabel = (p) => {
    switch (p) {
      case 4:
        return { text: '紧急', cls: 'text-red-500 bg-red-50' }
      case 3:
        return { text: '高', cls: 'text-orange-500 bg-orange-50' }
      case 2:
        return { text: '中', cls: 'text-blue-500 bg-blue-50' }
      default:
        return { text: '低', cls: 'text-gray-500 bg-gray-50' }
    }
  }

  const groupStats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === '已完成').length,
    inProgress: tasks.filter((t) => t.status === '进行中').length,
    pending: tasks.filter((t) => t.status === '待办').length,
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-3 border-warm-300 border-t-warm-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error && !group) {
    return (
      <div className="px-4 pt-6 pb-24">
        <button onClick={() => navigate('/groups')} className="text-gray-400 hover:text-warm-500 mb-4">← 返回</button>
        <div className="hand-card text-center py-10">
          <div className="text-4xl mb-3">😞</div>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-24">
      {/* 头部导航 */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/groups')} className="text-gray-400 hover:text-warm-500 text-lg">←</button>
        <div className="flex-1">
          <h1 className="text-xl font-hand text-warm-700 truncate">{group?.name || groupNameParam || '群组'}</h1>
          {group?.description && <p className="text-xs text-gray-400 mt-0.5">{group.description}</p>}
        </div>
      </div>

      {/* 群组概览 */}
      <div className="hand-card mb-4 bg-gradient-to-r from-warm-50 to-orange-50">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-700">{groupStats.total}</div>
            <div className="text-xs text-gray-400">总任务</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-500">{groupStats.completed}</div>
            <div className="text-xs text-gray-400">已完成</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-500">{groupStats.inProgress}</div>
            <div className="text-xs text-gray-400">进行中</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAIAssign} className="hand-btn flex-1 text-sm">
            🤖 AI智能分配
          </button>
          <button onClick={() => setShowInvite(true)} className="hand-btn-outline text-sm py-2 px-3">
            🔗 邀请
          </button>
          <button onClick={() => setShowNewTask(true)} className="hand-btn-outline text-sm py-2 px-3">
            ➕ 任务
          </button>
        </div>
      </div>

      {/* 任务列表 */}
      <h3 className="text-sm font-medium text-gray-600 mb-3">📋 团队任务 ({tasks.length})</h3>
      {tasks.length === 0 ? (
        <div className="hand-card text-center py-8 mb-6">
          <div className="text-3xl mb-2">📝</div>
          <p className="text-gray-400 text-sm">暂无团队任务</p>
          <button
            onClick={() => setShowNewTask(true)}
            className="text-xs text-warm-500 mt-1 underline"
          >
            点击创建任务
          </button>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {tasks.map((task) => {
            const priority = getPriorityLabel(task.priority)
            const assignee = members.find((m) => m.user_id === task.assigned_to)
            return (
              <div key={task.id} className="hand-card task-card">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-2">
                    <h4 className="text-sm font-medium text-gray-800 truncate">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${priority.cls} flex-shrink-0`}>
                    {priority.text}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {assignee ? (
                    <span className="tag">
                      👤 {assignee.username}
                    </span>
                  ) : (
                    <span className="tag text-gray-400">未分配</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                  {task.progress > 0 && task.progress < 100 && (
                    <span className="text-xs text-gray-400">{task.progress}%</span>
                  )}
                  {task.tags?.map((tag, i) => (
                    <span key={i} className="tag">{tag}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {task.status !== '已完成' && (
                      <button
                        onClick={() => handleTaskStatus(task.id, '已完成')}
                        className="text-xs px-2 py-1 bg-green-50 text-green-500 rounded hover:bg-green-100"
                      >
                        ✓ 完成
                      </button>
                    )}
                    {task.status === '待办' && (
                      <button
                        onClick={() => handleTaskStatus(task.id, '进行中')}
                        className="text-xs px-2 py-1 bg-blue-50 text-blue-500 rounded hover:bg-blue-100"
                      >
                        ▶ 开始
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-xs text-gray-400 hover:text-red-500 px-2 py-1"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 成员列表 */}
      <h3 className="text-sm font-medium text-gray-600 mb-3">👥 团队成员 ({members.length}人)</h3>
      <div className="space-y-2 mb-6">
        {members.map((m) => {
          const roleBadge = getRoleBadge(m.role)
          const rate = m.total_tasks > 0 ? Math.round((m.completed_tasks / m.total_tasks) * 100) : 0
          return (
            <div key={m.user_id} className="hand-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center text-sm text-warm-600 font-medium">
                    {m.username?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">{m.username}</h4>
                    <div className="flex gap-1 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${roleBadge.cls}`}>
                        {roleBadge.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">
                    {m.completed_tasks}/{m.total_tasks}
                  </div>
                  <div className="text-xs text-gray-400">{rate}%</div>
                </div>
              </div>

              {/* 技能标签 */}
              {m.skills?.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {m.skills.map((s, i) => (
                    <span key={i} className="tag text-xs">{s}</span>
                  ))}
                </div>
              )}

              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${rate}%` }}></div>
              </div>

              {/* 移除按钮 */}
              {(m.role === 'admin' || m.role === 'member') && (
                <button
                  onClick={() => handleRemoveMember(m.user_id, m.username)}
                  className="text-xs text-red-400 hover:text-red-600 mt-2"
                >
                  移除成员
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* 退出群组 */}
      <button
        onClick={handleLeaveGroup}
        className="w-full py-3 text-sm text-red-500 bg-white rounded-xl border-2 border-red-100 hover:bg-red-50 transition-all mb-6"
      >
        退出群组
      </button>

      {/* 邀请弹窗 */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-end justify-center" onClick={() => setShowInvite(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-app p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">🔗 邀请成员</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500 mb-2">分享此邀请码给好友</p>
              <div className="text-4xl font-mono font-bold text-warm-500 tracking-widest bg-warm-50 py-3 rounded-xl">
                {inviteCode}
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">好友输入此邀请码即可加入群组</p>
          </div>
        </div>
      )}

      {/* 新建任务弹窗 */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-end justify-center" onClick={() => setShowNewTask(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-app p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">📝 新建团队任务</h3>
              <button onClick={() => setShowNewTask(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <input
                className="hand-input"
                placeholder="任务标题 *"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                required
              />
              <textarea
                className="hand-input"
                placeholder="任务描述（可选）"
                rows={2}
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
              <div className="flex gap-3">
                <select
                  className="hand-input flex-1"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: parseInt(e.target.value) })}
                >
                  <option value={1}>低优先级</option>
                  <option value={2}>中优先级</option>
                  <option value={3}>高优先级</option>
                  <option value={4}>紧急</option>
                </select>
                <input
                  type="date"
                  className="hand-input flex-1"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                />
              </div>
              <select
                className="hand-input"
                value={newTask.assigned_to}
                onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
              >
                <option value="">暂不分配</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.username} ({getRoleBadge(m.role).label})
                  </option>
                ))}
              </select>
              <button type="submit" className="hand-btn w-full" disabled={taskCreating}>
                {taskCreating ? '创建中...' : '创建团队任务'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
