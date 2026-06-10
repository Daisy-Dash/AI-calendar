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
      console.error('Failed to load invitations:', err)
    }
  }, [])

  useEffect(() => {
    loadInvitations()
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
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      if (accept) {
        alert('已成功加入团队！')
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
        <div key={inv.id} className="fixed inset-0 z-[200] flex items-center justify-center p-3 bg-transparent">
          <div className="bg-white rounded-3xl w-full max-w-sm max-h-[85vh] overflow-y-auto p-6 shadow-xl fade-in-up border border-cream-200">
            {/* 头部 */}
            <div className="text-center mb-5">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rosa-50 border border-rosa-100 flex items-center justify-center text-3xl mb-3">
                📨
              </div>
              <h2 className="text-lg font-medium text-choco-600">团队邀请</h2>
              <p className="text-sm text-choco-300 mt-1.5">
                <span className="text-rosa-400 font-medium">{inv.from_user}</span> 邀请你加入
                <span className="text-rosa-400 font-medium"> {inv.group_name}</span>
              </p>
              {inv.message && (
                <p className="text-xs text-choco-300 mt-2 bg-cream-50 rounded-xl p-2.5 border border-cream-200">
                  "{inv.message}"
                </p>
              )}
            </div>

            {/* 任务分配详情 */}
            {inv.task_assignments && inv.task_assignments.length > 0 && (
              <div className="hand-card mb-4 bg-gradient-to-r from-lilac-50 to-rosa-50 border-lilac-100">
                <h3 className="text-sm font-medium text-choco-500 mb-3 flex items-center gap-1.5">
                  <span>🤖</span> AI 已为你预分配以下任务
                </h3>
                <div className="space-y-2">
                  {inv.task_assignments.map((a, i) => (
                    <div key={i} className="bg-white rounded-xl p-3 border border-lilac-100">
                      <div className="flex items-start gap-2">
                        <span className="text-lg flex-shrink-0">📋</span>
                        <div>
                          <h4 className="text-sm font-medium text-choco-600">{a.task_title}</h4>
                          {a.subtask && (
                            <p className="text-xs text-lilac-400 mt-0.5">你的分工: {a.subtask}</p>
                          )}
                          {a.task_deadline && (
                            <p className="text-xs text-rosa-400 mt-1">⏰ 截止: {a.task_deadline}</p>
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
                className="flex-1 py-3 text-sm font-medium text-choco-300 bg-cream-100 rounded-2xl border border-cream-200 hover:bg-cream-200 transition-all active:scale-[0.98]"
              >
                拒绝
              </button>
              <button
                onClick={() => handleRespond(inv.id, true)}
                disabled={responding[inv.id]}
                className="flex-1 py-3 text-sm font-medium text-white rounded-2xl transition-all active:scale-[0.98] hand-btn"
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
