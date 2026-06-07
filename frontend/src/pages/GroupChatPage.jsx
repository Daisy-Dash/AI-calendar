import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { groupAPI, messageAPI, friendAPI, uploadAPI } from '../utils/api'

export default function GroupChatPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [friends, setFriends] = useState([])
  const [inviteCode, setInviteCode] = useState('')
  const [pendingTasks, setPendingTasks] = useState([])
  const [showTaskConfirm, setShowTaskConfirm] = useState(false)
  const [rejectReason, setRejectReason] = useState({})
  const [startingWorkflow, setStartingWorkflow] = useState(false)
  const [projectBrief, setProjectBrief] = useState('')
  const [showBriefInput, setShowBriefInput] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    loadGroup()
    loadMessages()
    loadPendingTasks()
  }, [groupId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadGroup = async () => {
    try {
      const res = await groupAPI.getDetail(parseInt(groupId))
      setGroup(res.data)
    } catch (e) {
      console.error(e)
      navigate('/')
    }
  }

  const loadMessages = async () => {
    try {
      const res = await messageAPI.getGroupMessages(parseInt(groupId))
      setMessages(res.data)
    } catch (e) { console.error(e) }
  }

  const loadPendingTasks = async () => {
    try {
      const res = await groupAPI.getPendingTasks(parseInt(groupId))
      setPendingTasks(res.data)
      if (res.data.length > 0) setShowTaskConfirm(true)
    } catch (e) { console.error(e) }
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)

    try {
      const res = await messageAPI.sendGroupMessage(parseInt(groupId), { content })
      setMessages(prev => [...prev, res.data.message])
      if (res.data.ai_reply) {
        setTimeout(() => {
          setMessages(prev => [...prev, res.data.ai_reply])
        }, 500)
      }
    } catch (e) {
      console.error(e)
    }
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const openInvite = async () => {
    setShowInvite(true)
    try {
      const [friendRes, inviteRes] = await Promise.all([
        friendAPI.list(),
        groupAPI.invite({ group_id: parseInt(groupId) }),
      ])
      setFriends(friendRes.data)
      setInviteCode(inviteRes.data.invite_code)
    } catch (e) { console.error(e) }
  }

  const inviteFriend = async (friendId, email) => {
    try {
      await groupAPI.inviteByEmail({ group_id: parseInt(groupId), email })
      setFriends(prev => prev.map(f => f.id === friendId ? { ...f, invited: true } : f))
    } catch (e) {
      alert(e.response?.data?.detail || '邀请失败')
    }
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    setUploading(true)
    try {
      const res = await uploadAPI.uploadFiles(files)
      const newFiles = res.data.files.map(f => ({
        name: f.filename,
        text: f.extracted_text || '',
        error: f.error || null,
      }))
      setUploadedFiles(prev => [...prev, ...newFiles])
      // 自动将提取的文本附加到 projectBrief
      const extraText = res.data.combined_text
      if (extraText) {
        setProjectBrief(prev => prev ? prev + '\n\n---附件内容---\n' + extraText : extraText)
      }
    } catch (err) {
      alert('文件上传失败: ' + (err.response?.data?.detail || err.message))
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeUploadedFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleStartWorkflow = async () => {
    setStartingWorkflow(true)
    try {
      await groupAPI.startWorkflow(parseInt(groupId), {
        project_brief: projectBrief || group?.description || '',
      })
      await loadMessages()
      await loadPendingTasks()
      await loadGroup()
      setShowBriefInput(false)
      setUploadedFiles([])
    } catch (e) {
      alert(e.response?.data?.detail || '启动失败')
    }
    setStartingWorkflow(false)
  }

  const handleConfirmTask = async (taskId, accept) => {
    try {
      await groupAPI.confirmTask(parseInt(groupId), taskId, {
        accept,
        reason: rejectReason[taskId] || '',
      })
      setPendingTasks(prev => prev.filter(t => t.id !== taskId))
      await loadMessages()
      if (pendingTasks.length <= 1) {
        setShowTaskConfirm(false)
        await loadGroup()
      }
    } catch (e) {
      alert(e.response?.data?.detail || '操作失败')
    }
  }

  if (!group) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-5xl animate-float">🧁</div>
    </div>
  )

  const isOwner = group.created_by === user?.id
  const isGathering = group.status === 'gathering' || !group.status

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b-[1.5px] border-cream-300 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-rosa-400 text-lg">←</button>
          <div>
            <h1 className="text-base font-medium text-choco-600">{group.name}</h1>
            <p className="text-xs text-choco-200">{group.member_count || 0} 位成员 · AI统筹组长</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={openInvite} className="w-8 h-8 rounded-full bg-sage-50 border border-sage-100 flex items-center justify-center text-sm">+</button>
          <button onClick={() => setShowInfo(!showInfo)} className="w-8 h-8 rounded-full bg-cream-100 border border-cream-200 flex items-center justify-center text-sm">⋯</button>
        </div>
      </div>

      {/* 群信息面板 */}
      {showInfo && (
        <div className="px-4 py-3 bg-cream-50 border-b border-cream-200 space-y-2 fade-in-up">
          <div className="flex items-center justify-between">
            <span className="text-xs text-choco-400 font-medium">群号</span>
            <span className="text-xs text-rosa-400 font-mono">{group.invite_code}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-choco-400 font-medium">状态</span>
            <span className="text-xs text-lilac-400">
              {group.status === 'gathering' ? '📢 召集中' :
               group.status === 'confirming' ? '✋ 待确认' :
               group.status === 'in_progress' ? '🚀 进行中' :
               group.status === 'completed' ? '✅ 已完成' : '📢 召集中'}
            </span>
          </div>
          <p className="text-xs text-choco-300 font-medium">成员</p>
          <div className="flex flex-wrap gap-2">
            {group.members?.map(m => (
              <div key={m.user_id} className="flex items-center gap-1 px-2 py-1 bg-white rounded-full border border-cream-200 text-xs">
                <span>{m.avatar || '🧁'}</span>
                <span className="text-choco-500">{m.username}</span>
                {m.role === 'owner' && <span className="text-rosa-300 text-[10px]">群主</span>}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => navigate(`/kanban/${groupId}`)} className="flex-1 py-1.5 rounded-full text-xs bg-lilac-50 text-lilac-400 border border-lilac-100">
              看板
            </button>
          </div>
        </div>
      )}

      {/* 人齐启动横幅 - 只有群主在gathering状态才能看到 */}
      {isOwner && isGathering && (
        <div className="px-4 py-3 bg-gradient-to-r from-rosa-50 to-lilac-50 border-b border-cream-200 fade-in-up">
          {!showBriefInput ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <div>
                  <p className="text-sm font-medium text-choco-600">人齐了吗？</p>
                  <p className="text-[10px] text-choco-200">点击启动AI分解任务流程</p>
                </div>
              </div>
              <button
                onClick={() => setShowBriefInput(true)}
                className="hand-btn text-xs py-2 px-4"
              >
                人齐了，开始吧！
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-choco-400 font-medium">📝 简要描述项目需求（帮助AI更好地分解任务）</p>
              <textarea
                className="hand-input text-sm resize-none"
                rows={3}
                placeholder="例如：信息设计课程大作业，需要做一个手机App的原型设计，包括用户研究、交互设计、视觉设计和可用性测试..."
                value={projectBrief}
                onChange={e => setProjectBrief(e.target.value)}
                autoFocus
              />

              {/* 文件上传区域 */}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-white border border-cream-200 text-choco-400 hover:bg-cream-50 transition-all"
                >
                  {uploading ? (
                    <><span className="animate-spin">⏳</span> 解析中...</>
                  ) : (
                    <><span>📎</span> 上传附件</>
                  )}
                </button>
                <span className="text-[10px] text-choco-200">支持 图片/PDF/Word/PPT</span>
              </div>

              {/* 已上传文件列表 */}
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {uploadedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-sage-100 text-[11px]">
                      <span>{f.error ? '❌' : '✅'}</span>
                      <span className="text-choco-500 max-w-[120px] truncate">{f.name}</span>
                      <button onClick={() => removeUploadedFile(i)} className="text-choco-200 hover:text-rosa-400 ml-0.5">×</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowBriefInput(false); setUploadedFiles([]) }}
                  className="flex-1 py-2 rounded-xl text-xs text-choco-300 bg-cream-100 border border-cream-200"
                >
                  返回
                </button>
                <button
                  onClick={handleStartWorkflow}
                  disabled={startingWorkflow || uploading}
                  className="flex-1 hand-btn text-xs py-2"
                >
                  {startingWorkflow ? '🤖 AI分解中...' : '🚀 启动！'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 fade-in-up">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-sm text-choco-400 font-medium">欢迎来到「{group.name}」</p>
            <p className="text-xs text-choco-200 mt-1">输入 @ai + 任意问题，自然语言交流</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {['@ai 帮我们分析一下项目怎么分工', '@ai 目前进度如何？', '@ai 给我们一些建议'].map(hint => (
                <button key={hint} onClick={() => { setInput(hint) }}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-cream-100 border border-cream-200 text-choco-300 hover:bg-rosa-50 transition-all">
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${!msg.is_ai && msg.sender?.id === user?.id ? 'justify-end' : 'justify-start'} fade-in-up`}>
            {msg.is_ai && (
              <div className="w-8 h-8 rounded-full bg-rosa-50 border border-rosa-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                🤖
              </div>
            )}
            {!msg.is_ai && msg.sender?.id !== user?.id && (
              <div className="w-8 h-8 rounded-full bg-lilac-50 border border-lilac-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                {msg.sender?.avatar || '🧁'}
              </div>
            )}
            <div className="max-w-[80%]">
              {(msg.is_ai || msg.sender?.id !== user?.id) && (
                <p className="text-[10px] text-choco-200 mb-1 ml-1">
                  {msg.is_ai ? 'AI 统筹组长' : msg.sender?.username}
                </p>
              )}
              <div className={
                msg.is_ai ? 'ai-bubble' :
                msg.sender?.id === user?.id ? 'user-bubble' :
                'bg-white rounded-2xl p-3 border border-cream-200'
              }>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
              <p className="text-[10px] text-choco-100 mt-0.5 ml-1">
                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
              </p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start fade-in-up">
            <div className="w-8 h-8 rounded-full bg-rosa-50 border border-rosa-100 flex items-center justify-center text-sm mr-2 flex-shrink-0">
              🤖
            </div>
            <div className="ai-bubble">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-rosa-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-lilac-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-sage-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 输入栏 */}
      <div className="px-4 py-3 bg-white border-t-[1.5px] border-cream-300">
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setInput(prev => prev.startsWith('@ai ') ? prev : '@ai ' + prev)}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 border transition-all ${
              input.toLowerCase().startsWith('@ai') ? 'bg-rosa-100 border-rosa-200 text-rosa-500' : 'bg-cream-50 border-cream-200 text-choco-300'
            }`}
            title="点击召唤AI"
          >
            🤖
          </button>
          <input
            className="hand-input flex-1 text-sm"
            placeholder="输入消息，@ai 可自然语言提问..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            className="hand-btn text-sm py-2 px-5 flex-shrink-0"
            disabled={!input.trim() || sending}
          >
            {sending ? '...' : '发送'}
          </button>
        </div>
      </div>

      {/* 邀请好友弹窗 */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/25 z-[200] flex items-end justify-center" onClick={() => setShowInvite(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-[430px] p-5 pb-8 fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-cream-300 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-medium text-choco-600 mb-1">邀请成员</h3>
            <p className="text-xs text-choco-200 mb-4">拉好友入群或分享群号</p>

            <div className="hand-card bg-cream-50 mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-choco-300">群号（邀请码）</p>
                <p className="text-lg font-mono font-bold text-rosa-400 mt-1">{inviteCode}</p>
              </div>
              <button
                onClick={() => { navigator.clipboard?.writeText(inviteCode); alert('已复制邀请码') }}
                className="hand-btn-outline text-xs py-1.5 px-3"
              >
                复制
              </button>
            </div>

            <p className="text-xs text-choco-400 font-medium mb-2">从好友中邀请</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {friends.length === 0 ? (
                <p className="text-center text-xs text-choco-200 py-4">还没有好友，先去添加好友吧</p>
              ) : (
                friends.map(f => {
                  const isMember = group.members?.some(m => m.user_id === f.id)
                  return (
                    <div key={f.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-cream-50">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{f.avatar || '🧁'}</span>
                        <div>
                          <p className="text-sm text-choco-500">{f.username}</p>
                          <p className="text-[10px] text-choco-200">{f.email}</p>
                        </div>
                      </div>
                      {isMember ? (
                        <span className="text-xs text-sage-400">已在群中</span>
                      ) : f.invited ? (
                        <span className="text-xs text-caramel-400">已邀请</span>
                      ) : (
                        <button onClick={() => inviteFriend(f.id, f.email)} className="text-xs text-white bg-rosa-300 px-3 py-1 rounded-full">
                          邀请
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 任务确认弹窗 */}
      {showTaskConfirm && pendingTasks.length > 0 && (
        <div className="fixed inset-0 bg-black/25 z-[200] flex items-end justify-center" onClick={() => setShowTaskConfirm(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-[430px] p-5 pb-8 fade-in-up max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-cream-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="text-lg font-medium text-choco-600">确认你的任务</h3>
                <p className="text-xs text-choco-200">AI已为你分配了以下任务，请确认</p>
              </div>
            </div>

            <div className="space-y-3">
              {pendingTasks.map(task => (
                <div key={task.id} className="hand-card border-lilac-100">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg flex-shrink-0">📌</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-choco-600">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-choco-200 mt-0.5">{task.description}</p>
                      )}
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 ${
                        task.priority === '高' ? 'bg-rosa-50 text-rosa-400' :
                        task.priority === '中' ? 'bg-dusty-50 text-dusty-400' :
                        'bg-sage-50 text-sage-400'
                      }`}>
                        {task.priority}优先级
                      </span>
                    </div>
                  </div>

                  <textarea
                    className="hand-input text-xs mb-2 resize-none"
                    rows={1}
                    placeholder="有异议？写下原因..."
                    value={rejectReason[task.id] || ''}
                    onChange={e => setRejectReason(prev => ({ ...prev, [task.id]: e.target.value }))}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirmTask(task.id, false)}
                      className="flex-1 py-2 rounded-xl text-xs text-choco-300 bg-cream-100 border border-cream-200 active:scale-[0.98]"
                    >
                      打回重分
                    </button>
                    <button
                      onClick={() => handleConfirmTask(task.id, true)}
                      className="flex-1 py-2 rounded-xl text-xs text-white bg-sage-400 active:scale-[0.98]"
                      style={{ boxShadow: '0 2px 0 #6F8F66' }}
                    >
                      确认接受
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
