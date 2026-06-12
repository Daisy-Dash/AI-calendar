import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || '登录失败，请检查邮箱和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`cakie-page cakie-login-page ${showLogin ? 'is-login-open' : ''}`}>
      <section className={`cakie-welcome-stage ${showLogin ? 'is-leaving' : ''}`}>
        <header className="text-center">
          <div className="cakie-sticker text-[10px] tracking-[0.2em] uppercase">
            AI TEAMWORK BAKERY
          </div>
          <h1 className="text-4xl font-hand font-bold text-[#4B2E24] tracking-wide mt-3">Team CAKIE</h1>
        </header>

        <div className="cakie-character-scene">
          <div className="cakie-bubble cakie-welcome-bubble">
            <p className="text-lg font-medium text-[#4B2E24] mb-2">你好呀～我是 Team CAKIE！</p>
            <p className="text-sm leading-7 text-[#7D6B5D]">
              请和我一起完善你的信息，<br />
              更好地团队合作吧！
            </p>
          </div>

          <div className="cakie-agent-area">
            {imageError ? (
              <div className="cakie-placeholder cakie-agent-placeholder animate-float">
                <span className="text-sm font-medium">AI 小蛋糕助手</span>
              </div>
            ) : (
              <img
                src="/assets/cakie/AI小蛋糕拿菜单_agent-menu.png"
                alt="Team CAKIE AI 小蛋糕助手"
                className="cakie-agent-image animate-float"
                onError={() => setImageError(true)}
              />
            )}
          </div>
        </div>

        <button
          type="button"
          className="cakie-button cakie-start-button"
          onClick={() => setShowLogin(true)}
        >
          开始
        </button>
      </section>

      {showLogin && (
        <section className="cakie-login-stage">
          <form onSubmit={handleSubmit} className="cakie-menu-card cakie-login-note space-y-4">
          <div className="text-center">
            <h2 className="cakie-ribbon text-base font-medium">进入我的蛋糕店</h2>
            <p className="text-[11px] text-[#A69485] mt-3">请出示你的 CAKIE 菜单卡</p>
          </div>

          <div className="cakie-dashed-divider" />

          <div>
            <label className="block text-sm font-medium text-[#655549] mb-2">邮箱</label>
            <input
              type="email"
              className="cakie-input text-sm"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#655549] mb-2">密码</label>
            <input
              type="password"
              className="cakie-input text-sm"
              placeholder="输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-center text-sm text-rosa-500 bg-rosa-50 py-2 px-4 rounded-2xl border border-rosa-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="cakie-button w-full py-3.5 text-base"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                登录中...
              </span>
            ) : '开始制作我的菜单'}
          </button>
          </form>

          <p className="text-center mt-5 text-sm text-[#8B7A6B]">
            还没有菜单？
            <Link to="/register" className="text-[#B37474] font-medium ml-1 hover:text-[#9E5F5F]">
              创建我的 CAKIE 账号
            </Link>
          </p>
        </section>
      )}
    </div>
  )
}
