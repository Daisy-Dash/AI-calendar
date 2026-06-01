import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isLogin && form.password !== form.confirmPassword) {
      setError('两次密码输入不一致')
      return
    }

    setLoading(true)
    try {
      if (isLogin) {
        await login(form.email, form.password)
      } else {
        await register(form.username, form.email, form.password)
      }
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-warm-100 to-warm-50">
      {/* Logo区域 */}
      <div className="mb-8 text-center">
        <div className="text-6xl mb-4 animate-float">📅</div>
        <h1 className="text-3xl font-hand text-warm-700 mb-2">AI日程协作者</h1>
        <p className="text-warm-500 text-sm">智能管理你的每一天</p>
      </div>

      {/* 表单卡片 */}
      <div className="hand-card w-full max-w-sm">
        <div className="flex mb-6 bg-warm-100 rounded-xl p-1">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              isLogin ? 'bg-white shadow-sm text-warm-700' : 'text-warm-500'
            }`}
            onClick={() => setIsLogin(true)}
          >
            登录
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              !isLogin ? 'bg-white shadow-sm text-warm-700' : 'text-warm-500'
            }`}
            onClick={() => setIsLogin(false)}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">用户名</label>
              <input
                type="text"
                className="hand-input"
                placeholder="输入用户名"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">邮箱</label>
            <input
              type="email"
              className="hand-input"
              placeholder="输入邮箱地址"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">密码</label>
            <input
              type="password"
              className="hand-input"
              placeholder="输入密码"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          {!isLogin && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">确认密码</label>
              <input
                type="password"
                className="hand-input"
                placeholder="再次输入密码"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          <button type="submit" className="hand-btn w-full" disabled={loading}>
            {loading ? '处理中...' : isLogin ? '登录' : '注册'}
          </button>
        </form>
      </div>

      <p className="mt-8 text-xs text-gray-400 text-center">
        登录即表示同意 <span className="text-warm-500">服务条款</span> 和 <span className="text-warm-500">隐私政策</span>
      </p>
    </div>
  )
}
