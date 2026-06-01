import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { groupAPI, taskAPI } from '../utils/api'

export default function GroupPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', inviteCode: '' })
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    loadGroups()
    loadTasks()
  }, [])

  const loadGroups = () => {
    // 从localStorage获取群组信息
    const saved = localStorage.getItem('groups')
    if (saved) setGroups(JSON.parse(saved))
  }

  const loadTasks = async () => {
    try {
      const res = await taskAPI.list()
      setTasks(res.data)
    } catch (err) { console.error(err) }
  }

  const createGroup = async (e) => {
    e.preventDefault()
    try {
      const res = await groupAPI.create({ name: form.name, description: form.description })
      const newGroup = res.data
      const updated = [...groups, newGroup]
      setGroups(updated)
      localStorage.setItem('groups', JSON.stringify(updated))
      setShowCreate(false)
      setForm({ name: '', description: '', inviteCode: '' })
      alert(`🎉 群组创建成功！邀请码：${newGroup.invite_code}`)
    } catch (err) {
      console.error(err)
    }
  }

  const joinGroup = async (e) => {
    e.preventDefault()
    try {
      await groupAPI.respond({ invite_code: form.inviteCode, accept: true })
      alert('🎉 成功加入群组！')
      setShowJoin(false)
      setForm({ name: '', description: '', inviteCode: '' })
    } catch (err) {
      alert('加入失败，请检查邀请码是否正确')
    }
  }

  const groupTasks = tasks.filter(t => t.group_id)
  const completedGroupTasks = groupTasks.filter(t => t.status === '已完成')

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-hand text-warm-700">👥 团队协作</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(true)} className="hand-btn-outline text-sm py-1.5 px-3">🔗 加入</button>
          <button onClick={() => setShowCreate(true)} className="hand-btn text-sm py-1.5 px-3">➕ 创建</button>
        </div>
      </div>

      {/* 创建群组弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-end justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-app p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-4">创建群组</h3>
            <form onSubmit={createGroup} className="space-y-3">
              <input className="hand-input" placeholder="群组名称" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              <textarea className="hand-input" placeholder="群组描述（可选）" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              <button type="submit" className="hand-btn w-full">创建群组</button>
            </form>
          </div>
        </div>
      )}

      {/* 加入群组弹窗 */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-end justify-center" onClick={() => setShowJoin(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-app p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-4">加入群组</h3>
            <form onSubmit={joinGroup} className="space-y-3">
              <input className="hand-input" placeholder="输入6位邀请码" value={form.inviteCode} onChange={e => setForm({...form, inviteCode: e.target.value})} required />
              <button type="submit" className="hand-btn w-full">加入群组</button>
            </form>
          </div>
        </div>
      )}

      {/* 群组列表 */}
      {groups.length > 0 ? (
        <div className="space-y-3 mb-6">
          {groups.map((g) => (
            <div key={g.id} className="hand-card cursor-pointer hover:shadow-hand-lg transition-all" onClick={() => navigate('/groups/manage')}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800">{g.name}</h3>
                  {g.description && <p className="text-xs text-gray-400 mt-0.5">{g.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm">📋 {groupTasks.length}</span>
                  <span className="text-sm text-green-500">✓ {completedGroupTasks.length}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-warm-50">
                <span className="text-xs text-gray-400">邀请码：<span className="text-warm-500 font-mono">{g.invite_code}</span></span>
                <span className="tag">👥 成员管理</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="hand-card text-center py-10 mb-6">
          <div className="text-4xl mb-3">🤝</div>
          <p className="text-gray-400 text-sm mb-3">还没有加入任何团队</p>
          <p className="text-xs text-gray-300">创建团队或输入邀请码加入</p>
        </div>
      )}

      {/* 群组任务概览 */}
      {groupTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-3">📋 团队任务</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="hand-card text-center">
              <div className="text-2xl font-bold text-warm-500">{groupTasks.length}</div>
              <div className="text-xs text-gray-400">总任务</div>
            </div>
            <div className="hand-card text-center">
              <div className="text-2xl font-bold text-green-500">{completedGroupTasks.length}</div>
              <div className="text-xs text-gray-400">已完成</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
