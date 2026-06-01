import { useState, useRef, useEffect } from 'react'
import { aiAPI } from '../utils/api'

const quickPrompts = [
  { label: '3天方案', icon: '⚡', prompt: '帮我做一个3天的紧急方案' },
  { label: '5天方案', icon: '📋', prompt: '帮我做一个5天的标准方案' },
  { label: '任务分解', icon: '🔨', prompt: '帮我分解一个大型任务' },
  { label: '日程优化', icon: '📅', prompt: '帮我优化我的日程安排' },
]

export default function AIChatPage() {
  const [messages, setMessages] = useState([
    { role: 'ai', content: '你好！我是你的AI日程助手 👋\n我可以帮你：\n• 分解复杂任务为子任务\n• 制定学习/工作计划\n• 优化日程安排\n• 提供效率建议\n\n有什么我可以帮你的吗？' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
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

    try {
      const res = await aiAPI.chat({ message: content, context: '' })
      setMessages([...newMessages, { role: 'ai', content: res.data.reply }])
    } catch (err) {
      // Fallback mock response
      const mockReplies = [
        `好的！关于"${content.slice(0, 20)}..."，我建议按以下步骤进行：\n\n1. 📌 明确目标和范围\n2. 📊 分解为3-5个关键步骤\n3. ⏰ 为每个步骤设定时间节点\n4. 🔄 定期检查和调整\n\n需要我帮你进一步细化吗？`,
        `我来帮你分析这个任务。首先建议：\n\n✨ **优先级排序**\n• 紧急且重要 → 立即执行\n• 重要不紧急 → 制定计划\n• 紧急不重要 → 委托或快速处理\n• 不重要不紧急 → 考虑舍弃\n\n想要我帮你生成具体的执行方案吗？`,
        `我理解你的需求！以下是我的建议：\n\n📋 **执行方案**\n• Day 1-2: 前期准备与调研\n• Day 3-4: 核心执行阶段\n• Day 5: 检查与完善\n\n💡 提示：可以使用"任务分解"功能生成更详细的子任务列表！`,
      ]
      const mockReply = mockReplies[Math.floor(Math.random() * mockReplies.length)]
      setMessages([...newMessages, { role: 'ai', content: mockReply }])
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
