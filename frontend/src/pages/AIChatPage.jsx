import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { aiAPI, taskAPI, messageAPI, groupAPI } from '../utils/api'

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

export default function AIChatPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    { role: 'ai', content: '你好！我是你的AI私人助手 👋\n\n我可以帮你：\n📋 管理任务和日程\n💡 提供学习和效率建议\n🔨 分解复杂任务\n👥 指导团队协作\n\n💬 试试直接问我问题，或者转发一个群名片给我，我会自动读取你在该群的任务信息，随时为你提供指导！' },
  ])
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
  }, [messages])

  useEffect(() => {
    loadMyGroups()
  }, [])

  // 自动关联群组（从首页"我的任务"卡片点进来时）
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

    // 自动发送一条"转发群名片"的消息
    const forwardMsg = { role: 'user', content: `[转发群名片] ${group.name}` }
    setMessages(prev => [...prev, forwardMsg])

    try {
      // 调用私聊API（带group_id），AI会自动读取任务信息
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
      // 判断是否包含分析关键词
      const isAnalysis = /分析|提炼|最近|近况|任务清单/.test(content)

      if (isAnalysis && !linkedGroup) {
        // 深度分析模式
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
        // 有关联群组时，走私聊AI（带上下文）
        const res = await messageAPI.sendPrivateMessage({
          content,
          group_id: linkedGroup.id,
        })
        setMessages([...newMessages, { role: 'ai', content: res.data.ai_reply.content }])
      } else {
        // 普通对话
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
    <div className="cakie-chat-page cakie-inspiration-page flex flex-col h-[calc(100vh-70px)]">
      {/* 头部 */}
      <div className="cakie-chat-header cakie-inspiration-header mx-3 mt-3 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
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
            <span className="text-xl">💌</span>
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
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}

        {/* 批量创建按钮 */}
        {extractedTasks.length > 0 && (
          <div className="flex justify-center my-3 fade-in-up">
            <button onClick={handleBatchCreateTasks} className="hand-btn text-sm px-6" disabled={loading}>
              {loading ? '创建中...' : `✅ 一键创建 ${extractedTasks.length} 个任务`}
            </button>
          </div>
        )}

        {/* 加载动画 */}
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

      {/* 快捷操作 + 转发群名片按钮 */}
      {!linkedGroup && (
        <div className="cakie-inspiration-shortcuts px-4 pb-1">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setShowGroupPicker(true)}
              className="cakie-inspiration-tag flex items-center gap-1 px-3 py-1.5 text-xs text-lilac-400 whitespace-nowrap"
              disabled={loading}>
              <span>💌</span> 转发群名片
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
          <div className="bg-white rounded-t-3xl w-full max-w-[430px] p-5 pb-8 fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-cream-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">💌</span>
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
