import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { aiAPI, taskAPI } from '../utils/api'

const quickPrompts = [
  { label: '分析近况', icon: '🔍', prompt: '我最近在做：\n1.\n2.\n3.\n请帮我分析提炼成任务清单' },
  { label: '3天方案', icon: '⚡', prompt: '帮我做一个3天的紧急方案' },
  { label: '任务分解', icon: '🔨', prompt: '帮我分解一个大型任务' },
  { label: '日程优化', icon: '📅', prompt: '帮我优化我的日程安排' },
]

export default function AIChatPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    { role: 'ai', content: '你好！我是你的AI日程助手 👋\n\n✨ **快速创建**：直接告诉我你要做什么，我帮你解析成任务\n📋 **分析近况**：列出你最近在做的事，我帮你提炼成任务清单\n🔨 **任务分解**：把大任务拆成小步骤\n📅 **日程优化**：帮你合理安排时间\n\n💬 试试输入你最近在忙的事情吧！' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [extractedTasks, setExtractedTasks] = useState([])
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (content) => {
    if (!content.trim() || loading) return

    const newMessages = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setExtractedTasks([])

    try {
      // 判断是否包含"分析"、"提炼"、"最近"等关键词 → 深度分析模式
      const isAnalysis = /分析|提炼|最近|近况|任务清单/.test(content)

      if (isAnalysis) {
        // 用深度分析提取任务
        const parseRes = await aiAPI.parse({ text: content, deep: true })
        const tasks = parseRes.data.tasks || []
        const summary = parseRes.data.summary || ''

        if (tasks.length > 0) {
          setExtractedTasks(tasks)
          const taskList = tasks.map((t, i) =>
            `${i+1}. 📋 **${t.title}** ${t.deadline ? '📅 ' + t.deadline : ''} ${t.priority >= 3 ? '🔴' : '🟡'}`
          ).join('\n')
          setMessages([...newMessages, {
            role: 'ai',
            content: `我分析了你的近况，提炼出 ${tasks.length} 个任务：\n\n${taskList}\n\n📊 ${summary}\n\n💡 下方可以一键创建所有任务到你的任务清单和日程中。`,
            hasTasks: true,
          }])
        } else {
          const chatRes = await aiAPI.chat({ message: content })
          setMessages([...newMessages, { role: 'ai', content: chatRes.data.reply }])
        }
      } else {
        const res = await aiAPI.chat({ message: content, context: '' })
        setMessages([...newMessages, { role: 'ai', content: res.data.reply }])
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'ai', content: '有什么我可以帮你的吗？试试输入你最近在忙的事情，我帮你分析提炼成任务清单。' }])
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
      alert(`✅ 已创建 ${extractedTasks.length} 个任务！`)
      setExtractedTasks([])
      navigate('/tasks')
    } catch (err) {
      alert('创建失败，请重试')
    }
    setLoading(false)
  }

  const handleQuickPrompt = (prompt) => {
    sendMessage(prompt)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* 头部 */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-hand text-warm-700">🤖 AI助手</h1>
      </div>

      {/* 快捷提示 */}
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quickPrompts.map((item) => (
            <button
              key={item.label}
              onClick={() => handleQuickPrompt(item.prompt)}
              className="flex items-center gap-1 px-3 py-2 bg-warm-50 rounded-xl text-sm text-warm-700 whitespace-nowrap hover:bg-warm-100 transition-all"
              disabled={loading}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 对话区域 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center mr-2 flex-shrink-0 self-end">
                🤖
              </div>
            )}
            <div className={msg.role === 'ai' ? 'ai-bubble' : 'user-bubble'}>
              <div className="text-sm whitespace-pre-line">{msg.content}</div>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-warm-500 flex items-center justify-center ml-2 flex-shrink-0 self-end text-white text-xs">
                {msg.content.slice(0, 1)}
              </div>
            )}
          </div>
        ))}
        {/* 批量创建按钮 */}
        {extractedTasks.length > 0 && (
          <div className="flex justify-center my-3 fade-in-up">
            <button onClick={handleBatchCreateTasks} className="hand-btn text-sm px-6" disabled={loading}>
              {loading ? '创建中...' : `✅ 一键创建 ${extractedTasks.length} 个任务到日程`}
            </button>
          </div>
        )}

        {loading && (
          <div className="flex mb-4">
            <div className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center mr-2">🤖</div>
            <div className="ai-bubble">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-warm-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                <div className="w-2 h-2 bg-warm-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-warm-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="px-4 pb-4 pt-2 bg-warm-50 border-t border-warm-100">
        <div className="flex gap-2">
          <input
            className="hand-input flex-1"
            placeholder="输入你的问题..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          />
          <button
            onClick={() => sendMessage(input)}
            className="hand-btn px-4"
            disabled={loading || !input.trim()}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
