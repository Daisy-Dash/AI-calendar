import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { groupAPI, taskAPI } from '../utils/api'

export default function GroupPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', inviteCode: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [groupsRes, tasksRes] = await Promise.all([
        groupAPI.list(),
        taskAPI.list(),
      ])
      setGroups(groupsRes.data)
      setTasks(tasksRes.data)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('加载数据失败，请检查后端是否启动')
    }
    setLoading(false)
  }

  const createGroup = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setError('')
    try {
      const res = await groupAPI.create({ name: form.name, description: form.description })
      setGroups([...groups, res.data])
      setShowCreate(false)
      setForm({ name: '', description: '', inviteCode: '' })
      alert(`🎉 群组创建成功！邀请码：${res.data.invite_code}`)
    } catch (err) {
      console.error(err)
      setError('创建失败，请重试')
    }
  }

  const joinGroup = async (e) => {
    e.preventDefault()
    if (!form.inviteCode.trim()) return
    setError('')
    try {
      await groupAPI.respond({ invite_code: form.inviteCode.toUpperCase(), accept: true })
      alert('🎉 成功加入群组！')
      setShowJoin(false)
      setForm({ name: '', description: '', inviteCode: '' })
      loadData()
    } catch (err) {
      console.error(err)
      setError('加入失败，请检查邀请码是否正确')
    }
  }

  // 群组任务统计
  const getGroupTaskCount = (groupId) => {
    const groupTasks = tasks.filter((t) => t.group_id === groupId)
    const completed = groupTasks.filter((t) => t.status === '已完成').length
    return { total: groupTasks.length, completed }
  }

  const totalGroupTasks = tasks.filter((t) => t.group_id).length
  const completedGroupTasks = tasks.filter((t) => t.group_id && t.status === '已完成').length

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-hand text-warm-700">👥 团队协作</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setError(''); setShowJoin(true) }}
            className="hand-btn-outline text-sm py-1.5 px-3"
          >
            🔗 加入
          </button>
          <button
            onClick={() => { setError(''); setShowCreate(true) }}
            className="hand-btn text-sm py-1.5 px-3"
          >
            ➕ 创建
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* 创建群组弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-end justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-app p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">创建群组</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={createGroup} className="space-y-3">
              <input
                className="hand-input"
                placeholder="群组名称 *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <textarea
                className="hand-input"
                placeholder="群组描述（可选）"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <button type="submit" className="hand-btn w-full">创建群组</button>
            </form>
          </div>
        </div>
      )}

      {/* 加入群组弹窗 */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-end justify-center" onClick={() => setShowJoin(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-app p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">加入群组</h3>
              <button onClick={() => setShowJoin(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={joinGroup} className="space-y-3">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">输入邀请码</label>
                <input
                  className="hand-input text-lg font-mono tracking-widest text-center"
                  placeholder="ABC123"
                  value={form.inviteCode}
                  onChange={(e) => setForm({ ...form, inviteCode: e.target.value.toUpperCase() })}
                  maxLength={6}
                  required
                />
              </div>
              <button type="submit" className="hand-btn w-full">加入群组</button>
            </form>
          </div>
        </div>
      )}

      {/* 群组列表 */}
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block w-8 h-8 border-2 border-warm-300 border-t-warm-500 rounded-full animate-spin"></div>
        </div>
      ) : groups.length > 0 ? (
        <div className="space-y-3 mb-6">
          {groups.map((g) => {
            const stats = getGroupTaskCount(g.id)
            return (
              <div
                key={g.id}
                className="hand-card cursor-pointer hover:shadow-hand-lg transition-all"
                onClick={() => navigate(`/groups/manage?groupId=${g.id}&groupName=${encodeURIComponent(g.name)}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 truncate">{g.name}</h3>
                    {g.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{g.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 ml-3">
                    <span>📋 {stats.total}</span>
                    <span className="text-green-500">✓ {stats.completed}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-warm-50">
                  <span className="text-xs text-gray-400">
                    邀请码：
                    <span className="text-warm-500 font-mono font-medium">{g.invite_code}</span>
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <span>👥 {g.member_count || 0}人</span>
                    <span className="ml-2 tag">进入管理 ›</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="hand-card text-center py-10 mb-6">
          <div className="text-4xl mb-3">🤝</div>
          <p className="text-gray-400 text-sm mb-3">还没有加入任何团队</p>
          <p className="text-xs text-gray-300">创建团队或输入邀请码加入</p>
        </div>
      )}

      {/* 群组任务概览 */}
      {totalGroupTasks > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-3">📋 团队任务概览</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="hand-card text-center">
              <div className="text-2xl font-bold text-warm-500">{totalGroupTasks}</div>
              <div className="text-xs text-gray-400">总任务</div>
            </div>
            <div className="hand-card text-center">
              <div className="text-2xl font-bold text-green-500">{completedGroupTasks}</div>
              <div className="text-xs text-gray-400">已完成</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
