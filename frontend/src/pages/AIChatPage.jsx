import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { aiAPI, taskAPI, messageAPI, groupAPI } from '../utils/api'

export default function AIChatPage() {
  const navigate = useNavigate()
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    loadMyGroups()
  }, [])

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
    <div className="flex flex-col h-[calc(100vh-70px)]">
      {/* 头部 */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h1 className="text-base font-medium text-choco-600">AI 私人助手</h1>
            <p className="text-[10px] text-choco-200">
              {linkedGroup ? `已关联: ${linkedGroup.name}` : '自然语言对话，转发群名片获取指导'}
            </p>
          </div>
        </div>
        {linkedGroup && (
          <button
            onClick={() => { setLinkedGroup(null); setMessages(prev => [...prev, { role: 'ai', content: '已取消群组关联，回到通用对话模式。' }]) }}
            className="text-[10px] px-2 py-1 rounded-full bg-cream-100 border border-cream-200 text-choco-300"
          >
            取消关联
          </button>
        )}
      </div>

      {/* 群名片转发提示 */}
      {!linkedGroup && myGroups.length > 0 && messages.length <= 2 && (
        <div className="px-4 mb-2">
          <button
            onClick={() => setShowGroupPicker(true)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-lilac-50 to-rosa-50 border border-lilac-100 hover:shadow-sm transition-all"
          >
            <span className="text-xl">💌</span>
            <div className="text-left flex-1">
              <p className="text-sm font-medium text-choco-500">转发群名片</p>
              <p className="text-[10px] text-choco-200">选择一个群组，AI会读取你的任务并提供指导</p>
            </div>
            <span className="text-choco-200">→</span>
          </button>
        </div>
      )}

      {/* 对话区域 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in-up`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-rosa-50 border border-rosa-100 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                🤖
              </div>
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
            <div className="w-8 h-8 rounded-full bg-rosa-50 border border-rosa-100 flex items-center justify-center mr-2">🤖</div>
            <div className="ai-bubble">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-rosa-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-lilac-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-sage-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷操作 + 转发群名片按钮 */}
      {!linkedGroup && (
        <div className="px-4 pb-1">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setShowGroupPicker(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-lilac-50 rounded-full text-xs text-lilac-400 border border-lilac-100 whitespace-nowrap"
              disabled={loading}>
              <span>💌</span> 转发群名片
            </button>
            <button onClick={() => sendMessage('帮我分析一下我最近的任务完成情况')}
              className="flex items-center gap-1 px-3 py-1.5 bg-cream-50 rounded-full text-xs text-choco-400 border border-cream-200 whitespace-nowrap"
              disabled={loading}>
              <span>📊</span> 分析近况
            </button>
            <button onClick={() => sendMessage('帮我做一个3天的紧急方案')}
              className="flex items-center gap-1 px-3 py-1.5 bg-cream-50 rounded-full text-xs text-choco-400 border border-cream-200 whitespace-nowrap"
              disabled={loading}>
              <span>⚡</span> 紧急方案
            </button>
          </div>
        </div>
      )}
      {linkedGroup && (
        <div className="px-4 pb-1">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => sendMessage('我在这个群的任务有哪些？')}
              className="flex items-center gap-1 px-3 py-1.5 bg-sage-50 rounded-full text-xs text-sage-500 border border-sage-100 whitespace-nowrap"
              disabled={loading}>
              <span>📋</span> 我的任务
            </button>
            <button onClick={() => sendMessage('指导我怎么做当前最紧急的任务')}
              className="flex items-center gap-1 px-3 py-1.5 bg-cream-50 rounded-full text-xs text-choco-400 border border-cream-200 whitespace-nowrap"
              disabled={loading}>
              <span>🎯</span> 任务指导
            </button>
            <button onClick={() => sendMessage('帮我总结一下项目目前的进度')}
              className="flex items-center gap-1 px-3 py-1.5 bg-cream-50 rounded-full text-xs text-choco-400 border border-cream-200 whitespace-nowrap"
              disabled={loading}>
              <span>📈</span> 进度总结
            </button>
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="px-4 pb-4 pt-2 border-t border-cream-200">
        <div className="flex gap-2">
          <input
            className="hand-input flex-1 text-sm"
            placeholder={linkedGroup ? `关于「${linkedGroup.name}」的问题...` : '输入你的问题...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            className="hand-btn px-5 text-sm flex-shrink-0"
            disabled={loading || !input.trim()}
          >
            {loading ? '...' : '发送'}
          </button>
        </div>
      </div>

      {/* 群名片选择弹窗 */}
      {showGroupPicker && (
        <div className="fixed inset-0 bg-black/25 z-[200] flex items-end justify-center" onClick={() => setShowGroupPicker(false)}>
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
