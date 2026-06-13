import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { aiAPI, taskAPI, messageAPI, groupAPI } from '../utils/api'
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

const WELCOME_MSG = { role: 'ai', content: '你好！我是你的AI私人助手 👋\n\n我可以帮你：\n📋 管理任务和日程\n💡 提供学习和效率建议\n🔨 分解复杂任务\n👥 指导团队协作\n\n💬 试试直接问我问题，或者转发一个群名片给我，我会自动读取你在该群的任务信息，随时为你提供指导！' }

function loadSessions() {
  try {
    const raw = localStorage.getItem('ai_chat_sessions')
    if (raw) return JSON.parse(raw)
  } catch {}
  // Migrate legacy single-chat data
  try {
    const legacy = localStorage.getItem('ai_chat_messages')
    if (legacy) {
      const msgs = JSON.parse(legacy)
      if (msgs.length > 1) {
        const id = Date.now().toString()
        const session = { id, title: '之前的对话', updatedAt: Date.now() }
        localStorage.setItem(`ai_chat_session_${id}`, JSON.stringify(msgs))
        localStorage.setItem('ai_chat_sessions', JSON.stringify([session]))
        localStorage.removeItem('ai_chat_messages')
        return [session]
      }
    }
  } catch {}
  return []
}

function saveSessions(sessions) {
  try { localStorage.setItem('ai_chat_sessions', JSON.stringify(sessions)) } catch {}
}

function loadSessionMessages(id) {
  try {
    const raw = localStorage.getItem(`ai_chat_session_${id}`)
    if (raw) return JSON.parse(raw)
  } catch {}
  return [WELCOME_MSG]
}

function saveSessionMessages(id, messages) {
  try { localStorage.setItem(`ai_chat_session_${id}`, JSON.stringify(messages)) } catch {}
}

