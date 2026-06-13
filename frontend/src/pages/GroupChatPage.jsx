import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { groupAPI, messageAPI, friendAPI, uploadAPI, aiAPI, taskAPI } from '../utils/api'
import MarkdownText from '../components/MarkdownText'

function CakieChatAsset({ src, alt, fallback, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <span className={`cakie-chat-asset-fallback ${className}`}>{fallback}</span>
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
}

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
  const [showProgress, setShowProgress] = useState(false)
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
  const [groupStats, setGroupStats] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showSearchPanel, setShowSearchPanel] = useState(true)
  const [showKnowledge, setShowKnowledge] = useState(false)
  const [knowledgeFiles, setKnowledgeFiles] = useState([])
  const [chatUploading, setChatUploading] = useState(false)
  const [showMyTasks, setShowMyTasks] = useState(false)
  const [myGroupTasks, setMyGroupTasks] = useState([])
  const [showTaskList, setShowTaskList] = useState(false)
  const [allGroupTasks, setAllGroupTasks] = useState([])
  const [showMenu, setShowMenu] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [showProposalInput, setShowProposalInput] = useState(false)
  const [proposalText, setProposalText] = useState('')
  const [submittingProposal, setSubmittingProposal] = useState(false)
  const [proofUploadingTaskId, setProofUploadingTaskId] = useState(null)
  const [showCakeGathering, setShowCakeGathering] = useState(false)
  const fileInputRef = useRef(null)
  const chatFileRef = useRef(null)
  const proofFileRef = useRef(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    loadGroup()
    loadMessages()
    loadPendingTasks()
    loadGroupStats()
    loadKnowledgeFiles()
    loadMyTasks()
    loadSearchResults()
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

  const loadGroupStats = async () => {
    try {
      const res = await groupAPI.getStats(parseInt(groupId))
      setGroupStats(res.data)
    } catch (e) { console.error(e) }
  }

  const loadKnowledgeFiles = async () => {
    try {
      const res = await messageAPI.getKnowledgeFiles(parseInt(groupId))
      setKnowledgeFiles(res.data)
    } catch (e) { console.error(e) }
  }

  const loadMyTasks = async () => {
    try {
      const res = await taskAPI.list({ group_id: parseInt(groupId) })
      const tasks = res.data || []
      const sortByDDL = (a, b) => {
        if (!a.deadline && !b.deadline) return 0
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline) - new Date(b.deadline)
      }
      // 我的任务（含所有 AI 拆出的提交节点），按 DDL 升序
      const mine = tasks
        .filter(t => t.assigned_to === user?.id)
        .sort(sortByDDL)
      setMyGroupTasks(mine)
      // 团队全部任务（含所有人 + 所有提交节点），按 DDL 升序
      const all = [...tasks].sort(sortByDDL)
      setAllGroupTasks(all)
    } catch (e) { console.error(e) }
  }

  const loadSearchResults = async () => {
    try {
      const res = await groupAPI.getSearchResults(parseInt(groupId))
      if (res.data?.length > 0) setSearchResults(res.data)
    } catch {}
  }

  const saveSearchResults = async (results) => {
    try { await groupAPI.saveSearchResults(parseInt(groupId), results) } catch {}
  }

  const handleChatFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setChatUploading(true)
    try {
      const res = await messageAPI.uploadKnowledgeFile(parseInt(groupId), file)
      await loadMessages()
      await loadKnowledgeFiles()
    } catch (err) {
      alert('上传失败: ' + (err.response?.data?.detail || err.message))
    }
    setChatUploading(false)
    if (chatFileRef.current) chatFileRef.current.value = ''
  }

  const handleTaskProofUpload = async (e) => {
    const file = e.target.files?.[0]
    const taskId = proofUploadingTaskId
    if (!file || !taskId) return
    try {
      const res = await taskAPI.uploadProof(taskId, file)
      // 后端会自动往群聊里同步凭证消息和进度消息
      await loadMessages()
      await loadMyTasks()
      await loadGroupStats()
      alert(`✅ 凭证上传成功！\n进度更新为 ${res.data.new_progress}%`)
    } catch (err) {
      alert('上传失败: ' + (err.response?.data?.detail || err.message))
    }
    setProofUploadingTaskId(null)
    if (proofFileRef.current) proofFileRef.current.value = ''
  }

  const triggerTaskProofUpload = (taskId) => {
    setProofUploadingTaskId(taskId)
    setTimeout(() => proofFileRef.current?.click(), 50)
  }

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await taskAPI.update(taskId, { status: newStatus })
      loadMyTasks()
      loadGroupStats()
      // 在群聊中通知
      await messageAPI.sendGroupMessage(parseInt(groupId), {
        content: `@ai 我已将任务状态更新为「${newStatus}」`,
      })
      await loadMessages()
    } catch (e) {
      alert('更新失败')
    }
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
      // 发送后刷新进度
      loadGroupStats()
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
    setInviteError('')
    try {
      await groupAPI.inviteByEmail({ group_id: parseInt(groupId), email })
      setFriends(prev => prev.map(f => f.id === friendId ? { ...f, invited: true } : f))
    } catch (e) {
      const msg = e.response?.data?.detail || '邀请失败'
      setInviteError(msg)
      setTimeout(() => setInviteError(''), 4000)
    }
  }

  // 存储附件提取的文本(不放进textarea，作为AI分析的隐藏上下文)
  const [fileContext, setFileContext] = useState('')

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
      // 附件文本作为隐藏上下文传给AI，不塞进textarea
      const extraText = res.data.combined_text
      if (extraText) {
        setFileContext(prev => prev ? prev + '\n\n' + extraText : extraText)
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
      // 合并用户描述 + 附件提取内容，一起发给AI分析
      let brief = projectBrief || group?.description || ''
      if (fileContext) {
        brief += '\n\n【附件内容（AI请仔细阅读分析）】\n' + fileContext
      }
      await groupAPI.startWorkflow(parseInt(groupId), {
        project_brief: brief,
      })
      await loadMessages()
      await loadGroup()  // 状态会变成 discussing
      setShowBriefInput(false)
      setUploadedFiles([])

      // 启动后立即联网搜索参考案例（AI 解释和案例平行进行，提供给小组讨论参考）
      setSearching(true)
      try {
        const searchRes = await aiAPI.searchChat({
          message: `请围绕项目「${(group?.name || '')}」帮我搜索一些可参考的案例、竞品和最佳实践。项目描述：${brief.slice(0, 200)}`,
          context: `项目名称：${group?.name}，项目描述：${brief.slice(0, 300)}`,
        })
        if (searchRes.data?.search_results?.length > 0) {
          setSearchResults(searchRes.data.search_results)
          saveSearchResults(searchRes.data.search_results)
        }
        if (searchRes.data?.reply) {
          await loadMessages()
        }
      } catch (e) {
        console.error('搜索失败:', e)
      }
      setSearching(false)
    } catch (e) {
      alert(e.response?.data?.detail || '启动失败')
    }
    setStartingWorkflow(false)
  }

  const handleStartWorkflowWithCakeAnimation = () => {
    setShowCakeGathering(true)
    setTimeout(() => setShowCakeGathering(false), 2200)
    handleStartWorkflow()
  }

  const handleSubmitProposal = async () => {
    if (!proposalText.trim() || submittingProposal) return
    setSubmittingProposal(true)
    try {
      await groupAPI.submitProposal(parseInt(groupId), { proposal: proposalText.trim() })
      await loadMessages()
      await loadPendingTasks()
      await loadGroup()
      loadGroupStats()
      loadMyTasks()
      setProposalText('')
      setShowProposalInput(false)
    } catch (e) {
      alert(e.response?.data?.detail || '提交失败，请重试')
    }
    setSubmittingProposal(false)
  }

  const handleAskAIAboutFile = async (file) => {
    setShowKnowledge(false)
    setSending(true)
    try {
      const res = await groupAPI.askAIAboutFile(parseInt(groupId), file.id, {})
      setMessages(prev => [...prev, res.data])
    } catch (e) {
      console.error(e)
      alert('AI建议生成失败，请稍后再试')
    }
    setSending(false)
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
      loadGroupStats()
      loadMyTasks()
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
  const totalCompletion = groupStats ? Math.round(groupStats.completion_rate || 0) : 0

  return (
    <div className="cakie-group-room flex flex-col h-screen max-h-screen">
      {/* 顶部栏 */}
      <div className="cakie-group-header flex items-center justify-between px-4 py-3 relative">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={() => navigate('/')} className="cakie-group-back flex-shrink-0">←</button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium text-choco-600 truncate">{group.name}</h1>
            <p className="text-xs text-choco-300 truncate">{group.member_count || 0} 块成员 · CAKIE 正在店内</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {myGroupTasks.length > 0 && (
            <button
              onClick={() => setShowMyTasks(!showMyTasks)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border transition-all ${
                showMyTasks ? 'bg-lilac-100 border-lilac-200' : 'bg-cream-100 border-cream-200'
              }`}
              title="我的任务"
            >
              📌
            </button>
          )}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`cakie-group-more w-8 h-8 flex items-center justify-center text-sm transition-all ${
                showMenu ? 'is-active' : ''
              }`}
              title="更多"
          >
            ⋯
          </button>
        </div>

        {/* 更多操作下拉菜单 */}
        {showMenu && (
          <>
            {/* 透明点击区，点击外部关闭菜单 */}
            <div
              className="fixed inset-0 z-[150]"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-3 top-full mt-1 z-[160] bg-white rounded-2xl border border-cream-200 shadow-lg overflow-hidden min-w-[180px] fade-in-up">
              {groupStats && groupStats.total_tasks > 0 && (
                <button
                  onClick={() => { setShowProgress(!showProgress); setShowMenu(false) }}
                  className={`w-full px-4 py-2.5 flex items-center gap-2.5 text-sm text-left hover:bg-dusty-50 transition-all ${
                    showProgress ? 'bg-dusty-50 text-dusty-600' : 'text-choco-500'
                  }`}
                >
                  <span className="text-base">📊</span>
                  <span>任务进度</span>
                </button>
              )}
              {allGroupTasks.length > 0 && (
                <button
                  onClick={() => { setShowTaskList(!showTaskList); setShowMenu(false) }}
                  className={`w-full px-4 py-2.5 flex items-center gap-2.5 text-sm text-left hover:bg-rosa-50 transition-all border-t border-cream-100 ${
                    showTaskList ? 'bg-rosa-50 text-rosa-600' : 'text-choco-500'
                  }`}
                >
                  <span className="text-base">📋</span>
                  <span>任务清单</span>
                </button>
              )}
              <button
                onClick={() => { setShowKnowledge(!showKnowledge); if (!showKnowledge) loadKnowledgeFiles(); setShowMenu(false) }}
                className={`w-full px-4 py-2.5 flex items-center gap-2.5 text-sm text-left hover:bg-sage-50 transition-all border-t border-cream-100 ${
                  showKnowledge ? 'bg-sage-50 text-sage-600' : 'text-choco-500'
                }`}
              >
                <CakieChatAsset src="/assets/cakie/资料库图标_icon-knowledge.png" alt="" fallback="料" className="cakie-chat-menu-icon" />
                <span>配方资料库</span>
              </button>
              <button
                onClick={() => { openInvite(); setShowMenu(false) }}
                className="w-full px-4 py-2.5 flex items-center gap-2.5 text-sm text-left text-choco-500 hover:bg-sage-50 transition-all border-t border-cream-100"
              >
                <span className="text-base">＋</span>
                <span>邀请成员</span>
              </button>
              <button
                onClick={() => { setShowInfo(!showInfo); setShowMenu(false) }}
                className={`w-full px-4 py-2.5 flex items-center gap-2.5 text-sm text-left hover:bg-cream-50 transition-all border-t border-cream-100 ${
                  showInfo ? 'bg-cream-50 text-choco-600' : 'text-choco-500'
                }`}
              >
                <span className="text-base">ℹ️</span>
                <span>群信息</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* 任务进度面板 */}
      {showProgress && groupStats && (
        <div className="px-4 py-3 bg-gradient-to-r from-cream-50 to-dusty-50 border-b border-cream-200 fade-in-up relative">
          <button
            onClick={() => setShowProgress(false)}
            className="absolute top-2 right-3 w-6 h-6 rounded-full bg-white/70 border border-cream-200 flex items-center justify-center text-xs text-choco-300 hover:bg-white hover:text-choco-500 transition-all"
            title="关闭"
          >
            ✕
          </button>
          <div className="flex items-center justify-between mb-2 pr-8">
            <span className="text-xs text-choco-500 font-medium">📊 团队任务进度</span>
            <span className={`text-sm font-bold ${
              totalCompletion >= 80 ? 'text-sage-400' :
              totalCompletion >= 40 ? 'text-dusty-400' :
              'text-rosa-400'
            }`}>
              {totalCompletion}%
            </span>
          </div>
          {/* 总进度条 */}
          <div className="w-full h-3 bg-cream-200 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                totalCompletion >= 80 ? 'bg-gradient-to-r from-sage-300 to-sage-400' :
                totalCompletion >= 40 ? 'bg-gradient-to-r from-dusty-300 to-dusty-400' :
                'bg-gradient-to-r from-rosa-200 to-rosa-300'
              }`}
              style={{ width: `${totalCompletion}%` }}
            />
          </div>
          <p className="text-[10px] text-choco-200 mb-2">
            {groupStats.completed_tasks}/{groupStats.total_tasks} 任务已完成
          </p>

          {/* 每位成员的进度 */}
          {groupStats.member_stats && groupStats.member_stats.length > 0 && (
            <div className="space-y-2">
              {groupStats.member_stats.map(member => {
                const memberRate = member.total_tasks > 0
                  ? Math.round(member.completed_tasks / member.total_tasks * 100)
                  : 0
                return (
                  <div key={member.user_id} className="flex items-center gap-2">
                    <span className="text-xs text-choco-400 w-16 truncate flex-shrink-0">
                      {member.username}
                    </span>
                    <div className="flex-1 h-2 bg-cream-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          memberRate >= 80 ? 'bg-sage-300' :
                          memberRate >= 40 ? 'bg-dusty-300' :
                          'bg-rosa-200'
                        }`}
                        style={{ width: `${memberRate}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-choco-300 w-12 text-right flex-shrink-0">
                      {member.completed_tasks}/{member.total_tasks}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 我的任务面板 */}
      {showMyTasks && myGroupTasks.length > 0 && (
        <div className="px-4 py-3 bg-gradient-to-r from-lilac-50 to-cream-50 border-b border-cream-200 fade-in-up relative">
          <button
            onClick={() => setShowMyTasks(false)}
            className="absolute top-2 right-3 w-6 h-6 rounded-full bg-white/70 border border-cream-200 flex items-center justify-center text-xs text-choco-300 hover:bg-white hover:text-choco-500 transition-all"
            title="关闭"
          >
            ✕
          </button>
          <div className="flex items-center justify-between mb-2 pr-8">
            <span className="text-xs text-choco-500 font-medium">📌 我的任务</span>
            <span className="text-[10px] text-choco-200">{myGroupTasks.filter(t => t.status === '已完成').length}/{myGroupTasks.length} 完成</span>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {myGroupTasks.map(task => {
              const isOverdue = task.deadline && task.status !== '已完成' && new Date(task.deadline) < new Date()
              return (
                <div key={task.id} className={`p-2 rounded-xl border ${isOverdue ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-white border-cream-200'}`}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/task-chat/${task.id}`)}
                      className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs border-2 transition-all ${
                        task.status === '已完成' ? 'bg-sage-300 border-sage-400 text-white' :
                        task.status === '进行中' ? 'bg-dusty-100 border-dusty-300 text-dusty-400' :
                        'bg-cream-100 border-cream-300 text-choco-200'
                      }`}
                      title="进入任务专属AI聊天"
                    >
                      {task.status === '已完成' ? '✓' : task.status === '进行中' ? '◎' : '○'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${task.status === '已完成' ? 'text-choco-200 line-through' : isOverdue ? 'text-red-600' : 'text-choco-600'}`}>
                        {task.title}
                      </p>
                      <p className={`text-[10px] ${isOverdue ? 'text-red-500 font-medium' : 'text-choco-200'}`}>
                        {task.status}
                        {task.deadline && (isOverdue ? ` · ⚠️ 已逾期 ${new Date(task.deadline).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}` : ` · 截止 ${new Date(task.deadline).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}`)}
                      </p>
                    </div>
                    <button
                      onClick={() => triggerTaskProofUpload(task.id)}
                      disabled={task.status === '已完成'}
                      className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full bg-rosa-100 border border-rosa-200 text-rosa-500 disabled:opacity-50 hover:bg-rosa-200 active:scale-95 transition-all"
                      title="上传节点凭证"
                    >
                      📎 凭证
                    </button>
                  </div>
                  {/* 任务进度条 */}
                  <div className="flex items-center gap-2 mt-1.5 pl-8">
                    <div className="flex-1 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          task.status === '已完成' ? 'bg-sage-300' :
                          isOverdue ? 'bg-red-400' :
                          (task.progress || 0) >= 50 ? 'bg-dusty-300' :
                          'bg-lilac-300'
                        }`}
                        style={{ width: `${task.progress || 0}%` }}
                      />
                    </div>
                    <span className={`text-[10px] ${isOverdue ? 'text-red-500' : 'text-choco-300'} flex-shrink-0`}>
                      {task.progress || 0}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 团队任务清单面板 */}
      {showTaskList && allGroupTasks.length > 0 && (
        <div className="px-4 py-3 bg-gradient-to-r from-rosa-50 to-cream-50 border-b border-rosa-100 fade-in-up relative">
          <button
            onClick={() => setShowTaskList(false)}
            className="absolute top-2 right-3 w-6 h-6 rounded-full bg-white/70 border border-cream-200 flex items-center justify-center text-xs text-choco-300 hover:bg-white hover:text-choco-500 transition-all"
            title="关闭"
          >
            ✕
          </button>
          <div className="flex items-center justify-between mb-2 pr-8">
            <span className="text-xs text-choco-500 font-medium">📋 团队任务清单</span>
            <span className="text-[10px] text-choco-200">{allGroupTasks.length} 个任务 · 仅自己的可点击</span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {allGroupTasks.map(task => {
              const isMine = task.assigned_to === user?.id
              const isOverdue = task.deadline && task.status !== '已完成' && new Date(task.deadline) < new Date()
              const isDone = task.status === '已完成' || (task.progress || 0) >= 100
              // 找负责人 username
              const assignee = group?.members?.find(m => m.user_id === task.assigned_to)
              const assigneeName = assignee?.username || (task.assigned_to ? '其他成员' : '未分配')
              return (
                <div
                  key={task.id}
                  onClick={isMine ? () => navigate(`/task-chat/${task.id}`) : undefined}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                    isMine
                      ? 'bg-white border-cream-200 cursor-pointer hover:shadow-sm hover:border-rosa-200 active:scale-[0.98]'
                      : 'bg-cream-50/50 border-cream-100 cursor-default opacity-80'
                  } ${isOverdue && !isDone ? 'border-red-200 bg-red-50/40' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${
                    isDone ? 'bg-sage-100' :
                    isOverdue ? 'bg-red-100' :
                    isMine ? 'bg-rosa-100' :
                    'bg-lilac-100'
                  }`}>
                    {isDone ? '✅' : isOverdue ? '⚠️' : isMine ? '🤖' : '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-medium truncate ${
                        isDone ? 'text-choco-300 line-through' :
                        isOverdue ? 'text-red-600' :
                        'text-choco-600'
                      }`}>
                        {task.title}
                      </p>
                      {task.deadline && (
                        <span className={`text-[9px] flex-shrink-0 ${isOverdue && !isDone ? 'text-red-500 font-medium' : 'text-choco-200'}`}>
                          {isOverdue && !isDone ? '⚠️ 已逾期' : new Date(task.deadline).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-white/70 rounded-full overflow-hidden border border-cream-100">
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
                      <span className={`text-[10px] flex-shrink-0 ${isOverdue && !isDone ? 'text-red-500' : 'text-choco-300'}`}>
                        {task.progress || 0}%
                      </span>
                    </div>
                    <p className="text-[9px] text-choco-300 mt-0.5">
                      {isMine ? '🌟 我负责' : `👤 ${assigneeName}`}
                    </p>
                  </div>
                  {isMine && <span className="text-choco-200 text-xs flex-shrink-0">→</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 知识库面板 */}
      {showKnowledge && (
        <div className="cakie-knowledge-panel px-4 py-3 fade-in-up relative">
          <button
            onClick={() => setShowKnowledge(false)}
            className="absolute top-2 right-3 w-6 h-6 rounded-full bg-white/70 border border-cream-200 flex items-center justify-center text-xs text-choco-300 hover:bg-white hover:text-choco-500 transition-all"
            title="关闭"
          >
            ✕
          </button>
          <div className="flex items-center justify-between mb-2 pr-8">
            <span className="flex items-center gap-2 text-xs text-choco-500 font-medium">
              <CakieChatAsset src="/assets/cakie/资料库图标_icon-knowledge.png" alt="" fallback="料" className="cakie-chat-section-icon" />
              配方资料库
            </span>
            <span className="text-[10px] text-choco-200">{knowledgeFiles.length} 个文件</span>
          </div>
          {knowledgeFiles.length === 0 ? (
            <p className="cakie-knowledge-empty text-xs text-choco-300 text-center py-3">还没有资料，点击回形针上传参考材料～</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {knowledgeFiles.map(f => (
                <div key={f.id} className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white border border-cream-200">
                  <span className="text-sm flex-shrink-0">
                    {f.file_type === 'pdf' ? '📄' : f.file_type === 'pptx' || f.file_type === 'ppt' ? '📊' : f.file_type === 'docx' || f.file_type === 'doc' ? '📝' : '📁'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-choco-600 truncate">{f.file_name}</p>
                    <p className="text-[10px] text-choco-200">{f.uploaded_by} · {f.created_at ? new Date(f.created_at).toLocaleDateString('zh-CN') : ''} · {(f.file_size / 1024).toFixed(0)}KB</p>
                  </div>
                  <button
                    onClick={() => handleAskAIAboutFile(f)}
                    disabled={sending}
                    className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full bg-rosa-50 border border-rosa-100 text-rosa-500 hover:bg-rosa-100 active:scale-95 transition-all"
                  >
                    💡 问AI
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 群信息面板 */}
      {showInfo && (
        <div className="px-4 py-3 bg-cream-50 border-b border-cream-200 space-y-2 fade-in-up relative">
          <button
            onClick={() => setShowInfo(false)}
            className="absolute top-2 right-3 w-6 h-6 rounded-full bg-white/70 border border-cream-200 flex items-center justify-center text-xs text-choco-300 hover:bg-white hover:text-choco-500 transition-all"
            title="关闭"
          >
            ✕
          </button>
          <div className="flex items-center justify-between pr-8">
            <span className="text-xs text-choco-400 font-medium">群号</span>
            <span className="text-xs text-rosa-400 font-mono">{group.invite_code}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-choco-400 font-medium">状态</span>
            <span className="text-xs text-lilac-400">
              {group.status === 'gathering' ? '📢 召集中' :
               group.status === 'discussing' ? '💭 讨论中' :
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

      {/* 人齐启动横幅 */}
      {isOwner && isGathering && (
        <div className="cakie-ready-panel px-4 py-3 fade-in-up">
          {!showBriefInput ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <CakieChatAsset src="/assets/cakie/人齐了吗图标_icon-ready.png" alt="" fallback="齐" className="cakie-ready-icon" />
                <div>
                  <p className="text-sm font-medium text-choco-600">蛋糕切角集齐了吗？</p>
                  <p className="text-[10px] text-choco-300">集齐后，CAKIE 会开始烘焙分工～</p>
                </div>
              </div>
              <button
                onClick={() => setShowBriefInput(true)}
                className="cakie-ready-button text-xs py-2 px-3 flex-shrink-0"
              >
                蛋糕入盘，开始烘焙！
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

              {/* 已上传文件列表 — 统一卡片格式 */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5">
                  {uploadedFiles.map((f, i) => {
                    const ext = f.name?.split('.').pop()?.toLowerCase() || ''
                    const icon = ext === 'pdf' ? '📄' : ['ppt','pptx'].includes(ext) ? '📊' : ['doc','docx'].includes(ext) ? '📝' : ['png','jpg','jpeg','gif'].includes(ext) ? '🖼️' : '📁'
                    return (
                      <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] ${
                        f.error ? 'bg-rosa-50 border-rosa-100' : 'bg-sage-50 border-sage-100'
                      }`}>
                        <span className="text-base">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-choco-600 truncate">{f.name}</p>
                          <p className={`text-[10px] ${f.error ? 'text-rosa-400' : 'text-sage-400'}`}>
                            {f.error ? `解析失败：${f.error.slice(0, 40)}` : '✓ 已解析，AI将分析此文件内容'}
                          </p>
                        </div>
                        <button onClick={() => removeUploadedFile(i)} className="text-choco-200 hover:text-rosa-400 text-sm">×</button>
                      </div>
                    )
                  })}
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
                  onClick={handleStartWorkflowWithCakeAnimation}
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

      {/* AI搜索中提示 */}
      {searching && (
        <div className="px-4 py-2 bg-lilac-50 border-b border-lilac-100 flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-lilac-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-lilac-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-lilac-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-lilac-500">AI 正在联网搜索参考案例中...</span>
        </div>
      )}

      {/* 空状态：让 AI 搜索参考案例 — 仅 in_progress/discussing/confirming 状态显示 */}
      {searchResults.length === 0 && !searching && (group.status === 'discussing' || group.status === 'confirming' || group.status === 'in_progress') && (
        <div className="px-4 py-2 bg-gradient-to-r from-rosa-50 to-lilac-50 border-b border-rosa-100 fade-in-up">
          <button
            onClick={async () => {
              setSearching(true)
              try {
                const brief = group.project_brief || group.description || group.name
                const searchRes = await aiAPI.searchChat({
                  message: `请围绕项目「${group.name}」帮我搜索一些可参考的案例、竞品和最佳实践。项目描述：${brief.slice(0, 200)}`,
                  context: `项目名称：${group.name}，项目描述：${brief.slice(0, 300)}`,
                })
                if (searchRes.data?.search_results?.length > 0) {
                  setSearchResults(searchRes.data.search_results)
                  saveSearchResults(searchRes.data.search_results)
                }
              } catch (e) {
                alert('搜索失败，请稍后再试')
              }
              setSearching(false)
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/70 border border-rosa-200 text-xs text-rosa-500 hover:bg-white active:scale-[0.98] transition-all"
          >
            <span className="text-base">🍡</span>
            <span className="font-medium">让 AI 帮你搜索参考案例</span>
            <span className="text-choco-300">→</span>
          </button>
        </div>
      )}

      {/* AI搜索参考案例 — 顶部固定栏，可折叠 */}
      {searchResults.length > 0 && (
        <div className="bg-gradient-to-r from-rosa-50 via-lilac-50 to-cream-50 border-b border-lilac-100 fade-in-up">
          <div className="w-full px-4 py-2 flex items-center justify-between gap-2">
            <button
              onClick={() => setShowSearchPanel(!showSearchPanel)}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <span className="text-base flex-shrink-0">🍡</span>
              <span className="text-xs font-medium text-choco-500 flex-shrink-0">AI 找到的参考案例</span>
              <span className="text-[10px] text-choco-300 truncate">· {searchResults.length} 个 · 点击查看详情</span>
            </button>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={async () => {
                  setSearching(true)
                  try {
                    const brief = group.project_brief || group.description || group.name
                    const searchRes = await aiAPI.searchChat({
                      message: `请围绕项目「${group.name}」帮我搜索一些可参考的案例、竞品和最佳实践。项目描述：${brief.slice(0, 200)}`,
                      context: `项目名称：${group.name}，项目描述：${brief.slice(0, 300)}`,
                    })
                    if (searchRes.data?.search_results?.length > 0) {
                      setSearchResults(searchRes.data.search_results)
                      saveSearchResults(searchRes.data.search_results)
                    }
                  } catch (e) {
                    alert('搜索失败，请稍后再试')
                  }
                  setSearching(false)
                }}
                disabled={searching}
                className="w-6 h-6 rounded-full bg-white/70 border border-cream-200 flex items-center justify-center text-[10px] text-choco-400 hover:bg-white hover:text-rosa-500 transition-all disabled:opacity-50"
                title="重新搜索"
              >
                🔄
              </button>
              <button
                onClick={() => setShowSearchPanel(!showSearchPanel)}
                className={`text-choco-300 text-xs transition-transform ${showSearchPanel ? 'rotate-180' : ''}`}
              >
                ▼
              </button>
            </div>
          </div>
          {showSearchPanel && (
            <div className="px-4 pb-3 overflow-x-auto">
              <div className="flex gap-2 pb-1" style={{ width: 'max-content' }}>
                {searchResults.map((result, i) => {
                  // 兼容多种字段名：url/href/link、snippet/body/description
                  const link = result.url || result.href || result.link || ''
                  const desc = result.snippet || result.body || result.description || ''
                  const host = (() => { try { return new URL(link).host.replace('www.','') } catch { return '' } })()
                  return (
                    <div
                      key={i}
                      onClick={() => link && window.open(link, '_blank', 'noopener,noreferrer')}
                      className={`w-[210px] p-3 rounded-xl bg-white border border-cream-200 transition-all flex-shrink-0 ${link ? 'cursor-pointer hover:shadow-md hover:border-rosa-300 active:scale-[0.97]' : 'opacity-70'}`}
                    >
                      <div className="flex items-center gap-1 mb-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rosa-100 text-rosa-500 font-medium">网站</span>
                        {host ? (
                          <span className="text-[10px] text-choco-400 truncate">{host}</span>
                        ) : (
                          <span className="text-[10px] text-choco-200">参考</span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-choco-600 mb-1 line-clamp-2 leading-snug">{result.title || '参考资料'}</p>
                      <p className="text-[10px] text-choco-300 line-clamp-3 leading-relaxed">{desc}</p>
                      {link ? (
                        <p className="text-[10px] text-dusty-500 mt-2 flex items-center gap-0.5 font-medium">
                          <span>查看详情</span><span>→</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-choco-200 mt-2">仅参考</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 组员讨论方案提交入口 — 在 discussing/confirming/in_progress 状态显示 */}
      {(group.status === 'discussing' || group.status === 'confirming' || group.status === 'in_progress') && (
        <div className={`px-4 py-3 border-b fade-in-up ${
          group.status === 'discussing'
            ? 'bg-gradient-to-r from-rosa-50 to-lilac-50 border-rosa-200'
            : 'bg-gradient-to-r from-sage-50 to-cream-50 border-sage-100'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-lg flex-shrink-0">{group.status === 'discussing' ? '💭' : '💬'}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-choco-600">
                  {group.status === 'discussing' ? '小组讨论中…达成方案后提交给 AI' : '讨论后有新方案？'}
                </p>
                <p className="text-[10px] text-choco-300 truncate">
                  {group.status === 'discussing'
                    ? 'AI 已给出任务理解和案例参考，请小组讨论后提交方案，AI 会自动拆任务+分配+设节点'
                    : '提交后 AI 会根据方案重新拆解和分配任务'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowProposalInput(true)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border active:scale-95 transition-all ${
                group.status === 'discussing'
                  ? 'bg-rosa-300 border-rosa-400 text-white hover:bg-rosa-400 font-medium'
                  : 'bg-sage-100 border-sage-200 text-sage-600 hover:bg-sage-200'
              }`}
            >
              📝 提交方案
            </button>
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="cakie-group-messages flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="cakie-group-empty text-center py-8 fade-in-up">
            <CakieChatAsset src="/assets/cakie/AI小蛋糕助手_agent-cake.png" alt="Team CAKIE AI 小蛋糕助手" fallback="CAKIE 小蛋糕助手" className="cakie-group-empty-agent" />
            <p className="text-sm text-choco-500 font-medium mt-3">欢迎来到「{group.name}」蛋糕房</p>
            <p className="text-xs text-choco-300 mt-1">输入 @ai，和 CAKIE 一起讨论分工吧～</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {['@ai 帮我们分析一下项目怎么分工', '@ai 目前进度如何？', '@ai 给我们一些建议'].map(hint => (
                <button key={hint} onClick={() => { setInput(hint) }}
                  className="cakie-group-hint text-[11px] px-2.5 py-1 transition-all">
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => {
          // ─── 方案消息：特殊渲染 ───
          if (msg.msg_type === 'proposal') {
            const isMe = msg.sender?.id === user?.id
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} fade-in-up`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-sage-50 border border-sage-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                    {msg.sender?.avatar || '🧁'}
                  </div>
                )}
                <div className="max-w-[85%]">
                  {!isMe && (
                    <p className="text-[10px] text-choco-300 mb-1 ml-1">{msg.sender?.username}</p>
                  )}
                  <div className="rounded-2xl border-2 border-sage-200 bg-gradient-to-br from-sage-50 to-cream-50 overflow-hidden">
                    <div className="px-3 py-1.5 bg-sage-100 border-b border-sage-200 flex items-center gap-1.5">
                      <span className="text-sm">📝</span>
                      <span className="text-[11px] font-medium text-sage-700">{msg.metadata?.title || '组员讨论方案'}</span>
                    </div>
                    <div className="p-3">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-choco-600">{msg.content}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-choco-100 mt-0.5 ml-1">
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            )
          }

          // ─── 任务卡片消息：特殊渲染 ───
          if (msg.msg_type === 'task_card' && msg.metadata?.assignments) {
            return (
              <div key={msg.id} className="fade-in-up mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CakieChatAsset
                    src="/assets/cakie/AI小蛋糕助手_agent-cake.png"
                    alt="Team CAKIE AI 小蛋糕助手"
                    fallback="CAKIE"
                    className="cakie-ai-avatar flex-shrink-0"
                  />
                  <p className="text-[10px] text-choco-200">AI 统筹组长 · 任务分配</p>
                </div>
                <div className="ml-10">
                  {/* 标题卡片 */}
                  <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl border ${
                    msg.metadata.from_proposal
                      ? 'bg-gradient-to-r from-sage-50 to-cream-50 border-sage-200'
                      : 'bg-gradient-to-r from-rosa-50 to-lilac-50 border-rosa-100'
                  }`}>
                    <span className="text-lg">{msg.metadata.from_proposal ? '🔄' : '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-choco-600">
                        {msg.metadata.from_proposal ? 'AI根据方案重新拆分了任务' : 'AI已完成任务分解和分配'}
                      </p>
                      <p className="text-[10px] text-choco-200">
                        {msg.metadata.from_proposal && msg.metadata.submitter ? `方案提交：${msg.metadata.submitter} · ` : ''}
                        共 {msg.metadata.total_tasks} 个任务 · 请各位确认
                      </p>
                    </div>
                  </div>

                  {/* 按成员分组的任务卡片 */}
                  <div className="space-y-3">
                    {msg.metadata.assignments.map((assignment, ai) => (
                      <div key={ai} className="rounded-2xl border border-cream-200 overflow-hidden bg-white">
                        {/* 成员头部 */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-lilac-50 to-cream-50 border-b border-cream-200">
                          <div className="w-7 h-7 rounded-full bg-lilac-100 flex items-center justify-center text-sm">
                            👤
                          </div>
                          <span className="text-sm font-medium text-choco-600">{assignment.member_name}</span>
                          <span className="text-[10px] text-choco-200 ml-auto">{assignment.tasks.length} 个任务</span>
                        </div>
                        {/* 任务列表 */}
                        <div className="p-2 space-y-1.5">
                          {assignment.tasks.map((task, ti) => (
                            <div key={ti} className="flex items-start gap-2 px-2.5 py-2 rounded-xl bg-cream-50 hover:bg-lilac-50 transition-colors">
                              <span className={`flex-shrink-0 text-xs mt-0.5 ${
                                task.priority >= 3 ? 'text-red-400' :
                                task.priority === 2 ? 'text-amber-400' :
                                'text-sage-400'
                              }`}>
                                {task.priority >= 3 ? '🔴' : task.priority === 2 ? '🟡' : '🟢'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-choco-600 font-medium">{task.title}</p>
                                {task.description && (
                                  <p className="text-[11px] text-choco-300 mt-0.5 line-clamp-2">{task.description}</p>
                                )}
                                {task.deadline && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-dusty-100 text-dusty-600 font-medium">
                                      ⏰ 提交节点 {task.deadline}
                                    </span>
                                    {task.days_from_now && (
                                      <span className="text-[10px] text-choco-200">
                                        ({task.days_from_now}天后)
                                      </span>
                                    )}
                                  </div>
                                )}
                                {task.reason && (
                                  <p className="text-[10px] text-lilac-400 mt-1">💡 {task.reason}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 底部提示 */}
                  <div className="mt-2 px-3 py-2 rounded-xl bg-sage-50 border border-sage-100">
                    <p className="text-[11px] text-sage-500">⚡ 请各位组员确认自己的任务，如有异议可以打回重新分配</p>
                  </div>
                </div>
                <p className="text-[10px] text-choco-100 mt-1 ml-10">
                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
            )
          }

          // ─── 文件消息 ───
          if (msg.msg_type === 'file') {
            const ext = msg.file_name?.split('.').pop()?.toLowerCase() || ''
            const icon = ext === 'pdf' ? '📄' : ['ppt','pptx'].includes(ext) ? '📊' : ['doc','docx'].includes(ext) ? '📝' : ['png','jpg','jpeg','gif'].includes(ext) ? '🖼️' : '📁'
            return (
              <div key={msg.id} className={`flex ${msg.sender?.id === user?.id ? 'justify-end' : 'justify-start'} fade-in-up`}>
                {msg.sender?.id !== user?.id && (
                  <div className="w-8 h-8 rounded-full bg-lilac-50 border border-lilac-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                    {msg.sender?.avatar || '🧁'}
                  </div>
                )}
                <div className="max-w-[80%]">
                  {msg.sender?.id !== user?.id && (
                    <p className="text-[10px] text-choco-200 mb-1 ml-1">{msg.sender?.username}</p>
                  )}
                  <div className={`rounded-2xl p-3 border ${msg.sender?.id === user?.id ? 'bg-rosa-50 border-rosa-100' : 'bg-white border-cream-200'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-choco-600 font-medium truncate">{msg.file_name}</p>
                        <p className="text-[10px] text-choco-200">已上传至知识库</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-choco-100 mt-0.5 ml-1">
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            )
          }

          // ─── 普通消息 ───
          return (
          <div key={msg.id} className={`flex ${!msg.is_ai && msg.sender?.id === user?.id ? 'justify-end' : 'justify-start'} fade-in-up`}>
            {msg.is_ai && (
              <CakieChatAsset
                src="/assets/cakie/AI小蛋糕助手_agent-cake.png"
                alt="Team CAKIE AI 小蛋糕助手"
                fallback="CAKIE"
                className="cakie-ai-avatar mr-2 flex-shrink-0 mt-1"
              />
            )}
            {!msg.is_ai && msg.sender?.id !== user?.id && (
              <div className="w-8 h-8 rounded-full bg-lilac-50 border border-lilac-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                {msg.sender?.avatar || '🧁'}
              </div>
            )}
            <div className="max-w-[80%]">
              {(msg.is_ai || msg.sender?.id !== user?.id) && (
                <p className="text-[10px] mb-1 ml-1">
                  {msg.is_ai ? (
                    <span className="text-rosa-400 font-medium">AI 统筹组长</span>
                  ) : (
                    <span className="text-choco-300">{msg.sender?.username}</span>
                  )}
                </p>
              )}
              <div className={
                msg.is_ai ? 'ai-bubble border-l-[3px] border-l-rosa-300' :
                msg.sender?.id === user?.id ? 'user-bubble' :
                'bg-white rounded-2xl p-3 border border-cream-200'
              }>
                {msg.is_ai ? (
                  <MarkdownText content={msg.content} />
                ) : (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                )}
              </div>
              <p className="text-[10px] text-choco-100 mt-0.5 ml-1">
                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
              </p>
            </div>
          </div>
          )
        })}

        {sending && (
          <div className="flex justify-start fade-in-up">
            <CakieChatAsset
              src="/assets/cakie/AI小蛋糕助手_agent-cake.png"
              alt="Team CAKIE AI 小蛋糕助手"
              fallback="CAKIE"
              className="cakie-ai-avatar mr-2 flex-shrink-0"
            />
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
      <div className="cakie-group-composer px-4 py-3">
        <input
          ref={chatFileRef}
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.txt"
          onChange={handleChatFileUpload}
          className="hidden"
        />
        <input
          ref={proofFileRef}
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt"
          onChange={handleTaskProofUpload}
          className="hidden"
        />
        <div className="flex gap-1.5 items-center">
          <button
            onClick={() => setInput(prev => prev.startsWith('@ai ') ? prev : '@ai ' + prev)}
            className={`cakie-composer-icon w-8 h-8 flex items-center justify-center text-xs flex-shrink-0 transition-all ${input.toLowerCase().startsWith('@ai') ? 'is-active' : ''}`}
            title="点击召唤AI"
          >
            <CakieChatAsset src="/assets/cakie/AI小蛋糕助手_agent-cake.png" alt="" fallback="AI" className="cakie-composer-icon-image" />
          </button>
          <button
            onClick={() => chatFileRef.current?.click()}
            disabled={chatUploading}
            className="cakie-composer-icon w-8 h-8 flex items-center justify-center text-xs flex-shrink-0 transition-all"
            title="上传文件到配方资料库"
          >
            {chatUploading ? '...' : <CakieChatAsset src="/assets/cakie/上传图标_icon-upload.png" alt="" fallback="传" className="cakie-composer-icon-image" />}
          </button>
          <input
            className="cakie-group-input flex-1 text-sm"
            placeholder="输入消息，@ai 可自然语言提问..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            className="cakie-send-cookie text-sm py-2 px-4 flex-shrink-0"
            disabled={!input.trim() || sending}
          >
            {sending ? '...' : '发送'}
          </button>
        </div>
      </div>

      {/* 邀请好友弹窗 */}
      {showInvite && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-transparent" onClick={() => setShowInvite(false)}>
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

            {inviteError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rosa-50 border border-rosa-100 text-xs text-rosa-500 text-center fade-in-up">
                ⚠️ {inviteError}
              </div>
            )}

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

      {/* 任务确认弹窗 — 居中浮窗 */}
      {showTaskConfirm && pendingTasks.length > 0 && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-3 bg-transparent" onClick={() => setShowTaskConfirm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-[500px] max-h-[88vh] flex flex-col fade-in-up shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* 弹窗头部 — 固定 */}
            <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-3 border-b border-cream-200 flex-shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-2xl">📋</span>
                <div className="min-w-0">
                  <h3 className="text-lg font-medium text-choco-600">确认你的任务</h3>
                  <p className="text-xs text-choco-200">AI已为你分配 {pendingTasks.length} 个任务，请确认</p>
                </div>
              </div>
              <button
                onClick={() => setShowTaskConfirm(false)}
                className="w-7 h-7 rounded-full bg-cream-100 border border-cream-200 flex items-center justify-center text-choco-300 hover:bg-cream-200 flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* 任务列表 — 可滚动 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {pendingTasks.map(task => (
                <div key={task.id} className="hand-card border-lilac-100">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg flex-shrink-0">📌</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-choco-600 leading-relaxed">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-choco-300 mt-1 leading-relaxed">{task.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          task.priority >= 3 ? 'bg-rosa-50 text-rosa-400' :
                          task.priority === 2 ? 'bg-dusty-50 text-dusty-400' :
                          'bg-sage-50 text-sage-400'
                        }`}>
                          {task.priority >= 3 ? '高' : task.priority === 2 ? '中' : '低'}优先级
                        </span>
                        {task.deadline && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-dusty-100 text-dusty-600 font-medium">
                            ⏰ 提交节点 {task.deadline}
                          </span>
                        )}
                      </div>
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

      {/* 组员讨论方案输入弹窗 */}
      {showProposalInput && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-transparent" onClick={() => !submittingProposal && setShowProposalInput(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-[430px] p-5 pb-8 fade-in-up max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-cream-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📝</span>
              <div>
                <h3 className="text-lg font-medium text-choco-600">提交讨论方案</h3>
                <p className="text-xs text-choco-200">AI将根据你们的方案重新拆解和分配任务</p>
              </div>
            </div>

            <div className="mb-3 px-3 py-2 rounded-xl bg-cream-50 border border-cream-200">
              <p className="text-[11px] text-choco-300 leading-relaxed">
                💡 提示：可以描述你们组讨论后达成共识的方向、调整的内容、新增的需求点、各人想做的部分等。
              </p>
            </div>

            <textarea
              className="hand-input text-sm resize-none w-full"
              rows={7}
              placeholder="例如：&#10;1. 我们决定把方向改为做一个面向大学生的学习计划APP&#10;2. 增加打卡、好友互相监督功能&#10;3. 小明想做UI设计部分，小红想做用户调研..."
              value={proposalText}
              onChange={e => setProposalText(e.target.value)}
              disabled={submittingProposal}
              autoFocus
            />

            <div className="flex items-center gap-2 mt-2 mb-3 text-[10px] text-choco-200">
              <span>📊 已写 {proposalText.length} 字</span>
              {proposalText.length > 0 && proposalText.length < 20 && (
                <span className="text-dusty-400">建议至少 20 字以便 AI 理解</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowProposalInput(false)}
                disabled={submittingProposal}
                className="flex-1 py-2.5 rounded-xl text-sm text-choco-300 bg-cream-100 border border-cream-200 active:scale-[0.98]"
              >
                取消
              </button>
              <button
                onClick={handleSubmitProposal}
                disabled={submittingProposal || !proposalText.trim()}
                className="flex-[2] hand-btn text-sm py-2.5"
              >
                {submittingProposal ? '🤖 AI重新拆解中...' : '提交方案给AI'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCakeGathering && (
        <div className="cakie-cake-gathering-overlay fixed inset-0 z-[300]" aria-hidden="true">
          <div className="cakie-cake-gathering-card">
            <div className="cakie-cake-stage">
              <div className="cakie-cake-slices">
                {[
                  '/assets/cakie/切角1_草莓_cake-slice-1.png',
                  '/assets/cakie/切角2_猕猴桃_cake-slice-2.png',
                  '/assets/cakie/切角3_柠檬_cake-slice-3.png',
                  '/assets/cakie/切角4_葡萄_cake-slice-4.png',
                  '/assets/cakie/切角5_蓝莓_cake-slice-5.png',
                  '/assets/cakie/切角6_蜜桃_cake-slice-6.png',
                  '/assets/cakie/切角7_巧克力_cake-slice-7.png',
                  '/assets/cakie/切角8_抹茶_cake-slice-8.png',
                ].map((src, index) => (
                  <CakieChatAsset
                    key={src}
                    src={src}
                    alt=""
                    fallback={`切角${index + 1}`}
                    className="cakie-cake-slice"
                  />
                ))}
              </div>
              <CakieChatAsset
                src="/assets/cakie/完整蛋糕_cake-complete.png"
                alt="Team CAKIE 完整蛋糕"
                fallback="完整蛋糕"
                className="cakie-cake-complete"
              />
            </div>
            <p className="cakie-cake-complete-title">蛋糕完成！</p>
            <p className="cakie-cake-complete-copy">CAKIE 正在为大家分工————</p>
          </div>
        </div>
      )}
    </div>
  )
}
