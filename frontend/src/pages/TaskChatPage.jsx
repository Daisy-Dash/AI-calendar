import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { taskAPI } from '../utils/api'
import MarkdownText from '../components/MarkdownText'

function CakieAIAvatar({ className = '' }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <span className={`cakie-ai-avatar cakie-ai-avatar-fallback ${className}`}>CAKIE</span>
  }

  return (
    <img
      src="/assets/cakie/AI小蛋糕助手_agent-cake.png"
      alt="Team CAKIE AI 小蛋糕助手"
      className={`cakie-ai-avatar ${className}`}
      onError={() => setFailed(true)}
    />
  )
}

export default function TaskChatPage() {
  const navigate = useNavigate()
  const { taskId } = useParams()
  const { user } = useAuth()
  const [task, setTask] = useState(null)
  const [subtasks, setSubtasks] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [useSearch, setUseSearch] = useState(false)
  const [showOverdue, setShowOverdue] = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [nodeUploadTargetId, setNodeUploadTargetId] = useState(null)
  const messagesEndRef = useRef(null)
  const fileRef = useRef(null)
  const nodeFileRef = useRef(null)

  useEffect(() => {
    loadTask()
  }, [taskId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (messages.length > 0 && taskId) {
      try { localStorage.setItem(`task_chat_${taskId}`, JSON.stringify(messages)) } catch {}
    }
  }, [messages])

  const loadTask = async () => {
    setPageLoading(true)
    try {
      const res = await taskAPI.get(taskId)
      setTask(res.data)
      // 加载子任务（通过list带过滤）
      try {
        const allRes = await taskAPI.list()
        const subs = (allRes.data || []).filter(t => t.parent_id === parseInt(taskId))
        setSubtasks(subs)
      } catch {}
      // 检查是否逾期
      if (res.data.deadline && res.data.status !== '已完成' && new Date(res.data.deadline) < new Date()) {
        setShowOverdue(true)
      }
      // 从 localStorage 恢复聊天记录，无则显示欢迎语
      try {
        const cached = localStorage.getItem(`task_chat_${taskId}`)
        if (cached) {
          setMessages(JSON.parse(cached))
        } else {
          setMessages([{
            role: 'ai',
            content: `你好！我是任务「${res.data.title}」的专属AI助手 👋\n\n📊 当前进度：${res.data.progress}%\n${res.data.deadline ? '📅 截止：' + new Date(res.data.deadline).toLocaleDateString('zh-CN') : ''}\n\n我可以帮你：\n📋 拆分任务节点\n🔍 联网搜索资料\n📎 评估上传凭证\n💡 提供执行建议`
          }])
        }
      } catch {
        setMessages([{
          role: 'ai',
          content: `你好！我是任务「${res.data.title}」的专属AI助手 👋`
        }])
      }
    } catch (e) {
      console.error(e)
      alert('任务加载失败')
      navigate(-1)
    }
    setPageLoading(false)
  }

  const sendMessage = async (content) => {
    if (!content.trim() || loading) return
    const newMessages = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const res = await taskAPI.taskChat(taskId, { message: content, use_search: useSearch })
      setMessages([...newMessages, { role: 'ai', content: res.data.reply }])
    } catch (err) {
      setMessages([...newMessages, { role: 'ai', content: '抱歉，AI出了点问题。请稍后再试。' }])
    }
    setLoading(false)
  }

  const handleSplitTask = async () => {
    if (loading) return
    setLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: '帮我拆分这个任务的子节点' }])
    try {
      const res = await taskAPI.splitTask(taskId)
      const subs = res.data.subtasks || []
      setSubtasks(prev => [...prev, ...subs])
      const list = subs.map((s, i) => `${i+1}. 📋 ${s.title}${s.deadline ? ' (截止: ' + new Date(s.deadline).toLocaleDateString('zh-CN') + ')' : ''}`).join('\n')
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `✅ 已为你拆分出 ${subs.length} 个子任务节点：\n\n${list}\n\n💡 完成每个节点后，上传凭证即可自动更新进度。`
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: '拆分失败，请重试。' }])
    }
    setLoading(false)
  }

  const handleUploadProof = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: `📎 上传凭证：${file.name}` }])
    try {
      const res = await taskAPI.uploadProof(taskId, file)
      setTask(prev => ({ ...prev, progress: res.data.new_progress, status: res.data.task_status }))
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `✅ 凭证已收到！\n\n📈 进度更新：${task.progress}% → ${res.data.new_progress}%\n\n${res.data.ai_feedback}`
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: '上传失败，请重试。' }])
    }
    setLoading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleNodeProofUpload = async (e) => {
    const file = e.target.files?.[0]
    const tid = nodeUploadTargetId
    if (!file || !tid) return
    setLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: `📎 为节点上传凭证：${file.name}` }])
    try {
      const res = await taskAPI.uploadProof(tid, file)
      // 重新拉一遍子任务列表
      const allRes = await taskAPI.list()
      const subs = (allRes.data || []).filter(t => t.parent_id === parseInt(taskId))
      setSubtasks(subs)
      // 父任务进度按子任务平均更新
      const totalP = subs.reduce((a, s) => a + (s.progress || 0), 0)
      const avgP = subs.length > 0 ? Math.round(totalP / subs.length) : task.progress
      try {
        const parentRes = await taskAPI.get(taskId)
        setTask(parentRes.data)
      } catch {}
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `✅ 节点凭证已收到！\n\n📈 该节点进度：${res.data.new_progress}%\n📊 任务总进度更新为：${avgP}%\n\n${res.data.ai_feedback}`
      }])
      // 关闭详情面板
      setSelectedNode(null)
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: '上传失败，请重试。' }])
    }
    setLoading(false)
    setNodeUploadTargetId(null)
    if (nodeFileRef.current) nodeFileRef.current.value = ''
  }

  const triggerNodeUpload = (nodeId) => {
    setNodeUploadTargetId(nodeId)
    setTimeout(() => nodeFileRef.current?.click(), 50)
  }

  if (pageLoading) {
    return (
      <div className="cakie-chat-page cakie-task-chat-page min-h-screen flex items-center justify-center">
        <div className="text-center">
          <CakieAIAvatar className="cakie-ai-avatar-loading mb-3 animate-float" />
          <p className="text-sm text-choco-300">CAKIE 正在查看配方～</p>
        </div>
      </div>
    )
  }

  if (!task) return null

  const isOverdue = task.deadline && task.status !== '已完成' && new Date(task.deadline) < new Date()
  const completed = task.progress >= 100

  return (
    <div className="cakie-chat-page cakie-task-chat-page flex flex-col h-screen">
      {/* 任务头部 + 进度条 */}
      <div className={`cakie-chat-header cakie-task-order-card mx-3 mt-3 px-4 pt-3 pb-3 border-b ${isOverdue ? 'is-overdue border-rosa-200' : 'border-cream-200'}`}>
        <div className="cakie-task-order-heading">
          <div>
            <p className="cakie-task-order-label">CAKIE ORDER · 工序单</p>
            <h1 className="text-base font-medium text-choco-600">工序小助手</h1>
            <p className="text-[10px] text-choco-300">CAKIE 正在陪你完成这道任务～</p>
          </div>
          <CakieAIAvatar className="cakie-ai-avatar-header" />
        </div>
        <div className="cakie-task-dashed-divider" />
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate(-1)} className="cakie-task-back text-rosa-400 text-sm">←</button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-choco-600 truncate">{task.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                completed ? 'bg-sage-100 text-sage-600' :
                task.status === '进行中' ? 'bg-dusty-100 text-dusty-600' :
                'bg-cream-200 text-choco-400'
              }`}>{task.status}</span>
              {task.deadline && (
                <span className={`text-[10px] ${isOverdue ? 'text-red-500 font-medium' : 'text-choco-300'}`}>
                  {isOverdue ? '⚠️ 已逾期 ' : '📅 截止 '}{new Date(task.deadline).toLocaleDateString('zh-CN')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 进度条 — 节点时间戳叠加在进度条上 */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative h-2.5 bg-white/70 rounded-full overflow-visible border border-cream-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                completed ? 'bg-gradient-to-r from-sage-300 to-sage-400' :
                task.progress >= 50 ? 'bg-gradient-to-r from-dusty-300 to-dusty-400' :
                'bg-gradient-to-r from-rosa-200 to-rosa-300'
              }`}
              style={{ width: `${task.progress}%` }}
            />
            {/* 节点时间戳标记（叠在进度条上） */}
            {subtasks.length > 0 && subtasks.map((st, i) => {
              const pos = ((i + 1) / subtasks.length) * 100
              const done = st.status === '已完成' || (st.progress || 0) >= 100
              const overdue = st.deadline && !done && new Date(st.deadline) < new Date()
              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedNode(st)}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 transition-all hover:scale-125 active:scale-110 ${
                    done ? 'bg-sage-400 border-white' :
                    overdue ? 'bg-red-400 border-white animate-pulse' :
                    (st.progress || 0) > 0 ? 'bg-dusty-300 border-white' :
                    'bg-white border-rosa-300'
                  }`}
                  style={{ left: `${pos}%` }}
                  title={st.title}
                />
              )
            })}
          </div>
          <span className={`text-xs font-medium ${completed ? 'text-sage-500' : 'text-choco-400'} flex-shrink-0`}>
            {task.progress}%
          </span>
        </div>

        {/* 节点时间戳文字提示 */}
        {subtasks.length > 0 && (
          <div className="flex items-center justify-between mt-1.5 text-[9px] text-choco-300">
            {subtasks.slice(0, 4).map((st, i) => {
              const overdue = st.deadline && st.status !== '已完成' && new Date(st.deadline) < new Date()
              return (
                <span key={st.id} className={overdue ? 'text-red-500 font-medium' : ''}>
                  {st.deadline ? new Date(st.deadline).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '—'}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* 节点详情面板（点击节点弹出） */}
      {selectedNode && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-3 bg-transparent" onClick={() => setSelectedNode(null)}>
          <div className="bg-white rounded-3xl w-full max-w-[380px] max-h-[85vh] flex flex-col fade-in-up shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-cream-200 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                    selectedNode.status === '已完成' ? 'bg-sage-100 text-sage-600' :
                    (selectedNode.deadline && new Date(selectedNode.deadline) < new Date()) ? 'bg-red-100 text-red-600' :
                    'bg-rosa-100 text-rosa-600'
                  }`}>
                    {selectedNode.status === '已完成' ? '✅ 已完成' :
                     (selectedNode.deadline && new Date(selectedNode.deadline) < new Date()) ? '⚠️ 已逾期' :
                     '○ 待提交'}
                  </span>
                  <span className="text-[10px] text-choco-300 whitespace-nowrap">节点 {subtasks.findIndex(s => s.id === selectedNode.id) + 1} / {subtasks.length}</span>
                </div>
                <h3 className="text-base font-medium text-choco-600 leading-snug">{selectedNode.title}</h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="w-7 h-7 rounded-full bg-cream-100 border border-cream-200 flex items-center justify-center text-choco-300 hover:bg-cream-200 flex-shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {/* DDL */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cream-50 border border-cream-200">
                <span className="text-lg">⏰</span>
                <div className="flex-1">
                  <p className="text-[10px] text-choco-300">提交截止时间</p>
                  <p className={`text-sm font-medium ${selectedNode.deadline && new Date(selectedNode.deadline) < new Date() ? 'text-red-500' : 'text-choco-600'}`}>
                    {selectedNode.deadline ? new Date(selectedNode.deadline).toLocaleDateString('zh-CN') : '未设置'}
                  </p>
                </div>
              </div>

              {/* 要提交什么 */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-rosa-50 to-lilac-50 border border-rosa-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base">📝</span>
                  <p className="text-xs font-medium text-choco-500">需要提交什么</p>
                </div>
                <p className="text-sm text-choco-600 leading-relaxed whitespace-pre-wrap">
                  {selectedNode.description || '请提交对应阶段的成果（文档/截图/原型链接等）'}
                </p>
              </div>

              {/* 当前进度 */}
              <div className="px-3 py-2 rounded-xl bg-white border border-cream-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-choco-300">该节点进度</span>
                  <span className="text-xs font-medium text-choco-500">{selectedNode.progress || 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-cream-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${selectedNode.status === '已完成' ? 'bg-sage-300' : 'bg-rosa-300'}`}
                    style={{ width: `${selectedNode.progress || 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-cream-200 flex-shrink-0">
              <button
                onClick={() => triggerNodeUpload(selectedNode.id)}
                disabled={selectedNode.status === '已完成' || loading}
                className="w-full hand-btn text-sm py-2.5"
              >
                {loading ? '上传中…' : (selectedNode.status === '已完成' ? '✅ 此节点已完成' : '📎 为此节点上传凭证')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 对话区域 */}
      <div className="cakie-chat-messages cakie-task-chat-messages flex-1 overflow-y-auto px-4 py-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in-up`}>
            {msg.role === 'ai' && (
              <CakieAIAvatar className="mr-2 flex-shrink-0 mt-1" />
            )}
            <div className={`max-w-[80%] ${msg.role === 'ai' ? 'ai-bubble' : 'user-bubble'}`}>
              {msg.role === 'ai' ? (
                <MarkdownText content={msg.content} />
              ) : (
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex mb-3 fade-in-up">
            <CakieAIAvatar className="mr-2 flex-shrink-0" />
            <div className="ai-bubble">
              <p className="text-[11px] text-choco-300 mb-2">CAKIE 正在查看配方～</p>
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-rosa-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-dusty-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-sage-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷操作 */}
      <div className="cakie-task-shortcuts px-4 pb-1">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setUseSearch(!useSearch)}
            className={`cakie-task-tag flex items-center gap-1 px-3 py-1.5 text-xs whitespace-nowrap transition-all ${
              useSearch
                ? 'is-active text-lilac-700'
                : 'text-choco-400'
            }`}
            disabled={loading}
          >
            <span>🔍</span> {useSearch ? '联网搜索已开' : '联网搜索'}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="cakie-task-tag flex items-center gap-1 px-3 py-1.5 text-xs text-sage-500 whitespace-nowrap"
            disabled={loading}
          >
            <span>📎</span> 上传凭证
          </button>
          {!task.parent_id && !task.is_subtask && (
            <button
              onClick={handleSplitTask}
              className="cakie-task-tag flex items-center gap-1 px-3 py-1.5 text-xs text-rosa-500 whitespace-nowrap"
              disabled={loading}
            >
              <span>📋</span> 拆分任务
            </button>
          )}
          <button
            onClick={() => sendMessage('帮我找一些这类任务的优秀案例参考')}
            className="cakie-task-tag flex items-center gap-1 px-3 py-1.5 text-xs text-choco-400 whitespace-nowrap"
            disabled={loading}
          >
            <span>💡</span> 找案例
          </button>
          <button
            onClick={() => sendMessage('给我一份完成这个任务的详细执行计划')}
            className="cakie-task-tag flex items-center gap-1 px-3 py-1.5 text-xs text-choco-400 whitespace-nowrap"
            disabled={loading}
          >
            <span>📅</span> 执行计划
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt"
          onChange={handleUploadProof}
        />
        <input
          ref={nodeFileRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt"
          onChange={handleNodeProofUpload}
        />
      </div>

      {/* 输入区域 */}
      <div className="cakie-chat-composer cakie-task-composer mx-3 mb-2 px-3 pb-3 pt-3">
        <div className="flex gap-2">
          <input
            className="hand-input cakie-task-input flex-1 text-sm"
            placeholder={useSearch ? '向 CAKIE 联网询问这道工序吧～' : '向 CAKIE 询问这道工序吧～'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            className="hand-btn cakie-task-send px-4 text-sm flex-shrink-0"
            disabled={loading || !input.trim()}
            aria-label="送入烤箱"
          >
            {loading ? '烘焙中…' : '送入烤箱'}
          </button>
        </div>
      </div>

      {/* 逾期弹窗 */}
      {showOverdue && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-3 bg-transparent" onClick={() => setShowOverdue(false)}>
          <div className="bg-white rounded-3xl w-full max-w-[380px] p-5 fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⏰</span>
              <div>
                <h3 className="text-base font-medium text-rosa-500">任务已逾期</h3>
                <p className="text-xs text-choco-200">请尽快完成或与团队沟通调整</p>
              </div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-rosa-50 border border-rosa-100 mb-4">
              <p className="text-sm text-choco-600">{task.title}</p>
              <p className="text-[10px] text-rosa-400 mt-1">
                截止: {new Date(task.deadline).toLocaleDateString('zh-CN')}
                {' · '}逾期 {Math.ceil((new Date() - new Date(task.deadline)) / 86400000)} 天
              </p>
            </div>
            <button
              onClick={() => setShowOverdue(false)}
              className="w-full py-2.5 rounded-xl text-sm text-white bg-rosa-400 active:scale-[0.98]"
              style={{ boxShadow: '0 2px 0 #B37474' }}
            >
              知道了，开始处理
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
