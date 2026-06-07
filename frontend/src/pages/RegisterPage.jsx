import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !email.trim() || !password) return
    if (password !== confirmPwd) {
      setError('两次密码不一致')
      return
    }
    if (password.length < 6) {
      setError('密码至少需要 6 个字符')
      return
    }
    setError('')
    setLoading(true)
    try {
      await register(username.trim(), email.trim(), password)
      navigate('/skills')
    } catch (err) {
      setError(err.response?.data?.detail || '注册失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 fade-in-up">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3 animate-float">🍰</div>
          <h1 className="text-3xl font-hand text-choco-600 mb-1">加入我们</h1>
          <p className="text-sm text-choco-300">创建账号，开启团队协作之旅</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="hand-card">
            <label className="block text-sm font-medium text-choco-500 mb-2">昵称</label>
            <input
              type="text"
              className="hand-input text-sm w-full"
              placeholder="你的名字或昵称"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="hand-card">
            <label className="block text-sm font-medium text-choco-500 mb-2">邮箱</label>
            <input
              type="email"
              className="hand-input text-sm w-full"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="hand-card">
            <label className="block text-sm font-medium text-choco-500 mb-2">密码</label>
            <input
              type="password"
              className="hand-input text-sm w-full"
              placeholder="至少 6 个字符"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="hand-card">
            <label className="block text-sm font-medium text-choco-500 mb-2">确认密码</label>
            <input
              type="password"
              className="hand-input text-sm w-full"
              placeholder="再次输入密码"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
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
            disabled={loading || !username.trim() || !email.trim() || !password || !confirmPwd}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                注册中...
              </span>
            ) : '注册'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-choco-300">
          已有账号？
          <Link to="/login" className="text-rosa-400 font-medium ml-1 hover:text-rosa-500">
            去登录
          </Link>
        </p>
      </div>
    </div>
  )
}
