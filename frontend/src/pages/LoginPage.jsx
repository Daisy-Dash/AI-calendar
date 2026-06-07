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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 fade-in-up">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3 animate-float">🧁</div>
          <h1 className="text-3xl font-hand text-choco-600 mb-1">AI 统筹组长</h1>
          <p className="text-sm text-choco-300">团队协作，从这里开始</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="hand-card">
            <label className="block text-sm font-medium text-choco-500 mb-2">邮箱</label>
            <input
              type="email"
              className="hand-input text-sm w-full"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className="hand-card">
            <label className="block text-sm font-medium text-choco-500 mb-2">密码</label>
            <input
              type="password"
              className="hand-input text-sm w-full"
              placeholder="输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-center text-sm text-rosa-500 bg-rosa-50 py-2 px-4 rounded-2xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="hand-btn w-full py-3.5 text-base font-medium"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                登录中...
              </span>
            ) : '登录'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-choco-300">
          还没有账号？
          <Link to="/register" className="text-rosa-400 font-medium ml-1 hover:text-rosa-500">
            注册一个
          </Link>
        </p>
      </div>
    </div>
  )
}
