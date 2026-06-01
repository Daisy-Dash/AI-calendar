import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { taskAPI } from '../utils/api'

export default function GroupManagePage() {
  const navigate = useNavigate()
  const [members, setMembers] = useState([
    { id: 1, name: '你', role: 'owner', skills: ['项目管理', '设计'], tasks: 5, completed: 3 },
    { id: 2, name: '张三', role: 'admin', skills: ['前端', 'UI设计'], tasks: 4, completed: 2 },
    { id: 3, name: '李四', role: 'member', skills: ['后端', '数据库'], tasks: 3, completed: 1 },
    { id: 4, name: '王五', role: 'member', skills: ['测试', '文档'], tasks: 2, completed: 2 },
  ])

  const [showAssign, setShowAssign] = useState(false)

  const handleAIAssign = async () => {
    try {
      await taskAPI.assign({ task_id: 1, group_id: 1 })
      alert('🤖 AI分配完成！')
    } catch (err) {
      alert('🎯 AI智能分配建议已生成！（模拟）')
    }
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/groups')} className="text-gray-400 hover:text-warm-500">←</button>
        <h1 className="text-xl font-hand text-warm-700">设计组</h1>
      </div>

      {/* 群组概览 */}
      <div className="hand-card mb-4 bg-gradient-to-r from-warm-50 to-orange-50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400">邀请码</p>
            <p className="text-lg font-mono font-bold text-warm-500">ABC123</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">成员</p>
            <p className="text-lg font-bold text-gray-700">{members.length}人</p>
          </div>
        </div>
        <button onClick={handleAIAssign} className="hand-btn w-full text-sm">
          🤖 AI智能分配任务
        </button>
      </div>

      {/* 成员列表 */}
      <h3 className="text-sm font-medium text-gray-600 mb-3">👥 成员列表</h3>
      <div className="space-y-2 mb-6">
        {members.map((m) => {
          const rate = m.tasks > 0 ? Math.round((m.completed / m.tasks) * 100) : 0
          return (
            <div key={m.id} className="hand-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center text-sm text-warm-600 font-medium">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">{m.name}</h4>
                    <div className="flex gap-1 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        m.role === 'owner' ? 'bg-warm-100 text-warm-600' :
                        m.role === 'admin' ? 'bg-blue-50 text-blue-500' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {m.role === 'owner' ? '群主' : m.role === 'admin' ? '管理员' : '成员'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{m.completed}/{m.tasks}</div>
                  <div className="text-xs text-gray-400">{rate}%</div>
                </div>
              </div>
              {/* 技能标签 */}
              <div className="flex gap-1 flex-wrap">
                {m.skills.map((s, i) => <span key={i} className="tag">{s}</span>)}
              </div>
              <div className="progress-bar mt-2">
                <div className="progress-fill" style={{ width: `${rate}%` }}></div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 快速操作 */}
      <div className="hand-card">
        <h3 className="text-sm font-medium text-gray-600 mb-3">⚡ 快速操作</h3>
        <div className="space-y-2">
          <button className="w-full text-left p-3 rounded-xl bg-warm-50 text-sm text-gray-700 hover:bg-warm-100 transition-all">
            👤 邀请成员
          </button>
          <button className="w-full text-left p-3 rounded-xl bg-warm-50 text-sm text-gray-700 hover:bg-warm-100 transition-all">
            📋 查看团队任务
          </button>
          <button className="w-full text-left p-3 rounded-xl bg-warm-50 text-sm text-gray-700 hover:bg-warm-100 transition-all">
            📊 团队统计
          </button>
        </div>
      </div>
    </div>
  )
}
