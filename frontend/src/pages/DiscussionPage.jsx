import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProject, addChatMessage, updateProject, getUserProfile } from '../utils/store'
import { getAIGreeting, getCompetitorResearch, getChatResponse } from '../utils/mockAI'
import { aiAPI } from '../utils/api'

export default function DiscussionPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [inspirations, setInspirations] = useState([])
  const [showAuthorize, setShowAuthorize] = useState(false)
  const [selectedInspo, setSelectedInspo] = useState(null)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const initDone = useRef(false)

  useEffect(() => {
    const p = getProject(projectId)
    if (!p) { navigate('/'); return }
    setProject(p)
    setMessages(p.chat_history || [])
    setInspirations(p.inspirations || [])

    if (p.chat_history.length === 0 && !initDone.current) {
      initDone.current = true
      initChat(p)
    }
  }, [projectId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initChat = async (p) => {
    const profile = getUserProfile()
    const greeting = await getAIGreeting(profile)
    const msg = { role: 'ai', content: greeting, type: 'text' }
    addChatMessage(p.id, msg)
    setMessages(prev => [...prev, { id: Date.now().toString(), ...msg, timestamp: new Date().toISOString() }])
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const userMsg = { role: 'user', content: input.trim(), type: 'text' }
    addChatMessage(projectId, userMsg)
    setMessages(prev => [...prev, { id: Date.now().toString(), ...userMsg, timestamp: new Date().toISOString() }])

    const userInput = input.trim()
    setInput('')
    setSending(true)

    try {
      // 尝试使用真实 AI 联网搜索
      const token = localStorage.getItem('token')

      if (token) {
        // 构建上下文：把之前的对话历史拼入
        const chatHistory = messages.slice(-6).map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n')
        const contextStr = project ? `项目名称: ${project.name}\n${chatHistory}` : chatHistory

        const res = await aiAPI.searchChat({
          message: userInput,
          context: contextStr,
        })

        const data = res.data

        // 如果搜索到了结果，转化为灵感卡片
        if (data.search_results?.length > 0 && !inspirations.length) {
          const newInspirations = data.search_results.slice(0, 6).map(r => ({
            title: r.title || '搜索结果',
            description: r.snippet || r.title || '',
            type: '网页',
            tags: [],
            url: r.url || '',
            highlight: r.snippet || '',
          }))
          setInspirations(newInspirations)
          updateProject(projectId, { inspirations: newInspirations })
        }

        const aiMsg = { role: 'ai', content: data.reply, type: 'text' }
        addChatMessage(projectId, aiMsg)
        setMessages(prev => [...prev, { id: Date.now().toString(), ...aiMsg, timestamp: new Date().toISOString() }])

        // 检查是否需要授权确认
        const lower = userInput.toLowerCase()
        if (lower.includes('确定') || lower.includes('就这个') || lower.includes('开始')) {
          setShowAuthorize(true)
          updateProject(projectId, { confirmed_goal: userInput, status: 'confirmed' })
        }
      } else {
        // 未登录 — 降级使用 mockAI
        throw new Error('no token')
      }
    } catch (err) {
      // API 调用失败 — 降级使用 mockAI
      console.log('[DiscussionPage] AI API 失败，使用本地模拟:', err.message || err)

      if (messages.length <= 2 && !inspirations.length) {
        const research = await getCompetitorResearch(userInput)
        setInspirations(research.inspirations)
        updateProject(projectId, { inspirations: research.inspirations })
        const aiMsg = { role: 'ai', content: research.message, type: 'text' }
        addChatMessage(projectId, aiMsg)
        setMessages(prev => [...prev, { id: Date.now().toString(), ...aiMsg, timestamp: new Date().toISOString() }])
      } else {
        const response = await getChatResponse(userInput, { messages, project })
        if (response.type === 'authorize') {
          setShowAuthorize(true)
          updateProject(projectId, { confirmed_goal: userInput, status: 'confirmed' })
        }
        const aiMsg = { role: 'ai', content: response.content, type: response.type }
        addChatMessage(projectId, aiMsg)
        setMessages(prev => [...prev, { id: Date.now().toString(), ...aiMsg, timestamp: new Date().toISOString() }])
      }
    }
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!project) return null

  const inspoColors = [
    { bg: 'bg-rosa-50', border: 'border-rosa-100', badge: 'bg-rosa-100 text-rosa-500' },
    { bg: 'bg-lilac-50', border: 'border-lilac-100', badge: 'bg-lilac-100 text-lilac-400' },
    { bg: 'bg-dusty-50', border: 'border-dusty-100', badge: 'bg-dusty-100 text-dusty-400' },
    { bg: 'bg-sage-50', border: 'border-sage-100', badge: 'bg-sage-100 text-sage-400' },
  ]

  return (
    <div className="flex flex-col h-screen max-h-screen">
      <div className="flex items-center justify-between px-4 py-3 border-b-[1.5px] border-cream-300 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-rosa-400 text-lg">←</button>
          <div>
            <h1 className="text-base font-medium text-choco-600">{project.name}</h1>
            <p className="text-xs text-choco-200">与 AI 统筹组长讨论</p>
          </div>
        </div>
        {showAuthorize && (
          <button
            onClick={() => navigate(`/authorize/${projectId}`)}
            className="hand-btn text-xs py-1.5 px-3 animate-pulse"
          >
            确认方案 →
          </button>
        )}
      </div>

      {inspirations.length > 0 && (
        <div className="px-4 py-3 bg-cream-100 border-b border-cream-300">
          <p className="text-xs text-choco-400 mb-2 font-medium">🍬 AI 找到的参考案例 <span className="text-choco-200 font-normal">· 点击查看详情</span></p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {inspirations.map((item, i) => {
              const c = inspoColors[i % inspoColors.length]
              return (
                <div
                  key={i}
                  onClick={() => setSelectedInspo(item)}
                  className={`flex-shrink-0 w-44 ${c.bg} border ${c.border} rounded-2xl p-3 text-xs cursor-pointer transition-all active:scale-95 hover:shadow-md`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${c.badge}`}>{item.type}</span>
                    <span className="font-medium truncate text-choco-500">{item.title}</span>
                  </div>
                  <p className="text-choco-200 line-clamp-2 leading-relaxed">{item.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1">
                      {item.tags?.map((tag, j) => (
                        <span key={j} className="px-1.5 py-0.5 rounded-full bg-cream-200 text-choco-300 text-[10px]">{tag}</span>
                      ))}
                    </div>
                    <span className="text-rosa-300 text-[10px]">详情 →</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {selectedInspo && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-transparent" onClick={() => setSelectedInspo(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-[430px] p-5 pb-8 fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-cream-300 rounded-full mx-auto mb-4" />
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs bg-rosa-50 text-rosa-400 border border-rosa-100">{selectedInspo.type}</span>
                <h3 className="text-lg font-medium text-choco-600">{selectedInspo.title}</h3>
              </div>
              <button onClick={() => setSelectedInspo(null)} className="text-choco-200 hover:text-choco-400 text-xl leading-none">×</button>
            </div>
            <p className="text-sm text-choco-400 leading-relaxed mb-3">{selectedInspo.description}</p>
            {selectedInspo.highlight && (
              <div className="bg-cream-100 border border-cream-300 rounded-2xl p-3 mb-4">
                <p className="text-xs text-choco-300 mb-1 font-medium">💡 AI 推荐理由</p>
                <p className="text-sm text-choco-500 leading-relaxed">{selectedInspo.highlight}</p>
              </div>
            )}
            <div className="flex gap-1.5 mb-4">
              {selectedInspo.tags?.map((tag, j) => (
                <span key={j} className="px-2.5 py-1 rounded-full bg-cream-200 text-choco-400 text-xs">{tag}</span>
              ))}
            </div>
            {selectedInspo.url && (
              <a
                href={selectedInspo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hand-btn w-full py-3 text-sm text-center block"
              >
                前往网站查看 ↗
              </a>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in-up`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-rosa-50 border border-rosa-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                🧁
              </div>
            )}
            <div className={msg.role === 'user' ? 'user-bubble' : 'ai-bubble'}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start fade-in-up">
            <div className="w-8 h-8 rounded-full bg-rosa-50 border border-rosa-100 flex items-center justify-center text-sm mr-2 flex-shrink-0">
              🧁
            </div>
            <div className="ai-bubble">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-rosa-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-lilac-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-sage-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-choco-200 ml-1">AI 正在联网搜索中...</span>
              </div>
            </div>
          </div>
        )}

        {showAuthorize && (
          <div className="flex justify-center fade-in-up">
            <div className="hand-card bg-gradient-to-r from-sage-50 to-cream-100 border-sage-200 text-center p-4 w-full">
              <p className="text-sm font-medium text-sage-500 mb-3">方案已就绪，等待你的确认</p>
              <button
                onClick={() => navigate(`/authorize/${projectId}`)}
                className="hand-btn w-full py-3 text-sm"
                style={{ background: 'linear-gradient(135deg, #A8BFA0, #8AA880)', boxShadow: '0 3px 0 #6F8F66, 0 6px 16px rgba(168,191,160,0.25)' }}
              >
                前往确认并开始拆解 →
              </button>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="px-4 py-3 bg-white border-t-[1.5px] border-cream-300">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            className="hand-input flex-1 text-sm"
            placeholder="输入你的想法..."
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
    </div>
  )
}