// ── Session List View ──
function SessionListView({ sessions, onSelect, onCreate, onDelete }) {
  return (
    <div className="cakie-chat-page cakie-inspiration-page flex flex-col h-[calc(100vh-70px)]">
      <div className="cakie-chat-header cakie-inspiration-header mx-3 mt-3 px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <CakieAIAvatar className="cakie-ai-avatar-header" />
          <div>
            <p className="cakie-inspiration-label">TEAM CAKIE · AI 灵感烘焙台</p>
            <h1 className="text-base font-medium text-choco-600">我的对话</h1>
          </div>
        </div>
        <button onClick={onCreate} className="cakie-inspiration-tag px-3 py-1.5 text-xs text-rosa-400 font-medium">
          + 新对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-4">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-choco-200">
            <CakieAIAvatar className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-sm mb-1">还没有对话记录</p>
            <p className="text-xs">点击右上角开始新对话吧～</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => {
              const msgs = loadSessionMessages(s.id)
              const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null
              const preview = lastMsg ? (lastMsg.content.length > 40 ? lastMsg.content.slice(0, 40) + '...' : lastMsg.content) : ''
              const date = new Date(s.updatedAt)
              const timeStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`

              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-cream-50 border border-cream-100 hover:bg-lilac-50 hover:border-lilac-100 transition-all cursor-pointer"
                  onClick={() => onSelect(s.id)}
                >
                  <CakieAIAvatar className="w-10 h-10 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-medium text-choco-600 truncate">{s.title}</p>
                      <span className="text-[10px] text-choco-200 flex-shrink-0 ml-2">{timeStr}</span>
                    </div>
                    <p className="text-xs text-choco-300 truncate">{preview}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(s.id) }}
                    className="text-choco-200 hover:text-rosa-400 text-sm flex-shrink-0 px-1"
                    title="删除对话"
                  >✕</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Active Chat View ──
function ActiveChatView({ sessionId, onBack }) {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [messages, setMessages] = useState(() => loadSessionMessages(sessionId))
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [linkedGroup, setLinkedGroup] = useState(null)
  const [myGroups, setMyGroups] = useState([])
  const [showGroupPicker, setShowGroupPicker] = useState(false)
  const [extractedTasks, setExtractedTasks] = useState([])
  const messagesEndRef = useRef(null)
  const autoLinked = useRef(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (messages.length > 0) {
      saveSessionMessages(sessionId, messages)
      // Update session title from first user message
      try {
        const sessions = loadSessions()
        const idx = sessions.findIndex(s => s.id === sessionId)
        if (idx !== -1) {
          const firstUserMsg = messages.find(m => m.role === 'user')
          if (firstUserMsg && sessions[idx].title === '新对话') {
            sessions[idx].title = firstUserMsg.content.length > 20
              ? firstUserMsg.content.slice(0, 20) + '...'
              : firstUserMsg.content
          }
          sessions[idx].updatedAt = Date.now()
          saveSessions(sessions)
        }
      } catch {}
    }
  }, [messages, sessionId])

  useEffect(() => {
    loadMyGroups()
  }, [])

  useEffect(() => {
    const groupId = searchParams.get('group')
    if (groupId && myGroups.length > 0 && !autoLinked.current) {
      const group = myGroups.find(g => g.id === parseInt(groupId))
      if (group) {
        autoLinked.current = true
        handleForwardGroup(group)
      }
    }
  }, [myGroups, searchParams])

  const loadMyGroups = async () => {
    try {
      const res = await groupAPI.list()
      setMyGroups(res.data)
    } catch (e) { console.error(e) }
  }

  const handleForwardGroup = async (group) => {
    setLinkedGroup(group)
    setShowGroupPicker(false)
    setLoading(true)

    const forwardMsg = { role: 'user', content: `[转发群名片] ${group.name}` }
    setMessages(prev => [...prev, forwardMsg])

    try {
      const res = await messageAPI.sendPrivateMessage({
        content: `我转发了「${group.name}」的群名片给你，请读取我在这个群的任务信息，告诉我目前的状态和建议。`,
        group_id: group.id,
      })
      setMessages(prev => [...prev, { role: 'ai', content: res.data.ai_reply.content }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `已关联群组「${group.name}」。现在你可以问我关于这个群的任何问题，比如"我的任务有哪些"、"怎么做XX任务"等。`
      }])
    }
    setLoading(false)
  }

  const sendMessage = async (content) => {
    if (!content.trim() || loading) return

    const newMessages = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setExtractedTasks([])

    try {
      const isAnalysis = /分析|提炼|最近|近况|任务清单/.test(content)

      if (isAnalysis && !linkedGroup) {
        const parseRes = await aiAPI.parse({ text: content, deep: true })
        const tasks = parseRes.data.tasks || []

        if (tasks.length > 0) {
          setExtractedTasks(tasks)
          const taskList = tasks.map((t, i) =>
            `${i+1}. 📋 **${t.title}** ${t.deadline ? '📅 ' + t.deadline : ''} ${t.priority >= 3 ? '🔴' : '🟡'}`
          ).join('\n')
          setMessages([...newMessages, {
            role: 'ai',
            content: `我分析了你的近况，提炼出 ${tasks.length} 个任务：\n\n${taskList}\n\n💡 点击下方按钮可一键创建到你的任务清单中。`,
            hasTasks: true,
          }])
        } else {
          const chatRes = await aiAPI.chat({ message: content })
          setMessages([...newMessages, { role: 'ai', content: chatRes.data.reply }])
        }
      } else if (linkedGroup) {
        const res = await messageAPI.sendPrivateMessage({
          content,
          group_id: linkedGroup.id,
        })
        setMessages([...newMessages, { role: 'ai', content: res.data.ai_reply.content }])
      } else {
        const res = await aiAPI.chat({ message: content, context: '' })
        setMessages([...newMessages, { role: 'ai', content: res.data.reply }])
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'ai', content: '抱歉，出了点问题。请稍后再试。' }])
    }
    setLoading(false)
  }

  const handleBatchCreateTasks = async () => {
    if (extractedTasks.length === 0) return
    setLoading(true)
    try {
      for (const t of extractedTasks) {
        await taskAPI.create({
          title: t.title,
          description: t.description || '',
          deadline: t.deadline || null,
          start_time: t.start_time || null,
          end_time: t.end_time || null,
          priority: t.priority || 2,
          estimated_hours: t.estimated_hours || null,
          tags: t.tags || [],
        })
      }
      setMessages(prev => [...prev, { role: 'ai', content: `✅ 已成功创建 ${extractedTasks.length} 个任务到你的日程中！去首页看看吧。` }])
      setExtractedTasks([])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: '创建失败，请重试。' }])
    }
    setLoading(false)
  }

  return (
    <div className="cakie-chat-page cakie-inspiration-page flex flex-col h-screen">
      {/* 头部 */}
      <div className="cakie-chat-header cakie-inspiration-header mx-3 mt-3 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="cakie-task-back text-rosa-400 text-sm flex items-center"><img src="/assets/cakie/返回箭头_icon-back.png" className="inline-block w-4 h-4" alt="" /></button>
        <div className="flex items-center gap-2 flex-1">
          <CakieAIAvatar className="cakie-ai-avatar-header" />
          <div>
            <p className="cakie-inspiration-label">TEAM CAKIE · 今日灵感菜单</p>
            <h1 className="text-base font-medium text-choco-600">CAKIE 灵感烘焙台</h1>
            <p className="text-[10px] text-choco-300">
              {linkedGroup ? `正在烘焙「${linkedGroup.name}」的作业灵感` : '把你的问题交给小蛋糕助手吧～'}
            </p>
          </div>
        </div>
        {linkedGroup && (
          <button
            onClick={() => { setLinkedGroup(null); setMessages(prev => [...prev, { role: 'ai', content: '已取消群组关联，回到通用对话模式。' }]) }}
            className="cakie-inspiration-tag text-[10px] px-2 py-1 text-choco-300"
          >
            取消关联
          </button>
        )}
      </div>

      {/* 群名片转发提示 */}
      {!linkedGroup && myGroups.length > 0 && messages.length <= 2 && (
        <div className="px-4 mt-3 mb-2">
          <button
            onClick={() => setShowGroupPicker(true)}
            className="cakie-inspiration-note w-full flex items-center gap-3 p-3 transition-all"
          >
            <img src="/assets/cakie/转发群名片_icon-share-card.png" className="inline-block w-5 h-5" alt="" />
            <div className="text-left flex-1">
              <p className="text-sm font-medium text-choco-500">递上一张小组菜单卡</p>
              <p className="text-[10px] text-choco-300">CAKIE 会读取你的任务，一起调配执行灵感</p>
            </div>
            <span className="text-choco-200">→</span>
          </button>
        </div>
      )}

      {/* 对话区域 */}
      <div className="cakie-chat-messages cakie-inspiration-messages flex-1 overflow-y-auto px-4 pt-3 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in-up`}>
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

        {extractedTasks.length > 0 && (
          <div className="flex justify-center my-3 fade-in-up">
            <button onClick={handleBatchCreateTasks} className="hand-btn text-sm px-6" disabled={loading}>
              {loading ? '创建中...' : `✅ 一键创建 ${extractedTasks.length} 个任务`}
            </button>
          </div>
        )}

        {loading && (
          <div className="flex mb-4 fade-in-up">
            <CakieAIAvatar className="mr-2 flex-shrink-0" />
            <div className="ai-bubble">
              <p className="text-[11px] text-choco-300 mb-2">CAKIE 正在调配灵感配方～</p>
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
      {!linkedGroup && (
        <div className="cakie-inspiration-shortcuts px-4 pb-1">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setShowGroupPicker(true)}
              className="cakie-inspiration-tag flex items-center gap-1 px-3 py-1.5 text-xs text-lilac-400 whitespace-nowrap"
              disabled={loading}>
              <img src="/assets/cakie/转发群名片_icon-share-card.png" className="inline-block w-4 h-4" alt="" /> 转发群名片
            </button>
            <button onClick={() => sendMessage('帮我分析一下我最近的任务完成情况')}
              className="cakie-inspiration-tag flex items-center gap-1 px-3 py-1.5 text-xs text-choco-400 whitespace-nowrap"
              disabled={loading}>
              <span>📊</span> 分析近况
            </button>
            <button onClick={() => sendMessage('帮我做一个3天的紧急方案')}
              className="cakie-inspiration-tag flex items-center gap-1 px-3 py-1.5 text-xs text-choco-400 whitespace-nowrap"
              disabled={loading}>
              <span>⚡</span> 紧急方案
            </button>
          </div>
        </div>
      )}
      {linkedGroup && (
        <div className="cakie-inspiration-shortcuts px-4 pb-1">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => sendMessage('我在这个群的任务有哪些？')}
              className="cakie-inspiration-tag flex items-center gap-1 px-3 py-1.5 text-xs text-sage-500 whitespace-nowrap"
              disabled={loading}>
              <span>📋</span> 我的任务
            </button>
            <button onClick={() => sendMessage('指导我怎么做当前最紧急的任务')}
              className="cakie-inspiration-tag flex items-center gap-1 px-3 py-1.5 text-xs text-choco-400 whitespace-nowrap"
              disabled={loading}>
              <span>🎯</span> 任务指导
            </button>
            <button onClick={() => sendMessage('帮我总结一下项目目前的进度')}
              className="cakie-inspiration-tag flex items-center gap-1 px-3 py-1.5 text-xs text-choco-400 whitespace-nowrap"
              disabled={loading}>
              <span>📈</span> 进度总结
            </button>
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="cakie-chat-composer cakie-inspiration-composer mx-3 mb-2 px-3 pb-3 pt-3">
        <div className="flex gap-2">
          <input
            className="hand-input cakie-inspiration-input flex-1 text-sm"
            placeholder={linkedGroup ? `和 CAKIE 说说「${linkedGroup.name}」的难题吧～` : '和 CAKIE 说说你的作业难题吧～'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            className="hand-btn cakie-inspiration-send px-4 text-sm flex-shrink-0"
            disabled={loading || !input.trim()}
            aria-label="送入烤箱"
          >
            {loading ? '烘焙中…' : '送入烤箱'}
          </button>
        </div>
      </div>

      {/* 群名片选择弹窗 */}
      {showGroupPicker && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-transparent" onClick={() => setShowGroupPicker(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-[380px] p-5 pb-8 fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-cream-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-2 mb-4">
              <img src="/assets/cakie/转发群名片_icon-share-card.png" className="inline-block w-6 h-6" alt="" />
              <div>
                <h3 className="text-lg font-medium text-choco-600">转发群名片</h3>
                <p className="text-xs text-choco-200">选择一个群组，AI将读取你的任务信息</p>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {myGroups.length === 0 ? (
                <p className="text-center text-xs text-choco-200 py-6">还没有加入任何群组</p>
              ) : (
                myGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => handleForwardGroup(g)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-cream-50 border border-cream-100 hover:bg-lilac-50 hover:border-lilac-100 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-lilac-100 flex items-center justify-center text-lg">
                      👥
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-choco-600">{g.name}</p>
                      <p className="text-[10px] text-choco-200">{g.member_count || 0}人 · {g.description?.slice(0, 20) || '暂无描述'}</p>
                    </div>
                    <span className="text-xs text-lilac-400">转发 →</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page Component ──
export default function AIChatPage() {
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const [sessions, setSessions] = useState(loadSessions)

  const handleCreate = useCallback(() => {
    const id = Date.now().toString()
    const session = { id, title: '新对话', updatedAt: Date.now() }
    const updated = [session, ...loadSessions()]
    saveSessions(updated)
    setSessions(updated)
    navigate(`/ai-chat/${id}`)
  }, [navigate])

  const handleDelete = useCallback((id) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id)
      saveSessions(updated)
      return updated
    })
    try { localStorage.removeItem(`ai_chat_session_${id}`) } catch {}
    if (sessionId === id) navigate('/ai-chat')
  }, [sessionId, navigate])

  const handleBack = useCallback(() => {
    navigate('/ai-chat')
  }, [navigate])

  if (sessionId) {
    return <ActiveChatView sessionId={sessionId} onBack={handleBack} />
  }

  return (
    <SessionListView
      sessions={sessions}
      onSelect={(id) => navigate(`/ai-chat/${id}`)}
      onCreate={handleCreate}
      onDelete={handleDelete}
    />
  )
}
