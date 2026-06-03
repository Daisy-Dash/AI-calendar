import { useState, useEffect, useCallback } from 'react'
import { groupAPI } from '../utils/api'

export default function InvitationPopup() {
  const [invitations, setInvitations] = useState([])
  const [feedback, setFeedback] = useState({})
  const [responding, setResponding] = useState({})

  const loadInvitations = useCallback(async () => {
    try {
      const res = await groupAPI.pendingInvitations()
      const data = Array.isArray(res.data) ? res.data : []
      setInvitations(data)
    } catch (err) {
      // 静默失败，避免刷屏
      console.error('Failed to load invitations:', err)
    }
  }, [])

  useEffect(() => {
    loadInvitations()
    // 每10秒检查一次
    const timer = setInterval(loadInvitations, 10000)
    return () => clearInterval(timer)
  }, [loadInvitations])

  const handleRespond = async (invitationId, accept) => {
    setResponding(prev => ({ ...prev, [invitationId]: true }))
    try {
      await groupAPI.respondInvitation(invitationId, {
        accept,
        feedback: accept ? '' : (feedback[invitationId] || ''),
      })
      // 从列表中移除
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      if (accept) {
        alert('已成功加入团队！')
        // 刷新页面以更新团队列表
        window.location.reload()
      }
    } catch (err) {
      alert('操作失败: ' + (err.response?.data?.detail || '请重试'))
    }
    setResponding(prev => ({ ...prev, [invitationId]: false }))
  }

  if (invitations.length === 0) return null

  return (
    <>
      {invitations.map(inv => (
        <div key={inv.id} className="fixed inset-0 bg-black/30 z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto p-6 shadow-2xl fade-in-up">
            {/* 头部 */}
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">📨</div>
              <h2 className="text-lg font-hand text-warm-700">团队邀请</h2>
              <p className="text-sm text-gray-500 mt-1">
                <strong>{inv.from_user}</strong> 邀请你加入 <strong>{inv.group_name}</strong>
              </p>
              {inv.message && (
                <p className="text-xs text-gray-400 mt-2 bg-warm-50 rounded-lg p-2">
                  "{inv.message}"
                </p>
              )}
            </div>

            {/* 任务分配详情 */}
            {inv.task_assignments && inv.task_assignments.length > 0 && (
              <div className="hand-card mb-4 bg-gradient-to-r from-blue-50 to-purple-50">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  🤖 AI 已为你预分配以下任务
                </h3>
                <div className="space-y-2">
                  {inv.task_assignments.map((a, i) => (
                    <div key={i} className="bg-white rounded-xl p-3 border border-purple-100">
                      <div className="flex items-start gap-2">
                        <span className="text-lg flex-shrink-0">📋</span>
                        <div>
                          <h4 className="text-sm font-medium text-gray-800">{a.task_title}</h4>
                          {a.subtask && (
                            <p className="text-xs text-purple-500 mt-0.5">你的分工: {a.subtask}</p>
                          )}
                          {a.task_deadline && (
                            <p className="text-xs text-red-400 mt-1">⏰ 截止: {a.task_deadline}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 拒绝反馈 */}
            <div className="mb-4">
              <textarea
                className="hand-input text-sm"
                placeholder="如果不接受，可以写原因帮助组长调整..."
                rows={2}
                value={feedback[inv.id] || ''}
                onChange={e => setFeedback(prev => ({ ...prev, [inv.id]: e.target.value }))}
              />
            </div>

            {/* 按钮 */}
            <div className="flex gap-3">
              <button
                onClick={() => handleRespond(inv.id, false)}
                disabled={responding[inv.id]}
                className="flex-1 py-3 text-sm font-medium text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
              >
                拒绝
              </button>
              <button
                onClick={() => handleRespond(inv.id, true)}
                disabled={responding[inv.id]}
                className="flex-1 py-3 text-sm font-medium text-white bg-gradient-to-r from-warm-400 to-warm-500 rounded-xl hover:shadow-lg transition-all"
              >
                {responding[inv.id] ? '处理中...' : '同意加入'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
